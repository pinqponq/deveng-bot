using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("EmbedMessage")]
public class EmbedMessage
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? MessageId { get; set; }

    [Required][MaxLength(200)] public string Name { get; set; } = string.Empty;

    public bool IsEmbed { get; set; } = true;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}