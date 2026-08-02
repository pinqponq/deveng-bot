using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class Level : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public int XpPerMessage { get; set; } = 15;
    public int XpPerMessageMin { get; set; } = 5;
    public int XpPerMessageMax { get; set; } = 25;
    public bool UseRandomXp { get; set; } = true;
    public int CooldownSeconds { get; set; } = 60;
    public int BaseXpRequired { get; set; } = 100;
    public decimal XpMultiplier { get; set; } = 1.50m;
    public bool NotifyOnLevelUp { get; set; } = true;
    public string? NotificationChannelId { get; set; }
    public bool UseEmbedForNotification { get; set; } = true;
    public string? NotificationMessage { get; set; }
    public bool EnableRoleRewards { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? NotificationEmbedTitle { get; set; }
    public string? NotificationEmbedDescription { get; set; }
    public string? NotificationEmbedColor { get; set; }
    public string? NotificationEmbedThumbnail { get; set; }
    public string? NotificationEmbedImage { get; set; }
    public string? NotificationEmbedFooter { get; set; }
    public string? NotificationEmbedTitleUrl { get; set; }
    public string? NotificationEmbedAuthorName { get; set; }
    public string? NotificationEmbedAuthorIcon { get; set; }
    public string? NotificationEmbedAuthorUrl { get; set; }
    public string? NotificationEmbedFooterIcon { get; set; }
    public bool NotificationEmbedUseTimestamp { get; set; } = true;
    public string? NotificationEmbedFieldsJson { get; set; }
    public bool UseEmbedForXpGain { get; set; }
    public string? XpGainMessage { get; set; }
    public string? XpGainEmbedColor { get; set; }
}

public class UserLevel : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public long TotalXp { get; set; }
    public long CurrentXp { get; set; }
    public long XpForNextLevel { get; set; } = 100;
    public DateTime? LastMessageAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LevelIgnoredChannel : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class LevelIgnoredRole : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class LevelRoleReward : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public int Level { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public bool RemovePreviousRole { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StatisticsChannel : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CounterType { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? ChannelName { get; set; }
    public bool Enabled { get; set; } = true;
    public int PeakOnlineCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<StatisticsChannelRole> Roles { get; set; } = [];
}

public class StatisticsChannelRole
{
    public int Id { get; set; }
    public int StatisticsChannelId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public string? RoleName { get; set; }
    public int OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; }

    public StatisticsChannel StatisticsChannel { get; set; } = null!;
}

public class GuildInviteSnapshot : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public string? InviterId { get; set; }
    public int Uses { get; set; }
    public string? ChannelId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}

public class GuildInviteContribution : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string JoinedUserId { get; set; } = string.Empty;
    public string? InviterUserId { get; set; }
    public string? InviteCode { get; set; }
    public DateTime JoinedAt { get; set; }
    public string SourceType { get; set; } = string.Empty;
}

public class GuildInviteStats : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string PeriodKey { get; set; } = string.Empty;
    public int Count { get; set; }
    public DateTime? LastContributedAt { get; set; }
}

public class GuildMemberEvent : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public byte EventType { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? MetadataJson { get; set; }
}

public class GuildUserActivityDay : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateOnly ActivityDate { get; set; }
    public int MessageCount { get; set; }
    public int VoiceSeconds { get; set; }
    public int ReactionCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}
