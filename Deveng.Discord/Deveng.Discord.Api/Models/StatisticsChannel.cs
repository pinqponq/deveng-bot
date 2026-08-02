using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("StatisticsChannel")]
public class StatisticsChannel
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string CounterType { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(200)] public string? ChannelName { get; set; }

    public bool Enabled { get; set; } = true;

    public int PeakOnlineCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<StatisticsChannelRole> Roles { get; set; } = new List<StatisticsChannelRole>();
}

[Table("StatisticsChannelRole")]
public class StatisticsChannelRole
{
    [Key] public int Id { get; set; }

    [Required] public int StatisticsChannelId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    [MaxLength(200)] public string? RoleName { get; set; }

    public int OrderIndex { get; set; } = 0;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("StatisticsChannelId")] public virtual StatisticsChannel StatisticsChannel { get; set; } = null!;
}