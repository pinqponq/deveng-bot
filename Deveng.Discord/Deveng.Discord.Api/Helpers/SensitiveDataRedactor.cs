using System.Text.RegularExpressions;

namespace Deveng.Discord.Api.Helpers;

/// <summary>
///     Log gövdelerindeki (istek/yanıt/query) bilinen sır ve PII desenlerini maskeler.
///     nlog.config'deki redaksiyon kalıplarının C# karşılığı + JSON anahtar-bazlı maskeleme.
///     Yeni bir sır formatı çıkarsa buraya (ve paralel olarak nlog.config'e) desen eklenmeli.
/// </summary>
public static partial class SensitiveDataRedactor
{
    /// <summary>
    ///     Girdi metnindeki bilinen sır/PII desenlerini maskeleyerek döndürür.
    ///     Desenler sırayla uygulanır; en spesifik (JSON anahtar) önce.
    /// </summary>
    public static string Redact(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return input ?? string.Empty;

        var s = input;
        // JSON: "token"/"password"/"secret"/"botToken"/... : "value" → değer maskelenir
        s = JsonSecretKey().Replace(s, "$1\"***REDACTED***\"");
        // Authorization: Bearer <token>
        s = BearerToken().Replace(s, "$1***REDACTED***");
        // Discord bot token / uygulama JWT'si (xxx.yyy.zzz)
        s = DiscordToken().Replace(s, "***DISCORD_TOKEN***");
        // Discord webhook URL
        s = DiscordWebhook().Replace(s, "https://discord.com/api/webhooks/***REDACTED***");
        // PCI alanları (card_number/cvv/pan/...)
        s = PciField().Replace(s, "$1=***PCI***");
        // Açık kart numarası (#### #### #### ####)
        s = CardNumber().Replace(s, "****-****-****-****");
        return s;
    }

    // JSON anahtar-bazlı: hassas anahtarların değerini maskeler (bot token/parola/sır + PCI anahtarları).
    // Değer hem tırnaklı string hem tırnaksız sayı/bool/null olabilir → hepsi "***REDACTED***" olur.
    [GeneratedRegex("(?i)(\"(?:bot[_-]?token|token|password|passwd|pwd|secret|client[_-]?secret|api[_-]?key|authorization|x-bot-token|card_?number|cardno|cc_?number|pan|cvv|cvc|expiry_?month|expiry_?year|exp_?month|exp_?year|cc_?owner)\"\\s*:\\s*)(\"(?:[^\"\\\\]|\\\\.)*\"|-?\\d+(?:\\.\\d+)?|true|false|null)")]
    private static partial Regex JsonSecretKey();

    [GeneratedRegex("(?i)(authorization\\s*[:=]\\s*bearer\\s+)[A-Za-z0-9._\\-+/=]+")]
    private static partial Regex BearerToken();

    [GeneratedRegex("[A-Za-z0-9_-]{24,28}\\.[A-Za-z0-9_-]{6,7}\\.[A-Za-z0-9_-]{27,}")]
    private static partial Regex DiscordToken();

    [GeneratedRegex("https://discord(?:app)?\\.com/api/webhooks/\\d+/[A-Za-z0-9_\\-]+")]
    private static partial Regex DiscordWebhook();

    [GeneratedRegex("(?i)(card_number|cardno|cc_number|pan|cvv|cvc|expiry_month|expiry_year|exp_month|exp_year|cc_owner)\\s*[:=]\\s*[^&,\\s\\}\"]+")]
    private static partial Regex PciField();

    [GeneratedRegex("\\b\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{1,4}\\b")]
    private static partial Regex CardNumber();
}
