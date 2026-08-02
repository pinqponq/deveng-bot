namespace Deveng.Discord.Api.DTOs;

public class StatisticsChannelDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CounterType { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? ChannelName { get; set; }
    public bool Enabled { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<StatisticsChannelRoleDto> Roles { get; set; } = new();
}

public class StatisticsChannelRoleDto
{
    public int Id { get; set; }
    public int StatisticsChannelId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public string? RoleName { get; set; }
    public int OrderIndex { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class CreateStatisticsChannelDto
{
    public string GuildId { get; set; } = string.Empty;
    public string CounterType { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? ChannelName { get; set; }
    public bool Enabled { get; set; } = true;
    public List<string>? RoleIds { get; set; } // Rol sayacı için
}

public class UpdateStatisticsChannelDto
{
    public string? ChannelId { get; set; }
    public string? ChannelName { get; set; }
    public bool? Enabled { get; set; }
    public List<string>? RoleIds { get; set; } // Rol sayacı için
}

public class UpdateStatisticsChannelPeakDto
{
    public string CounterType { get; set; } = string.Empty;
    public int CurrentOnline { get; set; }
}