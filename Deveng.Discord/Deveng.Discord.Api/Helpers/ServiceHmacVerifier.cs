using System.Security.Cryptography;
using System.Text;
using Deveng.Shared.Redis.Interfaces;

namespace Deveng.Discord.Api.Helpers;

/// <summary>
///     Bot → API yönlü HMAC-SHA256 imza doğrulayıcısı.
///     Bot tarafında <c>apiClient.ts</c> aynı sözleşme ile imzalar:
///     header X-Bot-Timestamp = unix-ms, header X-Bot-Signature = HEX(HMAC-SHA256(secret, timestamp + rawBody)).
///     Replay koruması: Redis nonce key TTL'i (timestamp + signature prefix).
/// </summary>
public static class ServiceHmacVerifier
{
    private const long TimestampToleranceMs = 90_000; // ±90 sn — bot httpServer.ts ile aynı

    public sealed record Result(bool Ok, string? Reason);

    public static async Task<Result> VerifyAsync(
        HttpContext ctx,
        string sharedSecret,
        IRedisConnectionService redis,
        ILogger logger,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(sharedSecret))
            return new Result(false, "shared_secret_not_configured");

        var ts = ctx.Request.Headers["X-Bot-Timestamp"].FirstOrDefault();
        var sig = ctx.Request.Headers["X-Bot-Signature"].FirstOrDefault();
        if (string.IsNullOrEmpty(ts) || string.IsNullOrEmpty(sig))
            return new Result(false, "missing_signature_headers");

        if (!long.TryParse(ts, out var tsMs))
            return new Result(false, "invalid_timestamp");

        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (Math.Abs(nowMs - tsMs) > TimestampToleranceMs)
            return new Result(false, "timestamp_drift");

        ctx.Request.EnableBuffering();
        ctx.Request.Body.Position = 0;
        using var sr = new StreamReader(ctx.Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await sr.ReadToEndAsync(ct);
        ctx.Request.Body.Position = 0;

        var expected = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(sharedSecret),
                                    Encoding.UTF8.GetBytes(ts + rawBody)))
            .ToLowerInvariant();

        byte[] expectedBytes;
        byte[] givenBytes;
        try
        {
            expectedBytes = Convert.FromHexString(expected);
            givenBytes = Convert.FromHexString(sig);
        }
        catch
        {
            return new Result(false, "invalid_signature_encoding");
        }

        if (expectedBytes.Length != givenBytes.Length || !CryptographicOperations.FixedTimeEquals(expectedBytes, givenBytes))
            return new Result(false, "signature_mismatch");

        // Replay protection: aynı (timestamp, signature) çifti TTL içinde tekrar kabul edilmez
        try
        {
            var db = redis.GetConnection().GetDatabase();
            var nonceKey = $"api:hmac:nonce:{ts}:{sig.Substring(0, Math.Min(sig.Length, 64))}";
            var ok = await db.StringSetAsync(nonceKey, "1",
                new StackExchange.Redis.Expiration(TimeSpan.FromMilliseconds(TimestampToleranceMs + 30_000)),
                StackExchange.Redis.When.NotExists);
            if (!ok)
                return new Result(false, "replay_detected");
        }
        catch (Exception ex)
        {
            // Redis erişimi yoksa fail-closed: imza geçerli olsa bile replay korumasız akışa izin verme.
            logger.LogWarning(ex, "ServiceHmacVerifier: Redis nonce store erişilemedi");
            return new Result(false, "nonce_store_unavailable");
        }

        return new Result(true, null);
    }
}
