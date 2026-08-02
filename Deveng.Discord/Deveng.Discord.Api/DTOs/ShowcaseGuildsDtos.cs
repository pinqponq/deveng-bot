namespace Deveng.Discord.Api.DTOs;

public sealed class ShowcaseGuildsPayloadDto
{
    public string? UpdatedAt { get; set; }
    public int TotalGuilds { get; set; }
    public int TotalMembersApprox { get; set; }
    public List<ShowcaseGuildDto> Guilds { get; set; } = new();
}

public sealed class ShowcaseGuildDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Eski Redis kayıtları (CDN URL) — yeni bot yükü data URL kullanır.</summary>
    public string? IconUrl { get; set; }
    public string? BannerUrl { get; set; }
    /// <summary>data:image/...;base64,... — istemci Discord CDN’ine ihtiyaç duymaz.</summary>
    public string? IconDataUrl { get; set; }
    public string? BannerDataUrl { get; set; }
    public int MemberCount { get; set; }
}
