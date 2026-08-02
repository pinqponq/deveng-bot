namespace Deveng.Discord.Api.DTOs;

public class ModerationActionLogDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Source { get; set; } = "keyword";
    public string RuleType { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionStatus { get; set; } = "recommended";
    public string? ReasonKey { get; set; }
    public string? ReasonParamsJson { get; set; }
    public string? ScoreSnapshotJson { get; set; }
    public string ActorType { get; set; } = "system";
    public string? ActorUserId { get; set; }
    public long? ReviewId { get; set; }
    public string? ErrorCode { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateModerationActionLogDto
{
    public string GuildId { get; set; } = string.Empty;
    public string Source { get; set; } = "keyword";
    public string RuleType { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionStatus { get; set; } = "recommended";
    public string? ReasonKey { get; set; }
    public string? ReasonParamsJson { get; set; }
    public string? ScoreSnapshotJson { get; set; }
    public string ActorType { get; set; } = "system";
    public string? ActorUserId { get; set; }
    public long? ReviewId { get; set; }
    public string? ErrorCode { get; set; }
}

public class ModerationUserNoticeDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? MessageId { get; set; }
    public long ActionLogId { get; set; }
    public string NoticeType { get; set; } = "dm";
    public string? NoticeTextKey { get; set; }
    public string? NoticeParamsJson { get; set; }
    public string DeliveryStatus { get; set; } = "pending";
    public string? DiscordNoticeMessageId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateModerationUserNoticeDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? UserIdHash { get; set; }
    public string? MessageId { get; set; }
    public long ActionLogId { get; set; }
    public string NoticeType { get; set; } = "dm";
    public string? NoticeTextKey { get; set; }
    public string? NoticeParamsJson { get; set; }
    public string DeliveryStatus { get; set; } = "pending";
    public string? DiscordNoticeMessageId { get; set; }
}

public class ModerationLogQueryDto
{
    public string? Source { get; set; }
    public string? UserIdHash { get; set; }
    public string? ChannelId { get; set; }
    public string? Action { get; set; }
    public string? RuleType { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Limit { get; set; } = 100;
}
