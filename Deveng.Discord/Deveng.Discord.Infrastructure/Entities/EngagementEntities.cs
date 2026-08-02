using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class Giveaway : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Prize { get; set; } = string.Empty;
    public int WinnerCount { get; set; } = 1;
    public DateTime EndDate { get; set; }
    public string? TimeZone { get; set; } = "Europe/Istanbul";
    public bool IsActive { get; set; } = true;
    public bool IsEnded { get; set; }
    public int RolePermissionType { get; set; }
    public bool IsEmbed { get; set; } = true;
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<GiveawayRole> Roles { get; set; } = [];
    public ICollection<GiveawayAllowedRole> AllowedRoles { get; set; } = [];
    public ICollection<GiveawayParticipant> Participants { get; set; } = [];
    public ICollection<GiveawayWinner> Winners { get; set; } = [];
}

public class GiveawayRole
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public decimal WinChanceMultiplier { get; set; } = 1.00m;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Giveaway Giveaway { get; set; } = null!;
}

public class GiveawayAllowedRole
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Giveaway Giveaway { get; set; } = null!;
}

public class GiveawayParticipant
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }

    public Giveaway Giveaway { get; set; } = null!;
}

public class GiveawayWinner
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime WonAt { get; set; }

    public Giveaway Giveaway { get; set; } = null!;
}

public class Poll : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string Question { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? EndedAt { get; set; }
    public int? EndAfterMinutes { get; set; }
    public int? EndAfterVotes { get; set; }
    public bool AllowMultipleVotes { get; set; }
    public int TotalVotes { get; set; }
    public string? PollEmbedTitle { get; set; }
    public string? PollEmbedDescription { get; set; }
    public string? PollEmbedColor { get; set; }
    public string? PollEmbedThumbnail { get; set; }
    public string? PollEmbedImage { get; set; }
    public string? PollEmbedFooter { get; set; }
    public string? PollEmbedTitleUrl { get; set; }
    public string? PollEmbedAuthorName { get; set; }
    public string? PollEmbedAuthorIcon { get; set; }
    public string? PollEmbedAuthorUrl { get; set; }
    public string? PollEmbedFooterIcon { get; set; }
    public bool PollEmbedUseTimestamp { get; set; } = true;
    public string? PollEmbedFieldsJson { get; set; }
    public string? ResultEmbedTitle { get; set; }
    public string? ResultEmbedDescription { get; set; }
    public string? ResultEmbedColor { get; set; }
    public string? ResultEmbedThumbnail { get; set; }
    public string? ResultEmbedImage { get; set; }
    public string? ResultEmbedFooter { get; set; }
    public string? ResultEmbedTitleUrl { get; set; }
    public string? ResultEmbedAuthorName { get; set; }
    public string? ResultEmbedAuthorIcon { get; set; }
    public string? ResultEmbedAuthorUrl { get; set; }
    public string? ResultEmbedFooterIcon { get; set; }
    public bool ResultEmbedUseTimestamp { get; set; } = true;
    public string? ResultEmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedVia { get; set; }

    public ICollection<PollOption> Options { get; set; } = [];
    public ICollection<PollVote> Votes { get; set; } = [];
    public ICollection<PollRolePermission> RolePermissions { get; set; } = [];
}

public class PollOption
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; }
    public int VoteCount { get; set; }
    public DateTime CreatedAt { get; set; }

    public Poll Poll { get; set; } = null!;
    public ICollection<PollVote> Votes { get; set; } = [];
}

public class PollVote
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public int OptionId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Poll Poll { get; set; } = null!;
    public PollOption Option { get; set; } = null!;
}

public class PollRolePermission
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public bool IsAllowed { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Poll Poll { get; set; } = null!;
}

public class TicketPanel : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string? PanelMessage { get; set; }
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
    public string? WelcomeMessage { get; set; }
    public bool IsWelcomeEmbed { get; set; }
    public string? WelcomeEmbedTitle { get; set; }
    public string? WelcomeEmbedDescription { get; set; }
    public string? WelcomeEmbedColor { get; set; }
    public string? WelcomeEmbedThumbnail { get; set; }
    public string? WelcomeEmbedImage { get; set; }
    public string? WelcomeEmbedFooter { get; set; }
    public string? WelcomeEmbedTitleUrl { get; set; }
    public string? WelcomeEmbedAuthorName { get; set; }
    public string? WelcomeEmbedAuthorIcon { get; set; }
    public string? WelcomeEmbedAuthorUrl { get; set; }
    public string? WelcomeEmbedFooterIcon { get; set; }
    public bool WelcomeEmbedUseTimestamp { get; set; } = true;
    public string? WelcomeEmbedFieldsJson { get; set; }
    public string? TranscriptChannelId { get; set; }
    public bool SendTranscriptToUser { get; set; } = true;
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<TicketPanelRole> Roles { get; set; } = [];
    public ICollection<TicketType> TicketTypes { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
}

public class TicketPanelRole
{
    public int Id { get; set; }
    public int TicketPanelId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public TicketPanel TicketPanel { get; set; } = null!;
}

public class TicketType
{
    public int Id { get; set; }
    public int TicketPanelId { get; set; }
    public int Type { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int Style { get; set; } = 1;
    public string? Placeholder { get; set; }
    public int OrderIndex { get; set; }
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public TicketPanel TicketPanel { get; set; } = null!;
    public ICollection<Ticket> Tickets { get; set; } = [];
}

public class Ticket : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public int TicketPanelId { get; set; }
    public int? TicketTypeId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int Status { get; set; }
    public string? ClaimedBy { get; set; }
    public DateTime? ClaimedAt { get; set; }
    public string? ClosedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int? TranscriptId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public string? LastMessageAuthorId { get; set; }

    public TicketPanel TicketPanel { get; set; } = null!;
    public TicketType? TicketType { get; set; }
    public TicketTranscript? Transcript { get; set; }
    public ICollection<TicketStaffRead> StaffReads { get; set; } = [];
}

public class TicketTranscript : IGuildScoped
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string? TranscriptUrl { get; set; }
    public string? TranscriptContent { get; set; }
    public DateTime CreatedAt { get; set; }

    public Ticket Ticket { get; set; } = null!;
}

public class TicketStaffRead
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string StaffUserId { get; set; } = string.Empty;
    public DateTime LastReadAt { get; set; }

    public Ticket Ticket { get; set; } = null!;
}

public class ReactionRole : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? NormalMessage { get; set; }
    public bool IsEmbed { get; set; } = true;
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
    public string? MessageId { get; set; }
    public bool EnableEmoji { get; set; } = true;
    public bool EnableButton { get; set; } = true;
    public bool EnableMenu { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool Enabled { get; set; } = true;

    public ICollection<ReactionRoleEmoji> Emojis { get; set; } = [];
    public ICollection<ReactionRoleButton> Buttons { get; set; } = [];
    public ICollection<ReactionRoleMenu> Menus { get; set; } = [];
}

public class ReactionRoleEmoji
{
    public int Id { get; set; }
    public int ReactionRoleId { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ReactionRole ReactionRole { get; set; } = null!;
}

public class ReactionRoleButton
{
    public int Id { get; set; }
    public int ReactionRoleId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int Style { get; set; } = 1;
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ReactionRole ReactionRole { get; set; } = null!;
}

public class ReactionRoleMenu
{
    public int Id { get; set; }
    public int ReactionRoleId { get; set; }
    public string? Placeholder { get; set; }
    public int MinValues { get; set; } = 1;
    public int MaxValues { get; set; } = 1;
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ReactionRole ReactionRole { get; set; } = null!;
    public ICollection<ReactionRoleMenuOption> Options { get; set; } = [];
}

public class ReactionRoleMenuOption
{
    public int Id { get; set; }
    public int MenuId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ReactionRoleMenu Menu { get; set; } = null!;
}

public class Reminder : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime RemindDate { get; set; }
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
    public bool IsSent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ReminderSettings : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
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
    public bool DefaultIsEmbed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool SendMessageIsEmbed { get; set; }
    public string? SendMessage { get; set; }
    public string? SendEmbedTitle { get; set; }
    public string? SendEmbedDescription { get; set; }
    public string? SendEmbedColor { get; set; }
    public string? SendEmbedThumbnail { get; set; }
    public string? SendEmbedImage { get; set; }
    public string? SendEmbedFooter { get; set; }
    public string? SendEmbedTitleUrl { get; set; }
    public string? SendEmbedAuthorName { get; set; }
    public string? SendEmbedAuthorIcon { get; set; }
    public string? SendEmbedAuthorUrl { get; set; }
    public string? SendEmbedFooterIcon { get; set; }
    public bool SendEmbedUseTimestamp { get; set; } = true;
    public string? SendEmbedFieldsJson { get; set; }

    public ICollection<ReminderEmbedSetting> EmbedSettings { get; set; } = [];
}

public class ReminderEmbedSetting
{
    public int Id { get; set; }
    public int ReminderSettingsId { get; set; }
    public string Slot { get; set; } = string.Empty;
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
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ReminderSettings ReminderSettings { get; set; } = null!;
}

public class ApplicationForm : IGuildScoped, IAuditableEntity
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Enabled { get; set; } = true;
    public int Version { get; set; } = 1;
    public string FieldsJson { get; set; } = string.Empty;
    public string? SubmitChannelId { get; set; }
    public string? ReviewChannelId { get; set; }
    public string? ApprovalRoleId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ApplicationResponse> Responses { get; set; } = [];
}

public class ApplicationResponse : IGuildScoped
{
    public long Id { get; set; }
    public long FormId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int FormVersion { get; set; }
    public string AnswersJson { get; set; } = string.Empty;
    public string Status { get; set; } = "submitted";
    public string? AssigneeUserId { get; set; }
    public string? ReviewerNotes { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }

    public ApplicationForm Form { get; set; } = null!;
    public ICollection<ApplicationAudit> Audits { get; set; } = [];
}

public class ApplicationAudit : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public long ResponseId { get; set; }
    public string? ActorUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public DateTime CreatedAt { get; set; }

    public ApplicationResponse Response { get; set; } = null!;
}
