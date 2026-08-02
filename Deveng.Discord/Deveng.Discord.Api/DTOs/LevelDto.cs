namespace Deveng.Discord.Api.DTOs;

public class LevelDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int XpPerMessage { get; set; }
    public int XpPerMessageMin { get; set; }
    public int XpPerMessageMax { get; set; }
    public bool UseRandomXp { get; set; }
    public int CooldownSeconds { get; set; }
    public int BaseXpRequired { get; set; }
    public double XpMultiplier { get; set; }
    public bool NotifyOnLevelUp { get; set; }
    public string? NotificationChannelId { get; set; }
    public bool UseEmbedForNotification { get; set; }
    public string? NotificationMessage { get; set; }
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
    public string? IgnoredChannelIds { get; set; }
    public string? IgnoredRoleIds { get; set; }
    public bool EnableRoleRewards { get; set; }
    public string? RoleRewardsJson { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class UserLevelDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int Level { get; set; }
    public long TotalXp { get; set; }
    public long CurrentXp { get; set; }
    public long XpForNextLevel { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateLevelDto
{
    public bool Enabled { get; set; } = true;
    public int XpPerMessage { get; set; } = 15;
    public int XpPerMessageMin { get; set; } = 5;
    public int XpPerMessageMax { get; set; } = 25;
    public bool UseRandomXp { get; set; } = true;
    public int CooldownSeconds { get; set; } = 60;
    public int BaseXpRequired { get; set; } = 100;
    public double XpMultiplier { get; set; } = 1.5;
    public bool NotifyOnLevelUp { get; set; } = true;
    public string? NotificationChannelId { get; set; }
    public bool UseEmbedForNotification { get; set; } = true;
    public string? NotificationMessage { get; set; }
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
    public bool UseEmbedForXpGain { get; set; } = false;
    public string? XpGainMessage { get; set; }
    public string? XpGainEmbedColor { get; set; }
    public string? IgnoredChannelIds { get; set; }
    public string? IgnoredRoleIds { get; set; }
    public bool EnableRoleRewards { get; set; } = false;
    public string? RoleRewardsJson { get; set; }
}

public class UpdateLevelDto
{
    public bool? Enabled { get; set; }
    public int? XpPerMessage { get; set; }
    public int? XpPerMessageMin { get; set; }
    public int? XpPerMessageMax { get; set; }
    public bool? UseRandomXp { get; set; }
    public int? CooldownSeconds { get; set; }
    public int? BaseXpRequired { get; set; }
    public double? XpMultiplier { get; set; }
    public bool? NotifyOnLevelUp { get; set; }
    public string? NotificationChannelId { get; set; }
    public bool? UseEmbedForNotification { get; set; }
    public string? NotificationMessage { get; set; }
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
    public bool? NotificationEmbedUseTimestamp { get; set; }
    public string? NotificationEmbedFieldsJson { get; set; }
    public bool? UseEmbedForXpGain { get; set; }
    public string? XpGainMessage { get; set; }
    public string? XpGainEmbedColor { get; set; }
    public string? IgnoredChannelIds { get; set; }
    public string? IgnoredRoleIds { get; set; }
    public bool? EnableRoleRewards { get; set; }
    public string? RoleRewardsJson { get; set; }
}

public class RoleRewardDto
{
    public int Level { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public bool RemovePreviousRole { get; set; } = false;
}
