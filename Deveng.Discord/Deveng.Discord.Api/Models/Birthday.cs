using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("BirthdaySettings")]
public class BirthdaySettings
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;


    [MaxLength(50)] public string? ChannelId { get; set; }

    [MaxLength(50)] public string? RoleId { get; set; }

    public bool IsEmbed { get; set; } = false;

    [MaxLength(2000)] public string? Message { get; set; }

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public bool Enabled { get; set; } = true;

    [Range(0, 23)] public int CheckHour { get; set; } = 0;

    // Doğum günü ekleme başarılı mesajı ayarları
    public bool CreateMessageIsEmbed { get; set; } = false;

    [MaxLength(2000)] public string? CreateMessage { get; set; }

    [MaxLength(200)] public string? CreateEmbedTitle { get; set; }

    [MaxLength(2000)] public string? CreateEmbedDescription { get; set; }

    [MaxLength(10)] public string? CreateEmbedColor { get; set; }

    [MaxLength(500)] public string? CreateEmbedThumbnail { get; set; }

    [MaxLength(500)] public string? CreateEmbedImage { get; set; }

    [MaxLength(200)] public string? CreateEmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<BirthdayUser> BirthdayUsers { get; set; } = new List<BirthdayUser>();
}

[Table("BirthdayUser")]
public class BirthdayUser
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string UserId { get; set; } = string.Empty;

    [Required] public DateTime BirthDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("GuildId")] public virtual BirthdaySettings? BirthdaySettings { get; set; }
}