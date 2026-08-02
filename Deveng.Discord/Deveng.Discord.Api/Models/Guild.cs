using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Guilds")]
public class Guild
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(200)] public string GuildName { get; set; } = string.Empty;

    [MaxLength(50)] public string? OwnerId { get; set; }

    public int MemberCount { get; set; }

    public DateTime? JoinedAt { get; set; }

    public DateTime LastSeen { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}