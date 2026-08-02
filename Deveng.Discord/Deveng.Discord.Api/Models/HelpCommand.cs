using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("HelpCommand")]
public class HelpCommand
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string CommandName { get; set; } = string.Empty;

    [MaxLength(500)] public string? Description { get; set; }

    public bool Enabled { get; set; } = true;

    public int CooldownType { get; set; } = 0; // 0: Hiçbiri, 1: Sunucu, 2: Kullanıcı

    public int? CooldownSeconds { get; set; }

    public bool SendAsDM { get; set; } = false;

    public bool DeleteAfterUse { get; set; } = false;

    public bool DisableReply { get; set; } = false;

    public int RolePermissionType { get; set; } =
        1; // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver

    public int ChannelPermissionType { get; set; } =
        1; // 0: Bu kanallar hariç diğer tüm kanallarda izin verme, 1: Bu kanallar hariç tüm kanallara izin ver

    public bool IsEmbed { get; set; } = false; // Embed olarak gösterilsin mi?

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; } // Hex renk kodu (#FF0000)

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<HelpCommandRole> Roles { get; set; } = new List<HelpCommandRole>();
    public virtual ICollection<HelpCommandChannel> Channels { get; set; } = new List<HelpCommandChannel>();
}

[Table("HelpCommandRole")]
public class HelpCommandRole
{
    [Key] public int Id { get; set; }

    [Required] public int HelpCommandId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("HelpCommandId")] public virtual HelpCommand? HelpCommand { get; set; }
}

[Table("HelpCommandChannel")]
public class HelpCommandChannel
{
    [Key] public int Id { get; set; }

    [Required] public int HelpCommandId { get; set; }

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("HelpCommandId")] public virtual HelpCommand? HelpCommand { get; set; }
}