namespace Deveng.Discord.Api.DTOs;

public class GuildInviteSnapshotDto
{
    public string GuildId { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public string? InviterId { get; set; }
    public int Uses { get; set; }
    public string? ChannelId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}

public class UpsertGuildInviteSnapshotDto
{
    public string InviteCode { get; set; } = string.Empty;
    public string? InviterId { get; set; }
    public int Uses { get; set; }
    public string? ChannelId { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class RecordGuildInviteContributionDto
{
    public string JoinedUserId { get; set; } = string.Empty;
    public string? InviterUserId { get; set; }
    public string? InviteCode { get; set; }
    public string SourceType { get; set; } = "unknown";
}

public class GuildInviteLeaderboardEntryDto
{
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string PeriodKey { get; set; } = string.Empty;
    public int Count { get; set; }
    public DateTime? LastContributedAt { get; set; }
}

public class GuildInviteContributionDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string JoinedUserId { get; set; } = string.Empty;
    public string? InviterUserId { get; set; }
    public string? InviteCode { get; set; }
    public DateTime JoinedAt { get; set; }
    public string SourceType { get; set; } = string.Empty;
}
