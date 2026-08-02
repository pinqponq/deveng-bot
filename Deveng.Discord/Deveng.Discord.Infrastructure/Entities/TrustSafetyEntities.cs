using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class Moderator : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ModeratorRule> Rules { get; set; } = [];
    public ICollection<ForbiddenWord> ForbiddenWords { get; set; } = [];
}

public class ModeratorRule
{
    public int Id { get; set; }
    public int ModeratorId { get; set; }
    public string RuleType { get; set; } = string.Empty;
    public int Action { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Moderator Moderator { get; set; } = null!;
}

public class ForbiddenWord
{
    public int Id { get; set; }
    public int ModeratorId { get; set; }
    public string Word { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Moderator Moderator { get; set; } = null!;
}

public class AIModerationSetting : IGuildScoped, IAuditableEntity
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string Mode { get; set; } = "log_only";
    public decimal ThresholdLog { get; set; } = 0.500m;
    public decimal ThresholdDelete { get; set; } = 0.850m;
    public decimal ThresholdTimeout { get; set; } = 0.950m;
    public int RetentionDays { get; set; } = 14;
    public decimal SampleRate { get; set; } = 1.000m;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<AIModerationExcludedChannel> ExcludedChannels { get; set; } = [];
    public ICollection<AIModerationPolicy> Policies { get; set; } = [];
}

public class AIModerationExcludedChannel : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public AIModerationSetting Setting { get; set; } = null!;
}

public class AIModerationPolicy : IGuildScoped
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal LogThreshold { get; set; }
    public decimal DeleteThreshold { get; set; }
    public decimal TimeoutThreshold { get; set; }
    public string Action { get; set; } = "log";
    public bool Enabled { get; set; } = true;
}

public class AIModerationQueue : IGuildScoped
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
    public DateTime? ProcessedAt { get; set; }
    public string? ErrorCode { get; set; }

    public ICollection<AIModerationReview> Reviews { get; set; } = [];
}

public class AIModerationReview : IGuildScoped
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

    public AIModerationQueue Queue { get; set; } = null!;
}

public class AIModerationCapacityUsage : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string PeriodKey { get; set; } = string.Empty;
    public int EnqueuedCount { get; set; }
    public int ProcessedCount { get; set; }
    public int FailedCount { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}

public class ModerationActionLog : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionStatus { get; set; } = string.Empty;
    public string? ReasonKey { get; set; }
    public string? ReasonParamsJson { get; set; }
    public string? ScoreSnapshotJson { get; set; }
    public string ActorType { get; set; } = "system";
    public string? ActorUserId { get; set; }
    public long? ReviewId { get; set; }
    public string? ErrorCode { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ModerationUserNotice> UserNotices { get; set; } = [];
}

public class ModerationUserNotice : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? MessageId { get; set; }
    public long ActionLogId { get; set; }
    public string NoticeType { get; set; } = string.Empty;
    public string? NoticeTextKey { get; set; }
    public string? NoticeParamsJson { get; set; }
    public string DeliveryStatus { get; set; } = string.Empty;
    public string? DiscordNoticeMessageId { get; set; }
    public DateTime CreatedAt { get; set; }

    public ModerationActionLog ActionLog { get; set; } = null!;
}
