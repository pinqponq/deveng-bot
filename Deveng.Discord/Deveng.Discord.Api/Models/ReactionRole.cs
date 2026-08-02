using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("ReactionRole")]
public class ReactionRole
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [MaxLength(50)] public string? ChannelId { get; set; }

    [MaxLength(500)] public string? NormalMessage { get; set; }

    public bool IsEmbed { get; set; } = true;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    [MaxLength(50)] public string? MessageId { get; set; }

    public bool Enabled { get; set; } = true;

    public bool EnableEmoji { get; set; } = true;

    public bool EnableButton { get; set; } = true;

    public bool EnableMenu { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ReactionRoleEmoji> ReactionRoleEmojis { get; set; } = new List<ReactionRoleEmoji>();
    public virtual ICollection<ReactionRoleButton> ReactionRoleButtons { get; set; } = new List<ReactionRoleButton>();
    public virtual ICollection<ReactionRoleMenu> ReactionRoleMenus { get; set; } = new List<ReactionRoleMenu>();
}

[Table("ReactionRoleEmoji")]
public class ReactionRoleEmoji
{
    [Key] public int Id { get; set; }

    [Required] public int ReactionRoleId { get; set; }

    [Required][MaxLength(100)] public string Emoji { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public int OrderIndex { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("ReactionRoleId")] public virtual ReactionRole ReactionRole { get; set; } = null!;
}

[Table("ReactionRoleButton")]
public class ReactionRoleButton
{
    [Key] public int Id { get; set; }

    [Required] public int ReactionRoleId { get; set; }

    [Required][MaxLength(80)] public string Label { get; set; } = string.Empty;

    [MaxLength(100)] public string? Emoji { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public int Style { get; set; } = 1;

    public int OrderIndex { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("ReactionRoleId")] public virtual ReactionRole ReactionRole { get; set; } = null!;
}

[Table("ReactionRoleMenu")]
public class ReactionRoleMenu
{
    [Key] public int Id { get; set; }

    [Required] public int ReactionRoleId { get; set; }

    [MaxLength(100)] public string? Placeholder { get; set; }

    public int MinValues { get; set; } = 1;

    public int MaxValues { get; set; } = 1;

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("ReactionRoleId")] public virtual ReactionRole ReactionRole { get; set; } = null!;

    public virtual ICollection<ReactionRoleMenuOption> ReactionRoleMenuOptions { get; set; } =
        new List<ReactionRoleMenuOption>();
}

[Table("ReactionRoleMenuOption")]
public class ReactionRoleMenuOption
{
    [Key] public int Id { get; set; }

    [Required] public int MenuId { get; set; }

    [Required][MaxLength(100)] public string Label { get; set; } = string.Empty;

    [MaxLength(100)] public string? Description { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    [MaxLength(100)] public string? Emoji { get; set; }

    public int OrderIndex { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("MenuId")] public virtual ReactionRoleMenu ReactionRoleMenu { get; set; } = null!;
}