namespace Deveng.Discord.Api.DTOs;

public class ModeratorDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<ModeratorRuleDto> Rules { get; set; } = new();
    public List<ForbiddenWordDto> ForbiddenWords { get; set; } = new();
}

public class ModeratorRuleDto
{
    public int Id { get; set; }
    public int ModeratorId { get; set; }
    public string RuleType { get; set; } = string.Empty;
    public int Action { get; set; } // 0: Devre Dışı, 1: Mesaj Sil, 2: Kullanıcıyı Uyar, 3: Mesajı Sil & Üyeyi Uyar
    public bool Enabled { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ForbiddenWordDto
{
    public int Id { get; set; }
    public int ModeratorId { get; set; }
    public string Word { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
}

public class CreateModeratorDto
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public List<CreateModeratorRuleDto>? Rules { get; set; }
}

public class CreateModeratorRuleDto
{
    public string RuleType { get; set; } = string.Empty;
    public int Action { get; set; } = 0; // 0: Devre Dışı, 1: Mesaj Sil, 2: Kullanıcıyı Uyar, 3: Mesajı Sil & Üyeyi Uyar
    public bool Enabled { get; set; } = true;
}

public class UpdateModeratorDto
{
    public bool? Enabled { get; set; }
}

public class UpdateModeratorRuleDto
{
    public int Action { get; set; }
    public bool? Enabled { get; set; }
}

public class AddForbiddenWordDto
{
    public string Word { get; set; } = string.Empty;
}