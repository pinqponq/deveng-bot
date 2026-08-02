using System.Security.Cryptography;
using System.Text;

namespace Deveng.Discord.Worker;

/// <summary>
/// Bot HTTP (httpServer.ts) ile aynı HMAC sözleşmesi: HEX(HMAC-SHA256(secret, ts + rawBody)).
/// </summary>
public sealed class BotDispatchClient(IHttpClientFactory httpFactory, IConfiguration configuration, ILogger<BotDispatchClient> logger)
{
    public async Task PostSignedAsync(
        string relativePath,
        string jsonBody,
        CancellationToken cancellationToken,
        string? correlationId = null,
        string? messageId = null)
    {
        var baseUrl = (configuration["Worker:BotHttpBaseUrl"]
                       ?? Environment.GetEnvironmentVariable("BOT_HTTP_BASE_URL")
                       ?? string.Empty).Trim().TrimEnd('/');
        var secret = (configuration["Worker:BotSharedSecret"]
                      ?? Environment.GetEnvironmentVariable("BOT_SHARED_SECRET")
                      ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(baseUrl))
            throw new InvalidOperationException("Worker:BotHttpBaseUrl veya BOT_HTTP_BASE_URL tanımlı değil.");

        if (string.IsNullOrEmpty(secret))
            throw new InvalidOperationException("Worker:BotSharedSecret veya BOT_SHARED_SECRET tanımlı değil.");

        var uri = new Uri($"{baseUrl}{relativePath}");
        using var req = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
        };

        AddHmacHeaders(req, secret, jsonBody);

        var botToken = (configuration["Worker:BotToken"]
                        ?? Environment.GetEnvironmentVariable("BOT_TOKEN")
                        ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(botToken))
            req.Headers.TryAddWithoutValidation("X-Bot-Token", botToken);

        if (!string.IsNullOrEmpty(correlationId))
            req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        if (!string.IsNullOrEmpty(messageId))
            req.Headers.TryAddWithoutValidation("X-Message-Id", messageId);

        using var http = httpFactory.CreateClient(nameof(BotDispatchClient));
        using var resp = await http.SendAsync(req, cancellationToken).ConfigureAwait(false);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            logger.LogWarning("Bot HTTP {Status} {Path}: {Body}", (int)resp.StatusCode, relativePath, body);
            resp.EnsureSuccessStatusCode();
        }
    }

    private static void AddHmacHeaders(HttpRequestMessage req, string secret, string rawBody)
    {
        var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var sigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(ts + rawBody));
        var sig = Convert.ToHexString(sigBytes).ToLowerInvariant();
        req.Headers.TryAddWithoutValidation("X-Bot-Timestamp", ts);
        req.Headers.TryAddWithoutValidation("X-Bot-Signature", sig);
    }
}
