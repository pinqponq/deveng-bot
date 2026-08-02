using System.Diagnostics;
using System.Text;
using Deveng.Discord.Api.Helpers;
using Pinqloq;

namespace Deveng.Discord.Api.Middleware;

/// <summary>
///     Her HTTP isteğini/yanıtını (gövdeler dahil) Pinqloq'a LogSourceType=Api olarak gönderir.
///     ExceptionHandler'ın ÜSTÜNE kaydedilir; böylece hata yanıtlarının gövdesi ve doğru status
///     kodu da yakalanır. Sır/PII desenleri <see cref="SensitiveDataRedactor" /> ile maskelenir.
///     Yalnızca Pinqloq:SecretKey yapılandırıldığında pipeline'a eklenir (Program.cs).
/// </summary>
public sealed class PinqloqLoggingMiddleware
{
    private static readonly string AppVersion =
        typeof(PinqloqLoggingMiddleware).Assembly.GetName().Version?.ToString() ?? string.Empty;

    /// <summary>
    ///     Bot'un yüksek frekanslı, düşük değerli polling GET uçları. Başarılı (2xx/3xx) olduklarında
    ///     Information seviyesinde loglanmazlar — aksi halde her dakika onlarca "iş yok" logu birikir.
    ///     Hata/uyarı (>=400) durumları HER ZAMAN loglanır. Env ile genişletilebilir: Pinqloq:SkipInfoLogPaths.
    /// </summary>
    private static readonly string[] DefaultSkipInfoPaths =
    {
        "/api/birthday/users/date",
        "/api/reminder/pending",
        "/api/scheduledannouncement/pending",
        "/api/feedannouncement/due",
        "/api/guildreport/pending",
        "/api/aimoderation/queue/pending"
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<PinqloqLoggingMiddleware> _logger;
    private readonly string[] _skipInfoPaths;

    public PinqloqLoggingMiddleware(
        RequestDelegate next,
        ILogger<PinqloqLoggingMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;

        var configured = configuration.GetSection("Pinqloq:SkipInfoLogPaths").Get<string[]>();
        _skipInfoPaths = (configured is { Length: > 0 } ? configured : DefaultSkipInfoPaths)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim().ToLowerInvariant())
            .ToArray();
    }

    public async Task InvokeAsync(HttpContext context, IPinqloqLogger pinqloq)
    {
        var method = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;
        var sw = Stopwatch.StartNew();

        var requestBody = await ReadRequestBodyAsync(context.Request);

        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();

            // Yanıt gövdesini oku ve istemciye ilet.
            var responseBody = string.Empty;
            try
            {
                buffer.Position = 0;
                if (IsTextLike(context.Response.ContentType))
                    responseBody = await new StreamReader(buffer, Encoding.UTF8, false, leaveOpen: true).ReadToEndAsync();
                else if (buffer.Length > 0)
                    responseBody = $"[binary {context.Response.ContentType ?? "unknown"}, {buffer.Length} bytes]";

                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
            }
            finally
            {
                context.Response.Body = originalBody;
            }

            var status = context.Response.StatusCode;

            try
            {
                var level = status >= 500 ? PinqloqLogLevel.Error
                    : status >= 400 ? PinqloqLogLevel.Warning
                    : PinqloqLogLevel.Information;

                if (level != PinqloqLogLevel.Information || !ShouldSkipInfoLog(path))
                {
                    var metadata = new Dictionary<string, string>
                    {
                        ["event"] = $"{method} {path}",
                        ["method"] = method,
                        ["path"] = path,
                        ["statusCode"] = status.ToString(),
                        ["durationMs"] = sw.ElapsedMilliseconds.ToString()
                    };
                    if (context.Items.TryGetValue("CorrelationId", out var cid) && cid is not null)
                        metadata["correlationId"] = cid.ToString()!;

                    var discordUserId = context.Items.TryGetValue("DiscordUserId", out var uid) ? uid?.ToString() : null;
                    if (!string.IsNullOrEmpty(discordUserId))
                        metadata["discordUserId"] = discordUserId;
                    if (context.Items.TryGetValue("GuildId", out var gid) && gid is not null)
                        metadata["guildId"] = gid.ToString()!;

                    var detail = new Dictionary<string, string>();
                    var query = context.Request.QueryString.Value;
                    if (!string.IsNullOrEmpty(query))
                        detail["queryString"] = SensitiveDataRedactor.Redact(query);
                    if (!string.IsNullOrEmpty(requestBody))
                        detail["InputJson"] = SensitiveDataRedactor.Redact(requestBody);
                    if (!string.IsNullOrEmpty(responseBody))
                        detail["OutputJson"] = SensitiveDataRedactor.Redact(responseBody);
                    if (!string.IsNullOrEmpty(context.Request.ContentType))
                        detail["requestContentType"] = context.Request.ContentType!;
                    if (!string.IsNullOrEmpty(context.Response.ContentType))
                        detail["responseContentType"] = context.Response.ContentType!;

                    var accepted = pinqloq.Enqueue(new PinqloqLogEntry
                    {
                        LogLevel = level,
                        LogSourceType = PinqloqLogSourceType.Api,
                        AppVersionName = AppVersion,
                        DeviceUid = discordUserId ?? string.Empty,
                        Metadata = metadata,
                        Detail = detail
                    });

                    if (!accepted)
                        _logger.LogWarning("Pinqloq kuyruğu dolu; log düştü: {Method} {Path} -> {Status}",
                            method, path, status);
                }
            }
            catch (Exception pex)
            {
                _logger.LogError(pex, "Pinqloq logging middleware beklenmedik şekilde hata verdi");
            }
        }
    }

    private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        if (request.ContentLength is null or 0)
            return string.Empty;

        request.EnableBuffering();
        request.Body.Position = 0;
        var body = await new StreamReader(request.Body, Encoding.UTF8, false, leaveOpen: true).ReadToEndAsync();
        request.Body.Position = 0;
        return body;
    }

    private bool ShouldSkipInfoLog(string path)
    {
        if (string.IsNullOrEmpty(path) || _skipInfoPaths.Length == 0)
            return false;

        var p = path.ToLowerInvariant();
        foreach (var skip in _skipInfoPaths)
            if (p.Contains(skip))
                return true;
        return false;
    }

    private static bool IsTextLike(string? contentType)
    {
        if (string.IsNullOrEmpty(contentType))
            return true;

        var ct = contentType.ToLowerInvariant();
        return ct.Contains("json")
            || ct.Contains("text")
            || ct.Contains("xml")
            || ct.Contains("x-www-form-urlencoded")
            || ct.Contains("javascript");
    }
}
