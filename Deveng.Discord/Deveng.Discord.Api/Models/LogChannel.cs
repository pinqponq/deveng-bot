using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("LogChannel")]
public class LogChannel
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual LogChannelEmbedSettings? LogChannelEmbedSettings { get; set; }
    public virtual ICollection<LogChannelType> LogChannelTypes { get; set; } = new List<LogChannelType>();
}

[Table("LogChannelType")]
public class LogChannelType
{
    [Key] public int Id { get; set; }

    [Required] public int LogChannelId { get; set; }

    [Required][MaxLength(50)] public string LogType { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ChannelId { get; set; } // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)

    public bool Enabled { get; set; } = true;

    public bool IsEmbed { get; set; } = true;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("LogChannelId")] public virtual LogChannel LogChannel { get; set; } = null!;
}

[Table("LogChannelEmbedSettings")]
public class LogChannelEmbedSettings
{
    [Key] public int Id { get; set; }

    [Required] public int LogChannelId { get; set; }

    public bool IsEmbed { get; set; } = true;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("LogChannelId")] public virtual LogChannel LogChannel { get; set; } = null!;
}