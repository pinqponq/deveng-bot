using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("TicketPanel")]
public class TicketPanel
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? MessageId { get; set; }

    [MaxLength(2000)] public string? PanelMessage { get; set; }

    public bool IsEmbed { get; set; } = false;

    [MaxLength(200)] public string? EmbedTitle { get; set; }

    [MaxLength(2000)] public string? EmbedDescription { get; set; }

    [MaxLength(10)] public string? EmbedColor { get; set; }

    [MaxLength(500)] public string? EmbedThumbnail { get; set; }

    [MaxLength(500)] public string? EmbedImage { get; set; }

    [MaxLength(200)] public string? EmbedFooter { get; set; }

    [MaxLength(2000)] public string? WelcomeMessage { get; set; }

    public bool IsWelcomeEmbed { get; set; } = false;

    [MaxLength(200)] public string? WelcomeEmbedTitle { get; set; }

    [MaxLength(2000)] public string? WelcomeEmbedDescription { get; set; }

    [MaxLength(10)] public string? WelcomeEmbedColor { get; set; }

    [MaxLength(500)] public string? WelcomeEmbedThumbnail { get; set; }

    [MaxLength(500)] public string? WelcomeEmbedImage { get; set; }

    [MaxLength(200)] public string? WelcomeEmbedFooter { get; set; }

    [MaxLength(50)] public string? TranscriptChannelId { get; set; }

    public bool SendTranscriptToUser { get; set; } = true;

    [MaxLength(50)] public string? OpenCategoryId { get; set; }

    [MaxLength(100)] public string? OpenCategoryName { get; set; }

    [MaxLength(50)] public string? ClaimedCategoryId { get; set; }

    [MaxLength(100)] public string? ClaimedCategoryName { get; set; }

    [MaxLength(50)] public string? ClosedCategoryId { get; set; }

    [MaxLength(100)] public string? ClosedCategoryName { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<TicketPanelRole> TicketPanelRoles { get; set; } = new List<TicketPanelRole>();
    public virtual ICollection<TicketType> TicketTypes { get; set; } = new List<TicketType>();
    public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}

[Table("TicketPanelRole")]
public class TicketPanelRole
{
    [Key] public int Id { get; set; }

    [Required] public int TicketPanelId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("TicketPanelId")] public virtual TicketPanel TicketPanel { get; set; } = null!;
}

[Table("TicketType")]
public class TicketType
{
    [Key] public int Id { get; set; }

    [Required] public int TicketPanelId { get; set; }

    [Required] public int Type { get; set; } = 0; // 0: Buton, 1: Açılır Menü

    [Required][MaxLength(80)] public string Label { get; set; } = string.Empty;

    [MaxLength(100)] public string? Emoji { get; set; }

    [Required] public int Style { get; set; } = 1; // Buton için: 1=Primary, 2=Secondary, 3=Success, 4=Danger

    [MaxLength(100)] public string? Placeholder { get; set; } // Açılır menü için

    [Required] public int OrderIndex { get; set; } = 0;

    [MaxLength(50)] public string? OpenCategoryId { get; set; }

    [MaxLength(100)] public string? OpenCategoryName { get; set; }

    [MaxLength(50)] public string? ClaimedCategoryId { get; set; }

    [MaxLength(100)] public string? ClaimedCategoryName { get; set; }

    [MaxLength(50)] public string? ClosedCategoryId { get; set; }

    [MaxLength(100)] public string? ClosedCategoryName { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("TicketPanelId")] public virtual TicketPanel TicketPanel { get; set; } = null!;
}

[Table("Ticket")]
public class Ticket
{
    [Key] public int Id { get; set; }

    [Required] public int TicketPanelId { get; set; }

    public int? TicketTypeId { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string UserId { get; set; } = string.Empty;

    [Required] public int Status { get; set; } = 0; // 0: Açık, 1: Üstlenildi, 2: Kapatıldı

    [MaxLength(50)] public string? ClaimedBy { get; set; }

    public DateTime? ClaimedAt { get; set; }

    [MaxLength(50)] public string? ClosedBy { get; set; }

    public DateTime? ClosedAt { get; set; }

    public int? TranscriptId { get; set; }

    public DateTime? LastMessageAt { get; set; }

    [MaxLength(50)] public string? LastMessageAuthorId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("TicketPanelId")] public virtual TicketPanel TicketPanel { get; set; } = null!;

    [ForeignKey("TicketTypeId")] public virtual TicketType? TicketType { get; set; }

    [ForeignKey("TranscriptId")] public virtual TicketTranscript? Transcript { get; set; }
}

[Table("TicketTranscript")]
public class TicketTranscript
{
    [Key] public int Id { get; set; }

    [Required] public int TicketId { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? MessageId { get; set; }

    [MaxLength(500)] public string? TranscriptUrl { get; set; }

    public string? TranscriptContent { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("TicketId")] public virtual Ticket Ticket { get; set; } = null!;
}