using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Level")]
public class Level
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;

    public int XpPerMessage { get; set; } = 15; // Her mesaj için verilecek XP
    public int XpPerMessageMin { get; set; } = 5; // Minimum XP
    public int XpPerMessageMax { get; set; } = 25; // Maksimum XP
    public bool UseRandomXp { get; set; } = true; // Rastgele XP kullan

    public int CooldownSeconds { get; set; } = 60; // Mesajlar arası cooldown (saniye)

    public int BaseXpRequired { get; set; } = 100; // İlk level için gerekli XP
    public double XpMultiplier { get; set; } = 1.5; // Her level için XP çarpanı

    public bool NotifyOnLevelUp { get; set; } = true; // Level atlandığında bildirim gönder
    public string? NotificationChannelId { get; set; } // Bildirim kanalı (null ise mesaj gönderildiği kanal)
    public bool UseEmbedForNotification { get; set; } = true; // Embed kullan
    public string? NotificationMessage { get; set; } // Özel bildirim mesajı
    public string? NotificationEmbedTitle { get; set; }
    public string? NotificationEmbedDescription { get; set; }
    public string? NotificationEmbedColor { get; set; }
    public string? NotificationEmbedThumbnail { get; set; }
    public string? NotificationEmbedImage { get; set; }
    public string? NotificationEmbedFooter { get; set; }

    public bool UseEmbedForXpGain { get; set; } = false;
    public string? XpGainMessage { get; set; }
    public string? XpGainEmbedColor { get; set; }

    public bool EnableRoleRewards { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

[Table("UserLevel")]
public class UserLevel
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string UserId { get; set; } = string.Empty;

    public int Level { get; set; } = 1; // Mevcut level

    public long TotalXp { get; set; } = 0; // Toplam XP

    public long CurrentXp { get; set; } = 0; // Mevcut level için XP

    public long XpForNextLevel { get; set; } = 100; // Bir sonraki level için gerekli XP

    public DateTime LastMessageAt { get; set; } // Son mesaj zamanı (cooldown için)

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
