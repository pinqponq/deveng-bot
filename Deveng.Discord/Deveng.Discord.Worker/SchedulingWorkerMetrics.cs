using System.Diagnostics.Metrics;

namespace Deveng.Discord.Worker;

/// <summary>OpenTelemetry Meter — OTLP ile Api ile aynı collector'a düşebilir.</summary>
public sealed class SchedulingWorkerMetrics
{
    public const string MeterName = "Deveng.Discord.Worker";

    private readonly Counter<long> _processed;
    private readonly Counter<long> _retryPublish;
    private readonly Counter<long> _deadLetter;
    private readonly Histogram<double> _botDispatchSeconds;

    public SchedulingWorkerMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        _processed = meter.CreateCounter<long>("scheduling.messages.processed");
        _retryPublish = meter.CreateCounter<long>("scheduling.messages.retry_scheduled");
        _deadLetter = meter.CreateCounter<long>("scheduling.messages.dead_lettered");
        _botDispatchSeconds = meter.CreateHistogram<double>("scheduling.bot_dispatch.seconds");
    }

    public void RecordProcessed(string envelopeType) =>
        _processed.Add(1, new KeyValuePair<string, object?>("type", envelopeType));

    public void RecordRetryScheduled() => _retryPublish.Add(1);

    public void RecordDeadLetter(string reason) =>
        _deadLetter.Add(1, new KeyValuePair<string, object?>("reason", reason));

    public void RecordBotDispatchSeconds(double seconds, string operation) =>
        _botDispatchSeconds.Record(seconds, new KeyValuePair<string, object?>("operation", operation));
}
