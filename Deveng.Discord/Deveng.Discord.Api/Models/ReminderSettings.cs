using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("ReminderSettings")]
public class ReminderSettings
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    public bool CreateMessageIsEmbed { get; set; } = false;
    public string? CreateMessage { get; set; }
    public string? CreateEmbedTitle { get; set; }
    public string? CreateEmbedDescription { get; set; }
    public string? CreateEmbedColor { get; set; }
    public string? CreateEmbedThumbnail { get; set; }
    public string? CreateEmbedImage { get; set; }
    public string? CreateEmbedFooter { get; set; }

    public bool DefaultIsEmbed { get; set; } = false;

    public bool SendMessageIsEmbed { get; set; } = false; // Gönderilecek mesaj embed mi?
    public string? SendMessage { get; set; } // Normal mesaj içeriği
    public string? SendEmbedTitle { get; set; } // Embed başlık
    public string? SendEmbedDescription { get; set; } // Embed açıklama
    public string? SendEmbedColor { get; set; } // Embed renk (hex)
    public string? SendEmbedThumbnail { get; set; } // Embed thumbnail
    public string? SendEmbedImage { get; set; } // Embed resim
    public string? SendEmbedFooter { get; set; } // Embed footer

    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}