namespace Deveng.Discord.Api.DTOs;

public class ScheduledAnnouncementDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? EmbedJson { get; set; }
    public string MentionPolicy { get; set; } = "none";
    public string Timezone { get; set; } = "Europe/Istanbul";
    public string ScheduleType { get; set; } = "once";
    public DateTime? SendAtUtc { get; set; }
    public string? RRuleJson { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public DateTime? LastRunAtUtc { get; set; }
    public bool Paused { get; set; }
    public bool Enabled { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertScheduledAnnouncementDto
{
    public long? Id { get; set; }
    public string ChannelId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? EmbedJson { get; set; }
    public string MentionPolicy { get; set; } = "none";
    public string Timezone { get; set; } = "Europe/Istanbul";
    public string ScheduleType { get; set; } = "once";
    public DateTime? SendAtUtc { get; set; }
    public string? RRuleJson { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public bool Paused { get; set; }
    public bool Enabled { get; set; } = true;
}

public class ScheduledAnnouncementRunDto
{
    public long Id { get; set; }
    public long AnnouncementId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string ChannelId { get; set; } = string.Empty;
    public DateTime PlannedRunAtUtc { get; set; }
    public string Status { get; set; } = "pending";
    public string? SentMessageId { get; set; }
    public string? ErrorCode { get; set; }
    public int AttemptCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class MarkScheduledAnnouncementRunDto
{
    public DateTime PlannedRunAtUtc { get; set; }
    public string Status { get; set; } = "sent";
    public string? SentMessageId { get; set; }
    public string? ErrorCode { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
}
