using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("Moderator")]
public class Moderator
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ModeratorRule> ModeratorRules { get; set; } = new List<ModeratorRule>();
    public virtual ICollection<ForbiddenWord> ForbiddenWords { get; set; } = new List<ForbiddenWord>();
}

[Table("ModeratorRule")]
public class ModeratorRule
{
    [Key] public int Id { get; set; }

    [Required] public int ModeratorId { get; set; }

    [Required][MaxLength(50)] public string RuleType { get; set; } = string.Empty;

    [Required]
    public int Action { get; set; } = 0; // 0: Devre Dışı, 1: Mesaj Sil, 2: Kullanıcıyı Uyar, 3: Mesajı Sil & Üyeyi Uyar

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("ModeratorId")] public virtual Moderator Moderator { get; set; } = null!;
}

[Table("ForbiddenWord")]
public class ForbiddenWord
{
    [Key] public int Id { get; set; }

    [Required] public int ModeratorId { get; set; }

    [Required][MaxLength(200)] public string Word { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("ModeratorId")] public virtual Moderator Moderator { get; set; } = null!;
}