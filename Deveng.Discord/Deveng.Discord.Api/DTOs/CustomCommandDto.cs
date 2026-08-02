namespace Deveng.Discord.Api.DTOs;

public class CustomCommandDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public int ActionType { get; set; } // 0: Kanalda Mesaj Gönder, 1: Kanalda Yanıt Ver, 2: Rol Ver, 3: Rol Kaldır
    public string? TargetChannelId { get; set; }
    public string? Message { get; set; }
    public string? RoleId { get; set; }
    public bool Enabled { get; set; }
    public bool UseRegex { get; set; }
    public string? TriggerPattern { get; set; }
    public int CooldownSeconds { get; set; } = 2;
    public string Scope { get; set; } = "slash";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCustomCommandDto
{
    public string CommandName { get; set; } = string.Empty;
    public int ActionType { get; set; }
    public string? TargetChannelId { get; set; }
    public string? Message { get; set; }
    public string? RoleId { get; set; }
    public bool Enabled { get; set; } = true;
    public bool UseRegex { get; set; }
    public string? TriggerPattern { get; set; }
    public int CooldownSeconds { get; set; } = 2;
    public string Scope { get; set; } = "slash";
}

public class UpdateCustomCommandDto
{
    public int ActionType { get; set; }
    public string? TargetChannelId { get; set; }
    public string? Message { get; set; }
    public string? RoleId { get; set; }
    public bool? Enabled { get; set; }
    public bool UseRegex { get; set; }
    public string? TriggerPattern { get; set; }
    public int CooldownSeconds { get; set; } = 2;
    public string Scope { get; set; } = "slash";
}

public class CustomCommandQuotaDto
{
    public int Used { get; set; }
    public int Limit { get; set; }
    public int Remaining => Math.Max(0, Limit - Used);
    public bool RegexAllowed { get; set; }
    public int MinCooldownSeconds { get; set; }
}