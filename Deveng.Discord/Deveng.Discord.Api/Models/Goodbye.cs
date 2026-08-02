using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Goodbye")]
public class Goodbye
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [Required][MaxLength(500)] public string Message { get; set; } = string.Empty;

    [MaxLength(10)] public string Language { get; set; } = "tr";

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual GoodbyeEmbedSettings? GoodbyeEmbedSettings { get; set; }
}

[Table("GoodbyeEmbedSettings")]
public class GoodbyeEmbedSettings
{
    [Key] public int Id { get; set; }

    [Required] public int GoodbyeId { get; set; }

    public bool IsEmbed { get; set; }

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("GoodbyeId")] public virtual Goodbye Goodbye { get; set; } = null!;
}