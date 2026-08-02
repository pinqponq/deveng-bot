using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Giveaway")]
public class Giveaway
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? MessageId { get; set; }

    [Required][MaxLength(200)] public string Name { get; set; } = string.Empty;

    [Required][MaxLength(500)] public string Prize { get; set; } = string.Empty;

    public int WinnerCount { get; set; } = 1;

    [Required] public DateTime EndDate { get; set; }

    [MaxLength(50)] public string? TimeZone { get; set; } = "Europe/Istanbul";

    public bool IsActive { get; set; } = true;

    public bool IsEnded { get; set; } = false;

    public int RolePermissionType { get; set; } =
        0; // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver

    public bool IsEmbed { get; set; } = true;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<GiveawayRole> Roles { get; set; } = new List<GiveawayRole>();
    public virtual ICollection<GiveawayAllowedRole> AllowedRoles { get; set; } = new List<GiveawayAllowedRole>();
    public virtual ICollection<GiveawayParticipant> Participants { get; set; } = new List<GiveawayParticipant>();
    public virtual ICollection<GiveawayWinner> Winners { get; set; } = new List<GiveawayWinner>();
}

[Table("GiveawayRole")]
public class GiveawayRole
{
    [Key] public int Id { get; set; }

    [Required] public int GiveawayId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(5,2)")]
    public decimal WinChanceMultiplier { get; set; } = 1.00m;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("GiveawayId")] public virtual Giveaway? Giveaway { get; set; }
}

[Table("GiveawayAllowedRole")]
public class GiveawayAllowedRole
{
    [Key] public int Id { get; set; }

    [Required] public int GiveawayId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("GiveawayId")] public virtual Giveaway? Giveaway { get; set; }
}

[Table("GiveawayParticipant")]
public class GiveawayParticipant
{
    [Key] public int Id { get; set; }

    [Required] public int GiveawayId { get; set; }

    [Required][MaxLength(50)] public string UserId { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }

    [ForeignKey("GiveawayId")] public virtual Giveaway? Giveaway { get; set; }
}

[Table("GiveawayWinner")]
public class GiveawayWinner
{
    [Key] public int Id { get; set; }

    [Required] public int GiveawayId { get; set; }

    [Required][MaxLength(50)] public string UserId { get; set; } = string.Empty;

    public DateTime WonAt { get; set; }

    [ForeignKey("GiveawayId")] public virtual Giveaway? Giveaway { get; set; }
}