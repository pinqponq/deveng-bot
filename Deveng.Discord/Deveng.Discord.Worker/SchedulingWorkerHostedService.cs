using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Scheduling.Contracts;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Deveng.Discord.Worker;

/// <summary>
/// DB sweep → RabbitMQ publish (tek kanal) veya doğrudan Bot HTTP;
/// tüketici: bounded retry + DLQ (sonsuz requeue yok).
/// </summary>
public sealed class SchedulingWorkerHostedService(
    IServiceScopeFactory scopeFactory,
    BotDispatchClient bot,
    IConfiguration configuration,
    ILogger<SchedulingWorkerHostedService> logger,
    SchedulingWorkerMetrics metrics) : BackgroundService
{
    private const string RetryHeaderKey = "x-sched-retry";

    private IConnection? _connection;
    private IChannel? _consumerChannel;
    private IChannel? _publishChannel;
    private readonly SemaphoreSlim _publishGate = new(1, 1);

    private string _workQueueName = SchedulingQueues.DefaultWork;
    private string _retryQueueName = SchedulingQueues.RetryQueueName(SchedulingQueues.DefaultWork);
    private string _dlqName = SchedulingQueues.DefaultDeadLetter;
    private int _maxRetries = 5;
    private int _retryDelayMs = 10_000;
    private ushort _prefetchCount = 20;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _workQueueName = (configuration["Worker:SchedulingQueue"] ?? SchedulingQueues.DefaultWork).Trim();
        _retryQueueName = SchedulingQueues.RetryQueueName(_workQueueName);
        _dlqName = (configuration["Worker:SchedulingDlq"] ?? SchedulingQueues.DefaultDeadLetter).Trim();
        _maxRetries = Math.Clamp(configuration.GetValue("Worker:SchedulingMaxRetries", 5), 0, 20);
        _retryDelayMs = Math.Clamp(configuration.GetValue("Worker:SchedulingRetryDelayMs", 10_000), 1_000, 600_000);
        _prefetchCount = (ushort)Math.Clamp(configuration.GetValue("Worker:SchedulingPrefetch", 20), 1, 500);

        var rmqUri = Environment.GetEnvironmentVariable("RABBITMQ_URI")?.Trim();
        if (!string.IsNullOrEmpty(rmqUri))
        {
            try
            {
                await StartRabbitAsync(rmqUri, stoppingToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "RabbitMQ başlatılamadı — doğrudan Bot HTTP sweep devam edecek.");
            }
        }

        var reminderSweep = TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Worker:ReminderSweepSeconds", 30), 5, 600));
        var pollSweep = TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Worker:PollSweepSeconds", 120), 30, 3600));
        var statsSweep = TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Worker:StatsSweepSeconds", 600), 60, 86400));

        await Task.WhenAll(
            LoopAsync("ReminderSweep", reminderSweep, RunReminderSweepAsync, stoppingToken),
            LoopAsync("PollSweep", pollSweep, RunPollSweepAsync, stoppingToken),
            LoopAsync("StatsSweep", statsSweep, RunStatsSweepAsync, stoppingToken)).ConfigureAwait(false);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _publishGate.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                if (_publishChannel is IAsyncDisposable pcd)
                    await pcd.DisposeAsync().ConfigureAwait(false);
                else
                    _publishChannel?.Dispose();

                _publishChannel = null;
            }
            finally
            {
                _publishGate.Release();
            }

            if (_consumerChannel is IAsyncDisposable cad)
                await cad.DisposeAsync().ConfigureAwait(false);
            else
                _consumerChannel?.Dispose();

            _consumerChannel = null;

            if (_connection is IAsyncDisposable connAd)
                await connAd.DisposeAsync().ConfigureAwait(false);
            else
                _connection?.Dispose();

            _connection = null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "RabbitMQ kapatılırken uyarı.");
        }
        finally
        {
            _publishGate.Dispose();
        }

        await base.StopAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task StartRabbitAsync(string uri, CancellationToken ct)
    {
        var factory = new ConnectionFactory { Uri = new Uri(uri) };
        _connection = await factory.CreateConnectionAsync(cancellationToken: ct).ConfigureAwait(false);
        _consumerChannel = await _connection.CreateChannelAsync(cancellationToken: ct).ConfigureAwait(false);
        _publishChannel = await _connection.CreateChannelAsync(cancellationToken: ct).ConfigureAwait(false);

        await _publishChannel.ExchangeDeclareAsync(
            SchedulingExchanges.Commands,
            ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            passive: false,
            arguments: null,
            cancellationToken: ct).ConfigureAwait(false);

        await _consumerChannel.ExchangeDeclareAsync(
            SchedulingExchanges.DeadLetter,
            ExchangeType.Fanout,
            durable: true,
            autoDelete: false,
            passive: false,
            arguments: null,
            cancellationToken: ct).ConfigureAwait(false);

        await _consumerChannel.QueueDeclareAsync(
            _dlqName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: ct).ConfigureAwait(false);

        await _consumerChannel.QueueBindAsync(_dlqName, SchedulingExchanges.DeadLetter, routingKey: string.Empty,
            cancellationToken: ct).ConfigureAwait(false);

        var retryArgs = new Dictionary<string, object?>
        {
            ["x-dead-letter-exchange"] = string.Empty,
            ["x-dead-letter-routing-key"] = _workQueueName,
            ["x-message-ttl"] = _retryDelayMs
        };

        await _consumerChannel.QueueDeclareAsync(
            _retryQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: retryArgs,
            cancellationToken: ct).ConfigureAwait(false);

        var workArgs = new Dictionary<string, object?>
        {
            ["x-dead-letter-exchange"] = SchedulingExchanges.DeadLetter
        };

        await _consumerChannel.QueueDeclareAsync(
            _workQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: workArgs,
            cancellationToken: ct).ConfigureAwait(false);

        foreach (var key in new[]
                 {
                     SchedulingRoutingKeys.ReminderDispatchRequested,
                     SchedulingRoutingKeys.PollExpireScanRequested,
                     SchedulingRoutingKeys.StatsRefreshScanRequested
                 })
        {
            await _consumerChannel.QueueBindAsync(_workQueueName, SchedulingExchanges.Commands, key,
                cancellationToken: ct).ConfigureAwait(false);
        }

        await _consumerChannel.BasicQosAsync(prefetchSize: 0, prefetchCount: _prefetchCount, global: false,
            cancellationToken: ct).ConfigureAwait(false);

        var consumer = new AsyncEventingBasicConsumer(_consumerChannel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            try
            {
                var json = Encoding.UTF8.GetString(ea.Body.Span);
                SchedulingEnvelope? env;
                try
                {
                    env = JsonSerializer.Deserialize<SchedulingEnvelope>(json);
                }
                catch (JsonException jex)
                {
                    logger.LogError(jex, "Geçersiz JSON — DLQ");
                    metrics.RecordDeadLetter("json_parse");
                    await _consumerChannel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false,
                            cancellationToken: ct)
                        .ConfigureAwait(false);
                    return;
                }

                if (env?.Type is null)
                {
                    metrics.RecordDeadLetter("empty_envelope");
                    await _consumerChannel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false,
                            cancellationToken: ct)
                        .ConfigureAwait(false);
                    return;
                }

                var retryCount = GetRetryCount(ea.BasicProperties?.Headers);

                try
                {
                    var dispatched = await DispatchEnvelopeToBotAsync(env, ct).ConfigureAwait(false);
                    if (dispatched)
                        metrics.RecordProcessed(env.Type);
                    await _consumerChannel.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: ct)
                        .ConfigureAwait(false);
                }
                catch (Exception ex) when (!ct.IsCancellationRequested)
                {
                    logger.LogWarning(ex,
                        "Bot dispatch hatası (retry={Retry}, max={Max}, messageId={MessageId})",
                        retryCount, _maxRetries, env.MessageId);

                    if (retryCount < _maxRetries)
                    {
                        await PublishRetryAsync(ea, retryCount + 1, ct).ConfigureAwait(false);
                        metrics.RecordRetryScheduled();
                        await _consumerChannel.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: ct)
                            .ConfigureAwait(false);
                    }
                    else
                    {
                        metrics.RecordDeadLetter("max_retries");
                        logger.LogError(ex, "DLQ — max retry aşıldı (messageId={MessageId})", env.MessageId);
                        await _consumerChannel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false,
                                cancellationToken: ct)
                            .ConfigureAwait(false);
                    }
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                // kapanış
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Consumer iç hatası — DLQ");
                metrics.RecordDeadLetter("consumer_fatal");
                try
                {
                    await _consumerChannel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false,
                            cancellationToken: CancellationToken.None)
                        .ConfigureAwait(false);
                }
                catch (Exception nackEx)
                {
                    logger.LogWarning(nackEx, "NACK başarısız");
                }
            }
        };

        await _consumerChannel.BasicConsumeAsync(_workQueueName, autoAck: false, consumer: consumer,
            cancellationToken: ct).ConfigureAwait(false);
        logger.LogInformation(
            "RabbitMQ consumer hazır (work={Work}, retry={Retry}, dlq={Dlq}, prefetch={Prefetch}, maxRetries={MaxRetries})",
            _workQueueName, _retryQueueName, _dlqName, _prefetchCount, _maxRetries);
    }

    private static int GetRetryCount(IDictionary<string, object?>? headers)
    {
        if (headers is null || !headers.TryGetValue(RetryHeaderKey, out var v) || v is null)
            return 0;
        return Convert.ToInt32(v switch
        {
            byte[] bytes => Encoding.UTF8.GetString(bytes),
            _ => v.ToString() ?? "0"
        });
    }

    private async Task PublishRetryAsync(BasicDeliverEventArgs ea, int newRetryCount, CancellationToken ct)
    {
        if (_publishChannel is null)
            throw new InvalidOperationException("Publish kanalı yok.");

        var headers = CloneHeaders(ea.BasicProperties?.Headers);
        headers[RetryHeaderKey] = newRetryCount;

        var props = new BasicProperties
        {
            Persistent = true,
            Headers = headers
        };

        await _publishGate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await _publishChannel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: _retryQueueName,
                    mandatory: false,
                    basicProperties: props,
                    body: ea.Body,
                    cancellationToken: ct)
                .ConfigureAwait(false);
        }
        finally
        {
            _publishGate.Release();
        }

        logger.LogInformation("Retry kuyruğuna alındı (attempt={Attempt}, delayMs={DelayMs})", newRetryCount,
            _retryDelayMs);
    }

    private static Dictionary<string, object?> CloneHeaders(IDictionary<string, object?>? src)
    {
        var d = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (src is null)
            return d;
        foreach (var kv in src)
            d[kv.Key] = kv.Value;
        return d;
    }

    private async Task<bool> DispatchEnvelopeToBotAsync(SchedulingEnvelope env, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            switch (env.Type)
            {
                case SchedulingEnvelope.TypeReminderDispatch when env.ReminderId is > 0:
                {
                    var payload = new
                    {
                        reminderId = env.ReminderId.Value,
                        correlationId = env.CorrelationId,
                        messageId = env.MessageId,
                        dedupeKey = env.DedupeKey
                    };
                    await bot.PostSignedAsync("/api/bot/dispatch-reminder",
                        JsonSerializer.Serialize(payload), ct,
                        env.CorrelationId, env.MessageId).ConfigureAwait(false);
                    return true;
                }
                case SchedulingEnvelope.TypePollExpireScan:
                    await bot.PostSignedAsync("/api/bot/run-expired-poll-scan", "{}", ct,
                        env.CorrelationId, env.MessageId).ConfigureAwait(false);
                    return true;
                case SchedulingEnvelope.TypeStatsRefreshScan:
                    await bot.PostSignedAsync("/api/bot/run-statistics-refresh-scan", "{}", ct,
                        env.CorrelationId, env.MessageId).ConfigureAwait(false);
                    return true;
                default:
                    logger.LogWarning("İşlenmeyen envelope tipi: {Type}", env.Type);
                    return false;
            }
        }
        finally
        {
            sw.Stop();
            metrics.RecordBotDispatchSeconds(sw.Elapsed.TotalSeconds, env.Type);
        }
    }

    private async Task LoopAsync(string name, TimeSpan period, Func<CancellationToken, Task> body,
        CancellationToken stoppingToken)
    {
        logger.LogInformation("{Loop} döngüsü başladı (period={Period}s)", name, period.TotalSeconds);
        using var timer = new PeriodicTimer(period);
        try
        {
            while (!stoppingToken.IsCancellationRequested &&
                   await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
            {
                try
                {
                    await body(stoppingToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "{Loop} iterasyon hatası", name);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // normal shutdown
        }
    }

    private async Task RunReminderSweepAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DevengDbContext>();

        var batch = Math.Clamp(configuration.GetValue("Worker:ReminderBatchSize", 50), 1, 500);
        var now = DateTime.UtcNow;
        var ids = await db.Reminders.AsNoTracking()
            .Where(r => !r.IsSent && r.RemindDate <= now)
            .OrderBy(r => r.RemindDate)
            .Take(batch)
            .Select(r => r.Id)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        if (ids.Count == 0)
            return;

        var useQueue = _publishChannel != null &&
                       !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RABBITMQ_URI")?.Trim());

        var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;

        foreach (var id in ids)
        {
            var messageId = Guid.NewGuid().ToString("N");
            var envelope = new SchedulingEnvelope
            {
                Type = SchedulingEnvelope.TypeReminderDispatch,
                ReminderId = id,
                CorrelationId = messageId,
                MessageId = messageId,
                DedupeKey = $"reminder:{id}:{minuteBucket}"
            };
            var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope));

            if (useQueue)
                await PublishCommandsExchangeAsync(bytes, SchedulingRoutingKeys.ReminderDispatchRequested, ct)
                    .ConfigureAwait(false);
            else
            {
                await bot.PostSignedAsync("/api/bot/dispatch-reminder",
                    JsonSerializer.Serialize(new
                    {
                        reminderId = id,
                        correlationId = envelope.CorrelationId,
                        messageId = envelope.MessageId,
                        dedupeKey = envelope.DedupeKey
                    }), ct, envelope.CorrelationId, envelope.MessageId).ConfigureAwait(false);
            }
        }
    }

    private Task RunPollSweepAsync(CancellationToken ct)
    {
        var mid = Guid.NewGuid().ToString("N");
        var env = new SchedulingEnvelope
        {
            Type = SchedulingEnvelope.TypePollExpireScan,
            CorrelationId = mid,
            MessageId = mid
        };
        return DispatchScanAsync(env, SchedulingRoutingKeys.PollExpireScanRequested,
            "/api/bot/run-expired-poll-scan", ct);
    }

    private Task RunStatsSweepAsync(CancellationToken ct)
    {
        var mid = Guid.NewGuid().ToString("N");
        var env = new SchedulingEnvelope
        {
            Type = SchedulingEnvelope.TypeStatsRefreshScan,
            CorrelationId = mid,
            MessageId = mid
        };
        return DispatchScanAsync(env, SchedulingRoutingKeys.StatsRefreshScanRequested,
            "/api/bot/run-statistics-refresh-scan", ct);
    }

    private async Task DispatchScanAsync(SchedulingEnvelope envelope, string routingKey, string botPath,
        CancellationToken ct)
    {
        var useQueue = _publishChannel != null &&
                       !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RABBITMQ_URI")?.Trim());
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope));

        if (useQueue)
            await PublishCommandsExchangeAsync(bytes, routingKey, ct).ConfigureAwait(false);
        else
            await bot.PostSignedAsync(botPath, "{}", ct, envelope.CorrelationId, envelope.MessageId)
                .ConfigureAwait(false);
    }

    private async Task PublishCommandsExchangeAsync(byte[] bytes, string routingKey, CancellationToken ct)
    {
        if (_publishChannel is null)
            throw new InvalidOperationException("Publish kanalı yok.");

        await _publishGate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await _publishChannel.BasicPublishAsync(
                    SchedulingExchanges.Commands,
                    routingKey,
                    mandatory: false,
                    basicProperties: new BasicProperties { Persistent = true },
                    body: bytes,
                    cancellationToken: ct)
                .ConfigureAwait(false);
        }
        finally
        {
            _publishGate.Release();
        }
    }
}
