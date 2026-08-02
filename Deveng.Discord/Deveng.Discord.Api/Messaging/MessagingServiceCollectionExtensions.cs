using System.Text;
using Deveng.Discord.Scheduling.Contracts;
using RabbitMQ.Client;

namespace Deveng.Discord.Api.Messaging;

public static class MessagingServiceCollectionExtensions
{
    /// <summary>
    /// RABBITMQ_URI tanımlıysa gerçek bağlantı, değilse <see cref="NullMessageBus"/>.
    /// </summary>
    public static IServiceCollection AddDevengMessaging(this IServiceCollection services)
    {
        var uri = Environment.GetEnvironmentVariable("RABBITMQ_URI")?.Trim();
        if (string.IsNullOrEmpty(uri))
        {
            services.AddSingleton<IMessageBus, NullMessageBus>();
            return services;
        }

        services.AddSingleton<IMessageBus>(_ => new RabbitMqMessageBus(uri));
        return services;
    }
}

/// <summary>
/// Tek bağlantı + yeniden kullanılan kanal; exchange ilk publish öncesi idempotent declare edilir.
/// </summary>
public sealed class RabbitMqMessageBus : IMessageBus, IAsyncDisposable
{
    private readonly ConnectionFactory _factory;
    private IConnection? _connection;
    private IChannel? _channel;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private bool _exchangeDeclared;

    public RabbitMqMessageBus(string uri)
    {
        _factory = new ConnectionFactory { Uri = new Uri(uri) };
    }

    public async Task PublishAsync(string exchange, string routingKey, ReadOnlyMemory<byte> body,
        CancellationToken cancellationToken = default)
    {
        await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            _connection ??= await _factory.CreateConnectionAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            _channel ??= await _connection.CreateChannelAsync(cancellationToken: cancellationToken).ConfigureAwait(false);

            if (!_exchangeDeclared && string.Equals(exchange, SchedulingExchanges.Commands, StringComparison.Ordinal))
            {
                await _channel.ExchangeDeclareAsync(
                    exchange: SchedulingExchanges.Commands,
                    type: ExchangeType.Topic,
                    durable: true,
                    autoDelete: false,
                    passive: false,
                    arguments: null,
                    cancellationToken: cancellationToken).ConfigureAwait(false);
                _exchangeDeclared = true;
            }

            await _channel.BasicPublishAsync(
                exchange: exchange,
                routingKey: routingKey,
                mandatory: false,
                basicProperties: new BasicProperties { Persistent = true },
                body: body,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        _mutex.Dispose();
        try
        {
            if (_channel is IAsyncDisposable chAsync)
                await chAsync.DisposeAsync().ConfigureAwait(false);
            else
                _channel?.Dispose();

            _channel = null;

            if (_connection is IAsyncDisposable connAsync)
                await connAsync.DisposeAsync().ConfigureAwait(false);
            else
                _connection?.Dispose();

            _connection = null;
        }
        catch
        {
        }
    }
}
