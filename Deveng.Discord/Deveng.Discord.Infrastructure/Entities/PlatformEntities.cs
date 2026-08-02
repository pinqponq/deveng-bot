using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class CustomBot : IAuditableEntity
{
    public int Id { get; set; }
    public string BotToken { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? BotName { get; set; }
    public string Status { get; set; } = "Inactive";
    public string? ErrorMessage { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string PresenceStatus { get; set; } = "online";
    public string ActivityType { get; set; } = "Playing";
    public string? ActivityText { get; set; }
    public bool PersonalizationEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastSeen { get; set; }
}

public class GuildAutomation : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string DefinitionJson { get; set; } = string.Empty;
    public bool RetryOnFailure { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CustomCommand : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public int ActionType { get; set; }
    public string? TargetChannelId { get; set; }
    public string? Message { get; set; }
    public string? RoleId { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int CooldownType { get; set; }
    public int? CooldownSeconds { get; set; }
    public bool SendDM { get; set; }
    public bool DeleteCommand { get; set; }
    public bool NoReply { get; set; }
    public bool UseRegex { get; set; }
    public string? TriggerPattern { get; set; }
    public string Scope { get; set; } = "slash";

    public ICollection<GuildCustomCommandUsage> UsageRecords { get; set; } = [];
}

public class GuildCustomCommandUsage : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public int CommandId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime LastUsedAt { get; set; }

    public CustomCommand Command { get; set; } = null!;
}

public class GuildReportJob : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? CreatedByUserId { get; set; }
    public string ReportRange { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string? SummaryJson { get; set; }
    public string? FileRef { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? EmailTo { get; set; }
    public DateTime? EmailSentAt { get; set; }
    public string? EmailStatus { get; set; }
    public string? EmailError { get; set; }
}

public class GuildReportNotify : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string? NotifyEmail { get; set; }
    public bool SendOnComplete { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class GuildAutoRoleSetting : IGuildScoped, IAuditableEntity
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int DelaySeconds { get; set; }
    public int? MinAccountAgeDays { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<GuildAutoRoleRole> Roles { get; set; } = [];
    public ICollection<GuildAutoRoleAudit> Audits { get; set; } = [];
}

public class GuildAutoRoleRole : IGuildScoped
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public GuildAutoRoleSetting Setting { get; set; } = null!;
}

public class GuildAutoRoleAudit : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserIdHash { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public DateTime CreatedAt { get; set; }

    public GuildAutoRoleSetting Setting { get; set; } = null!;
}
