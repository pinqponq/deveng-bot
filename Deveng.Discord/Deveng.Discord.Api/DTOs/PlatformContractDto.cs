namespace Deveng.Discord.Api.DTOs;

public static class PlatformFeatureNames
{
    public const string Poll = "Poll";
    public const string AutoRole = "AutoRole";
    public const string InviteLeaderboard = "InviteLeaderboard";
    public const string ScheduledAnnouncement = "ScheduledAnnouncement";
    public const string FeedAnnouncement = "FeedAnnouncement";
    public const string AIModeration = "AIModeration";
    public const string GuildReport = "GuildReport";
    public const string Locale = "Locale";
    public const string Automation = "Automation";
}

public static class PlatformLocales
{
    public const string DefaultLocale = "tr";

    public static readonly IReadOnlySet<string> Supported = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "en",
        "fr",
        "es",
        "de",
        "tr",
        "ar",
        "pt",
        "zh",
        "ru",
        "ko",
        "hr",
        "cnr"
    };

    public static bool IsSupported(string? locale) =>
        !string.IsNullOrWhiteSpace(locale) && Supported.Contains(locale.Trim());
}

public class QuotaExceededDto
{
    public string Code { get; set; } = "quota_exceeded";
    public string Message { get; set; } = "Kota aşıldı.";
    public int Limit { get; set; }
    public int Used { get; set; }
    public int Remaining { get; set; }
    public bool UpgradeRequired { get; set; }
}
