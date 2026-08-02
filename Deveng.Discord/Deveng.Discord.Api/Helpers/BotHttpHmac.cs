using System.Security.Cryptography;
using System.Text;

namespace Deveng.Discord.Api.Helpers;

/// <summary>
///     API → Bot HTTP çağrılarında kullanılan HMAC-SHA256 imzası (BotProxyController ile aynı sözleşme).
/// </summary>
public static class BotHttpHmac
{
    /// <summary>
    ///     İmza: hex küçük harf HMAC-SHA256(secret, timestamp + body). Gövdesiz POST için body "".
    /// </summary>
    public static void AddSignedHeaders(HttpRequestMessage request, string sharedSecret, string body = "")
    {
        if (string.IsNullOrEmpty(sharedSecret))
            return;

        var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var payload = ts + body;
        var sig = Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(sharedSecret), Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();

        request.Headers.TryAddWithoutValidation("X-Bot-Timestamp", ts);
        request.Headers.TryAddWithoutValidation("X-Bot-Signature", sig);
    }
}
