using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Welcome")]
public class Welcome
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [Required][MaxLength(500)] public string Message { get; set; } = string.Empty;

    [MaxLength(10)] public string Language { get; set; } = "tr";

    public bool Enabled { get; set; } = true;

    public bool GiveRole { get; set; }

    [MaxLength(50)] public string? RoleId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual WelcomeEmbedSettings? WelcomeEmbedSettings { get; set; }
    public virtual WelcomeCardSettings? WelcomeCardSettings { get; set; }
    public virtual WelcomeDMSettings? WelcomeDMSettings { get; set; }
    public virtual WelcomeDMEmbedSettings? WelcomeDMEmbedSettings { get; set; }
    public virtual WelcomeDMCardSettings? WelcomeDMCardSettings { get; set; }
}

[Table("WelcomeEmbedSettings")]
public class WelcomeEmbedSettings
{
    [Key] public int Id { get; set; }

    [Required] public int WelcomeId { get; set; }

    public bool IsEmbed { get; set; }

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("WelcomeId")] public virtual Welcome Welcome { get; set; } = null!;
}

[Table("WelcomeCardSettings")]
public class WelcomeCardSettings
{
    [Key] public int Id { get; set; }

    [Required] public int WelcomeId { get; set; }

    public bool SendWelcomeCard { get; set; }

    [MaxLength(100)] public string? CardTitle { get; set; }

    [MaxLength(200)] public string? CardUsernameText { get; set; }

    [MaxLength(200)] public string? CardMemberText { get; set; }

    [MaxLength(10)] public string? CardBackgroundColor1 { get; set; }

    [MaxLength(10)] public string? CardBackgroundColor2 { get; set; }

    [MaxLength(10)] public string? CardTextColor { get; set; }

    [MaxLength(10)] public string? CardBorderColor { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("WelcomeId")] public virtual Welcome Welcome { get; set; } = null!;
}

[Table("WelcomeDMSettings")]
public class WelcomeDMSettings
{
    [Key] public int Id { get; set; }

    [Required] public int WelcomeId { get; set; }

    public bool SendDM { get; set; }

    [MaxLength(500)] public string? DMMessage { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("WelcomeId")] public virtual Welcome Welcome { get; set; } = null!;
}

[Table("WelcomeDMEmbedSettings")]
public class WelcomeDMEmbedSettings
{
    [Key] public int Id { get; set; }

    [Required] public int WelcomeId { get; set; }

    public bool IsDMEmbed { get; set; }

    [MaxLength(200)] public string? DMEmbedTitle { get; set; }

    [MaxLength(10)] public string? DMEmbedColor { get; set; }

    [MaxLength(500)] public string? DMEmbedThumbnail { get; set; }

    [MaxLength(500)] public string? DMEmbedImage { get; set; }

    [MaxLength(200)] public string? DMEmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("WelcomeId")] public virtual Welcome Welcome { get; set; } = null!;
}

[Table("WelcomeDMCardSettings")]
public class WelcomeDMCardSettings
{
    [Key] public int Id { get; set; }

    [Required] public int WelcomeId { get; set; }

    public bool SendDMCard { get; set; }

    [MaxLength(100)] public string? DMCardTitle { get; set; }

    [MaxLength(200)] public string? DMCardUsernameText { get; set; }

    [MaxLength(200)] public string? DMCardMemberText { get; set; }

    [MaxLength(10)] public string? DMCardBackgroundColor1 { get; set; }

    [MaxLength(10)] public string? DMCardBackgroundColor2 { get; set; }

    [MaxLength(10)] public string? DMCardTextColor { get; set; }

    [MaxLength(10)] public string? DMCardBorderColor { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("WelcomeId")] public virtual Welcome Welcome { get; set; } = null!;
}