namespace Deveng.Discord.Api.DTOs;

public class GuildLocaleDto
{
    public string GuildId { get; set; } = string.Empty;
    public string DefaultLocale { get; set; } = PlatformLocales.DefaultLocale;
    public string FallbackLocale { get; set; } = PlatformLocales.DefaultLocale;
    public DateTime UpdatedAt { get; set; }
}

public class UpsertGuildLocaleDto
{
    public string DefaultLocale { get; set; } = PlatformLocales.DefaultLocale;
    public string FallbackLocale { get; set; } = PlatformLocales.DefaultLocale;
}
