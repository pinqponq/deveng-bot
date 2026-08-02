namespace Deveng.Discord.Api.DTOs;

public class AutoRoleDto
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int DelaySeconds { get; set; }
    public int? MinAccountAgeDays { get; set; }
    public List<AutoRoleRoleDto> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AutoRoleRoleDto
{
    public string RoleId { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool Enabled { get; set; } = true;
}

public class UpsertAutoRoleDto
{
    public bool Enabled { get; set; }
    public int DelaySeconds { get; set; }
    public int? MinAccountAgeDays { get; set; }
    public List<AutoRoleRoleDto> Roles { get; set; } = new();
}

public class AutoRoleAuditDto
{
    public string GuildId { get; set; } = string.Empty;
    public string UserIdHash { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
}

public class AutoRoleAuditLogDto : AutoRoleAuditDto
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
}
