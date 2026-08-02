namespace Deveng.Discord.Api.DTOs;

public class AIModerationSettingDto
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string Mode { get; set; } = "log_only";
    public decimal ThresholdLog { get; set; } = 0.50m;
    public decimal ThresholdDelete { get; set; } = 0.85m;
    public decimal ThresholdTimeout { get; set; } = 0.95m;
    public string? ExcludedChannelIdsJson { get; set; }
    public int RetentionDays { get; set; } = 14;
    public decimal SampleRate { get; set; } = 1.00m;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertAIModerationSettingDto
{
    public bool Enabled { get; set; }
    public string Mode { get; set; } = "log_only";
    public decimal ThresholdLog { get; set; } = 0.50m;
    public decimal ThresholdDelete { get; set; } = 0.85m;
    public decimal ThresholdTimeout { get; set; } = 0.95m;
    public string? ExcludedChannelIdsJson { get; set; }
    public int RetentionDays { get; set; } = 14;
    public decimal SampleRate { get; set; } = 1.00m;
}

public class AIModerationPolicyDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal LogThreshold { get; set; }
    public decimal DeleteThreshold { get; set; }
    public decimal TimeoutThreshold { get; set; }
    public string Action { get; set; } = "log";
    public bool Enabled { get; set; }
}

public class UpsertAIModerationPolicyDto
{
    public string Category { get; set; } = string.Empty;
    public decimal LogThreshold { get; set; } = 0.50m;
    public decimal DeleteThreshold { get; set; } = 0.85m;
    public decimal TimeoutThreshold { get; set; } = 0.95m;
    public string Action { get; set; } = "log";
    public bool Enabled { get; set; } = true;
}

public class CreateAIModerationQueueDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string? UserIdHash { get; set; }
    public string? ContentHash { get; set; }
    public string? ContentPreviewRedacted { get; set; }
}

public class AIModerationReviewDto
{
    public long Id { get; set; }
    public long QueueId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string? LabelsJson { get; set; }
    public string? MatchedCategory { get; set; }
    public decimal? Score { get; set; }
    public string? ThresholdSnapshotJson { get; set; }
    public string Provider { get; set; } = "ollama";
    public string? ModelName { get; set; }
    public string? RecommendedAction { get; set; }
    public string? AppliedAction { get; set; }
    public string? DecisionReasonKey { get; set; }
    public string? DecisionReasonParamsJson { get; set; }
    public string? ModeratorDecision { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>Bot worker icin kuyruk satiri (GetAIModerationQueuePending).</summary>
public class AIModerationQueueItemDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string? UserIdHash { get; set; }
    public string? ContentHash { get; set; }
    public string? ContentPreviewRedacted { get; set; }
    public string Status { get; set; } = "pending";
    public int AttemptCount { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Bot worker tamamlama govdesi (CompleteAIModerationQueueWithReview).</summary>
public class CompleteAIModerationQueueWorkerDto
{
    public string QueueFinalStatus { get; set; } = "completed";
    public string? QueueErrorCode { get; set; }
    public string? LabelsJson { get; set; }
    public string? MatchedCategory { get; set; }
    public decimal? Score { get; set; }
    public string? ThresholdSnapshotJson { get; set; }
    public string Provider { get; set; } = "keyword-fallback";
    public string? ModelName { get; set; }
    public string? RecommendedAction { get; set; }
    public string? AppliedAction { get; set; }
    public string? DecisionReasonKey { get; set; }
    public string? DecisionReasonParamsJson { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
