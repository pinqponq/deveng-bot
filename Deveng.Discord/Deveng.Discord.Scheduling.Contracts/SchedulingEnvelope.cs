using System.Text.Json.Serialization;

namespace Deveng.Discord.Scheduling.Contracts;

/// <summary>RabbitMQ gövdesinde taşınan tek tip mesaj zarfı.</summary>
public sealed class SchedulingEnvelope
{
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    [JsonPropertyName("reminderId")]
    public int? ReminderId { get; init; }

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; init; }

    /// <summary>Gözlem / log kökü (her mesajda tercihen dolu).</summary>
    [JsonPropertyName("messageId")]
    public string? MessageId { get; init; }

    /// <summary>Bot tarafında Redis SET NX ile çift teslim önleme (örn. reminder:42:29301840).</summary>
    [JsonPropertyName("dedupeKey")]
    public string? DedupeKey { get; init; }

    public const string TypeReminderDispatch = "reminder.dispatch";
    public const string TypePollExpireScan = "poll.expire.scan";
    public const string TypeStatsRefreshScan = "stats.refresh.scan";
}
