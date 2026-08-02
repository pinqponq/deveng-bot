using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Poll")]
public class Poll
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? MessageId { get; set; }

    [Required][MaxLength(500)] public string Question { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime? EndedAt { get; set; }

    public int? EndAfterMinutes { get; set; }

    public int? EndAfterVotes { get; set; }

    public bool AllowMultipleVotes { get; set; } = false;

    public int TotalVotes { get; set; } = 0;

    [MaxLength(200)] public string? PollEmbedTitle { get; set; }

    [MaxLength(2000)] public string? PollEmbedDescription { get; set; }

    [MaxLength(10)] public string? PollEmbedColor { get; set; }

    [MaxLength(500)] public string? PollEmbedThumbnail { get; set; }

    [MaxLength(500)] public string? PollEmbedImage { get; set; }

    [MaxLength(200)] public string? PollEmbedFooter { get; set; }

    [MaxLength(200)] public string? ResultEmbedTitle { get; set; }

    [MaxLength(2000)] public string? ResultEmbedDescription { get; set; }

    [MaxLength(10)] public string? ResultEmbedColor { get; set; }

    [MaxLength(500)] public string? ResultEmbedThumbnail { get; set; }

    [MaxLength(500)] public string? ResultEmbedImage { get; set; }

    [MaxLength(200)] public string? ResultEmbedFooter { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<PollOption> Options { get; set; } = new List<PollOption>();
    public virtual ICollection<PollRolePermission> RolePermissions { get; set; } = new List<PollRolePermission>();
}

[Table("PollOption")]
public class PollOption
{
    [Key] public int Id { get; set; }

    [Required] public int PollId { get; set; }

    [Required][MaxLength(200)] public string OptionText { get; set; } = string.Empty;

    [MaxLength(50)] public string? Emoji { get; set; }

    public int OrderIndex { get; set; } = 0;

    public int VoteCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("PollId")] public virtual Poll? Poll { get; set; }
}

[Table("PollRolePermission")]
public class PollRolePermission
{
    [Key] public int Id { get; set; }

    [Required] public int PollId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    public bool IsAllowed { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("PollId")] public virtual Poll? Poll { get; set; }
}