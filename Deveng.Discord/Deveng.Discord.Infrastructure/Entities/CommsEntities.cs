using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class Welcome : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public bool SendWelcomeCard { get; set; }
    public string? CardTitle { get; set; }
    public string? CardUsernameText { get; set; }
    public string? CardMemberText { get; set; }
    public string? CardBackgroundColor1 { get; set; }
    public string? CardBackgroundColor2 { get; set; }
    public string? CardTextColor { get; set; }
    public string? CardBorderColor { get; set; }
    public bool SendDM { get; set; }
    public string? DMMessage { get; set; }
    public bool IsDMEmbed { get; set; }
    public string? DMEmbedTitle { get; set; }
    public string? DMEmbedColor { get; set; }
    public string? DMEmbedThumbnail { get; set; }
    public string? DMEmbedImage { get; set; }
    public string? DMEmbedFooter { get; set; }
    public string? DMEmbedTitleUrl { get; set; }
    public string? DMEmbedAuthorName { get; set; }
    public string? DMEmbedAuthorIcon { get; set; }
    public string? DMEmbedAuthorUrl { get; set; }
    public string? DMEmbedFooterIcon { get; set; }
    public bool DMEmbedUseTimestamp { get; set; } = true;
    public string? DMEmbedFieldsJson { get; set; }
    public bool SendDMCard { get; set; }
    public string? DMCardTitle { get; set; }
    public string? DMCardUsernameText { get; set; }
    public string? DMCardMemberText { get; set; }
    public string? DMCardBackgroundColor1 { get; set; }
    public string? DMCardBackgroundColor2 { get; set; }
    public string? DMCardTextColor { get; set; }
    public string? DMCardBorderColor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool GiveRole { get; set; }
    public string? RoleId { get; set; }

    public WelcomeEmbedSettings? EmbedSettings { get; set; }
    public WelcomeCardSettings? CardSettings { get; set; }
    public WelcomeDMSettings? DMSettings { get; set; }
    public WelcomeDMEmbedSettings? DMEmbedSettings { get; set; }
    public WelcomeDMCardSettings? DMCardSettings { get; set; }
}

public class WelcomeEmbedSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int WelcomeId { get; set; }
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? EmbedDescription { get; set; }

    public Welcome Welcome { get; set; } = null!;
}

public class WelcomeCardSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int WelcomeId { get; set; }
    public bool SendWelcomeCard { get; set; }
    public string? CardTitle { get; set; }
    public string? CardUsernameText { get; set; }
    public string? CardMemberText { get; set; }
    public string? CardBackgroundColor1 { get; set; }
    public string? CardBackgroundColor2 { get; set; }
    public string? CardTextColor { get; set; }
    public string? CardBorderColor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Welcome Welcome { get; set; } = null!;
}

public class WelcomeDMSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int WelcomeId { get; set; }
    public bool SendDM { get; set; }
    public string? DMMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Welcome Welcome { get; set; } = null!;
}

public class WelcomeDMEmbedSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int WelcomeId { get; set; }
    public bool IsDMEmbed { get; set; }
    public string? DMEmbedTitle { get; set; }
    public string? DMEmbedColor { get; set; }
    public string? DMEmbedThumbnail { get; set; }
    public string? DMEmbedImage { get; set; }
    public string? DMEmbedFooter { get; set; }
    public string? DMEmbedTitleUrl { get; set; }
    public string? DMEmbedAuthorName { get; set; }
    public string? DMEmbedAuthorIcon { get; set; }
    public string? DMEmbedAuthorUrl { get; set; }
    public string? DMEmbedFooterIcon { get; set; }
    public bool DMEmbedUseTimestamp { get; set; } = true;
    public string? DMEmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? DMEmbedDescription { get; set; }

    public Welcome Welcome { get; set; } = null!;
}

public class WelcomeDMCardSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int WelcomeId { get; set; }
    public bool SendDMCard { get; set; }
    public string? DMCardTitle { get; set; }
    public string? DMCardUsernameText { get; set; }
    public string? DMCardMemberText { get; set; }
    public string? DMCardBackgroundColor1 { get; set; }
    public string? DMCardBackgroundColor2 { get; set; }
    public string? DMCardTextColor { get; set; }
    public string? DMCardBorderColor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Welcome Welcome { get; set; } = null!;
}

public class Goodbye : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public GoodbyeEmbedSettings? EmbedSettings { get; set; }
}

public class GoodbyeEmbedSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int GoodbyeId { get; set; }
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Goodbye Goodbye { get; set; } = null!;
}

public class LogChannel : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public LogChannelEmbedSettings? EmbedSettings { get; set; }
    public ICollection<LogChannelType> LogTypes { get; set; } = [];
}

public class LogChannelEmbedSettings : IAuditableEntity
{
    public int Id { get; set; }
    public int LogChannelId { get; set; }
    public bool IsEmbed { get; set; } = true;
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? EmbedDescription { get; set; }

    public LogChannel LogChannel { get; set; } = null!;
}

public class LogChannelType : IAuditableEntity
{
    public int Id { get; set; }
    public int LogChannelId { get; set; }
    public string LogType { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ChannelId { get; set; }
    public bool IsEmbed { get; set; } = true;
    public string? EmbedTitle { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public string? EmbedDescription { get; set; }

    public LogChannel LogChannel { get; set; } = null!;
}

public class HelpCommand : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CooldownType { get; set; }
    public int? CooldownSeconds { get; set; }
    public bool SendAsDM { get; set; }
    public bool DeleteAfterUse { get; set; }
    public bool DisableReply { get; set; }
    public int RolePermissionType { get; set; } = 1;
    public int ChannelPermissionType { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? Message { get; set; }
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }

    public ICollection<HelpCommandRole> Roles { get; set; } = [];
    public ICollection<HelpCommandChannel> Channels { get; set; } = [];
}

public class HelpCommandRole
{
    public int Id { get; set; }
    public int HelpCommandId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public HelpCommand HelpCommand { get; set; } = null!;
}

public class HelpCommandChannel
{
    public int Id { get; set; }
    public int HelpCommandId { get; set; }
    public string ChannelId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public HelpCommand HelpCommand { get; set; } = null!;
}

public class BirthdaySettings : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? RoleId { get; set; }
    public bool IsEmbed { get; set; }
    public string? Message { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public int CheckHour { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool CreateMessageIsEmbed { get; set; }
    public string? CreateMessage { get; set; }
    public string? CreateEmbedTitle { get; set; }
    public string? CreateEmbedDescription { get; set; }
    public string? CreateEmbedColor { get; set; }
    public string? CreateEmbedThumbnail { get; set; }
    public string? CreateEmbedImage { get; set; }
    public string? CreateEmbedFooter { get; set; }
    public string? CreateEmbedTitleUrl { get; set; }
    public string? CreateEmbedAuthorName { get; set; }
    public string? CreateEmbedAuthorIcon { get; set; }
    public string? CreateEmbedAuthorUrl { get; set; }
    public string? CreateEmbedFooterIcon { get; set; }
    public bool CreateEmbedUseTimestamp { get; set; } = true;
    public string? CreateEmbedFieldsJson { get; set; }
}

public class BirthdayUser : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool Enabled { get; set; } = true;
    public int? LastCelebratedYear { get; set; }
}

public class EmbedMessage : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsEmbed { get; set; } = true;
    public string? Message { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FeedSubscription : IGuildScoped, IAuditableEntity
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ExternalId { get; set; }
    public string TargetChannelId { get; set; } = string.Empty;
    public string? MentionRoleId { get; set; }
    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 900;
    public string? LastEtag { get; set; }
    public string? LastModified { get; set; }
    public string? LastItemId { get; set; }
    public int ErrorCount { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastErrorAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<FeedItemDelivery> Deliveries { get; set; } = [];
}

public class FeedItemDelivery
{
    public long SubscriptionId { get; set; }
    public string ItemId { get; set; } = string.Empty;
    public string? ItemHash { get; set; }
    public DateTime DeliveredAt { get; set; }
    public string? MessageId { get; set; }

    public FeedSubscription Subscription { get; set; } = null!;
}

public class ScheduledAnnouncement : IGuildScoped, IAuditableEntity
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? EmbedJson { get; set; }
    public string MentionPolicy { get; set; } = "none";
    public string Timezone { get; set; } = "Europe/Istanbul";
    public string ScheduleType { get; set; } = string.Empty;
    public DateTime? SendAtUtc { get; set; }
    public string? RRuleJson { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public DateTime? LastRunAtUtc { get; set; }
    public bool Paused { get; set; }
    public bool Enabled { get; set; } = true;
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ScheduledAnnouncementRun> Runs { get; set; } = [];
}

public class ScheduledAnnouncementRun
{
    public long Id { get; set; }
    public long AnnouncementId { get; set; }
    public DateTime PlannedRunAtUtc { get; set; }
    public string Status { get; set; } = "pending";
    public string? SentMessageId { get; set; }
    public string? ErrorCode { get; set; }
    public int AttemptCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ScheduledAnnouncement Announcement { get; set; } = null!;
}
