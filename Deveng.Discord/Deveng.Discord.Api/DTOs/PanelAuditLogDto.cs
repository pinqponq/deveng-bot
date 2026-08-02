namespace Deveng.Discord.Api.DTOs;

public class PanelAuditLogDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ActorType { get; set; } = "user";
    public string? ActorUserId { get; set; }
    public string? ActorUsernameSnapshot { get; set; }
    public string? ActorAvatarSnapshot { get; set; }
    public string? ActorRolesSnapshotJson { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? ChangedFieldsJson { get; set; }
    public string? RequestId { get; set; }
    public string? IpHash { get; set; }
    public string? UserAgentHash { get; set; }
    public string Result { get; set; } = "success";
    public string? ErrorCode { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreatePanelAuditLogDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ActorType { get; set; } = "user";
    public string? ActorUserId { get; set; }
    public string? ActorUsernameSnapshot { get; set; }
    public string? ActorAvatarSnapshot { get; set; }
    public string? ActorRolesSnapshotJson { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public object? Before { get; set; }
    public object? After { get; set; }
    public string? ChangedFieldsJson { get; set; }
    public string? RequestId { get; set; }
    public string? IpHash { get; set; }
    public string? UserAgentHash { get; set; }
    public string Result { get; set; } = "success";
    public string? ErrorCode { get; set; }
}

public class PanelAuditLogQueryDto
{
    public string? Action { get; set; }
    public string? ResourceType { get; set; }
    public string? ActorUserId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Limit { get; set; } = 100;
}
