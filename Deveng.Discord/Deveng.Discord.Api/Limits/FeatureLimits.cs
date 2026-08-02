namespace Deveng.Discord.Api.Limits;

/// <summary>
/// Bir guild içinde kayıt sayısı ile ölçülen özellik anahtarları (SP satır sayısı).
/// </summary>
public static class FeatureQuota
{
    public const string CustomCommand = "custom-command";
    public const string ReactionRolePanel = "reaction-role-panel";
    public const string AutomationRule = "automation-rule";
    public const string EmbedMessage = "embed-message";
    public const string TicketPanel = "ticket-panel";
    public const string Poll = "poll";
    public const string Giveaway = "giveaway";
    public const string Reminder = "reminder";
    public const string StatisticsChannel = "statistics-channel";
    public const string TempVoiceChannelLobby = "temp-voice-lobby";
    public const string FeedSubscription = "feed-subscription";
    public const string ScheduledAnnouncement = "scheduled-announcement";
    public const string HelpCommand = "help-command";
    public const string LogChannel = "log-channel";
}

/// <summary>
/// Tüm kullanıcılar için tek kota kademesi (ücret ayrımı yok).
/// </summary>
public static class FeatureLimits
{
    /// <summary>Bilinmeyen kota anahtarı için güvenli tavan.</summary>
    public const int Unlimited = int.MaxValue;

    private static readonly IReadOnlyDictionary<string, int> LimitsByQuotaKey =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            [FeatureQuota.CustomCommand] = 50,
            [FeatureQuota.ReactionRolePanel] = 15,
            [FeatureQuota.AutomationRule] = 15,
            [FeatureQuota.EmbedMessage] = 50,
            [FeatureQuota.TicketPanel] = 10,
            [FeatureQuota.Poll] = 20,
            [FeatureQuota.Giveaway] = 20,
            [FeatureQuota.Reminder] = 50,
            [FeatureQuota.StatisticsChannel] = 10,
            [FeatureQuota.TempVoiceChannelLobby] = 10,
            [FeatureQuota.FeedSubscription] = 30,
            [FeatureQuota.ScheduledAnnouncement] = 50,
            [FeatureQuota.HelpCommand] = 50,
            [FeatureQuota.LogChannel] = 10,
        };

    public static int GetLimit(string quotaKey) =>
        LimitsByQuotaKey.TryGetValue(quotaKey, out var v) ? v : Unlimited;

    /// <summary>Panel kota tablosu / dokümantasyon için anlık görüntü.</summary>
    public static IReadOnlyDictionary<string, int> GetLimitsSnapshot() => LimitsByQuotaKey;
}
