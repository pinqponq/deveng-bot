namespace Deveng.Discord.Api.Helpers;

/// <summary>
/// Güvenlik olayları için logger adı ve yardımcılar (token/PII maskeleme).
/// NLog: logger name Deveng.Security (bkz. nlog.config).
/// </summary>
public static class SecurityLog
{
    public const string LoggerName = "Deveng.Security";

    /// <summary>Olay türü sabitleri (güvenlik SIEM / korelasyon).</summary>
    public static class Event
    {
        public const string LoginFail = "login_fail";
        public const string AuthzFail = "authz_fail";
        public const string HmacFail = "hmac_fail";
        public const string ReplayDetected = "replay_detected";
        public const string CustomBotStart = "custom_bot_start";
        public const string CustomBotStop = "custom_bot_stop";
        public const string RateLimitTrigger = "rate_limit_trigger";
        public const string AuthMetadataMissing = "auth_metadata_missing";
    }

    public static string MaskToken(string? token)
    {
        if (string.IsNullOrEmpty(token)) return "";
        var t = token.Trim();
        if (t.Length <= 8) return "***";
        return t[..4] + "…" + t[^4..];
    }

    public static string MaskUserId(string? userId)
    {
        if (string.IsNullOrEmpty(userId)) return "";
        if (userId.Length <= 6) return "***";
        return userId[..3] + "…" + userId[^3..];
    }
}
