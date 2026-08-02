using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Shared.Redis.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.Json;

namespace Deveng.Discord.Api.Attributes;

/// <summary>
///     Discord authentication ve authorization kontrolü yapan attribute
///     Kullanıcının Discord token'ını validate eder ve sunucu yetkisini kontrol eder
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class DiscordAuthAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly bool _requireGuildPermission;
    private readonly bool _includeGuilds;

    /// <summary>
    ///     DiscordAuth attribute constructor
    /// </summary>
    /// <param name="requireGuildPermission">Rotada guildId zorunlu olsun ve üyelik kontrolü yapılsın mı? (varsayılan: true)</param>
    /// <param name="includeGuilds">Token validate edilirken Discord /users/@me/guilds çağrılsın mı? requireGuildPermission=true ise zaten true olur. Liste filtreleme yapan ama rotada guildId olmayan endpoint'ler için açıkça true verin.</param>
    public DiscordAuthAttribute(bool requireGuildPermission = true, bool includeGuilds = false)
    {
        _requireGuildPermission = requireGuildPermission;
        _includeGuilds = includeGuilds;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var authSw = System.Diagnostics.Stopwatch.StartNew();
        var traceId = context.HttpContext.TraceIdentifier;
        var discordAuthService = context.HttpContext.RequestServices
            .GetRequiredService<IDiscordAuthService>();
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILogger<DiscordAuthAttribute>>();
        var configuration = context.HttpContext.RequestServices
            .GetRequiredService<IConfiguration>();

        var botTokenHeader = context.HttpContext.Request.Headers["X-Bot-Token"].FirstOrDefault();
        var botClientIdHeader = context.HttpContext.Request.Headers["X-Bot-ClientId"].FirstOrDefault();
        var expectedBotToken = configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        var authHeaderRaw = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
        var bearerToken = !string.IsNullOrEmpty(authHeaderRaw) && authHeaderRaw.StartsWith("Bearer ")
            ? authHeaderRaw.Substring("Bearer ".Length).Trim()
            : null;
        logger.LogDebug(
            "[DiscordAuth] START TraceId={TraceId}, Method={Method}, Path={Path}, RequireGuildPermission={RequireGuildPermission}, HasAuth={HasAuth}, HasBotToken={HasBotToken}, HasBotClientId={HasBotClientId}",
            traceId,
            context.HttpContext.Request.Method,
            context.HttpContext.Request.Path,
            _requireGuildPermission,
            !string.IsNullOrEmpty(authHeaderRaw),
            !string.IsNullOrEmpty(botTokenHeader),
            !string.IsNullOrEmpty(botClientIdHeader));

        if (!string.IsNullOrEmpty(botClientIdHeader))
        {
            context.HttpContext.Items["BotClientId"] = botClientIdHeader;
            logger.LogInformation("Bot clientId header detected: {BotClientId}, Request: {Method} {Path}",
                botClientIdHeader,
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path);
        }

        async Task<bool> BotHmacOkAsync()
        {
            var sharedSecret = configuration["Bot:SharedSecret"] ?? string.Empty;
            var requireHmac = configuration.GetValue("Bot:RequireServiceHmac", !string.IsNullOrEmpty(sharedSecret));
            var hasHmacHeaders =
                !string.IsNullOrEmpty(context.HttpContext.Request.Headers["X-Bot-Timestamp"].FirstOrDefault()) &&
                !string.IsNullOrEmpty(context.HttpContext.Request.Headers["X-Bot-Signature"].FirstOrDefault());

            if (requireHmac || hasHmacHeaders)
            {
                var redis = context.HttpContext.RequestServices.GetService<IRedisConnectionService>();
                if (redis == null)
                {
                    logger.LogError("[DiscordAuth] Bot HMAC istendi ancak Redis servis bulunamadı. TraceId={TraceId}", traceId);
                    context.Result = new UnauthorizedObjectResult(new { message = "Servis HMAC doğrulaması yapılandırılmamış." });
                    return false;
                }

                var verify = await ServiceHmacVerifier.VerifyAsync(context.HttpContext, sharedSecret, redis, logger);
                if (!verify.Ok)
                {
                    logger.LogWarning("[DiscordAuth] Bot HMAC reddedildi. TraceId={TraceId}, Reason={Reason}", traceId, verify.Reason);
                    context.Result = new UnauthorizedObjectResult(new { message = "Geçersiz servis imzası." });
                    return false;
                }
            }
            else
            {
                logger.LogWarning(
                    "[DiscordAuth] Bot token isteği HMAC imzası olmadan geldi (transition mode). TraceId={TraceId}, Path={Path}",
                    traceId, context.HttpContext.Request.Path);
            }

            return true;
        }

        if (!string.IsNullOrEmpty(botTokenHeader))
        {
            if (!await BotHmacOkAsync()) return;

            if (!string.IsNullOrEmpty(expectedBotToken) && botTokenHeader == expectedBotToken)
            {
                context.HttpContext.Items["DiscordAuthIsBot"] = true;
                authSw.Stop();
                logger.LogInformation(
                    "[DiscordAuth] Bot request (main) accepted. TraceId={TraceId}, Request: {Method} {Path}, BotClientId: {BotClientId}, DurationMs={DurationMs}",
                    traceId, context.HttpContext.Request.Method, context.HttpContext.Request.Path, botClientIdHeader ?? "N/A", authSw.ElapsedMilliseconds);
                return;
            }

            if (!string.IsNullOrEmpty(botClientIdHeader))
            {
                var customBotService = context.HttpContext.RequestServices.GetService<ICustomBotService>();
                if (customBotService != null)
                {
                    var customBot = await customBotService.GetCustomBotByClientIdAsync(botClientIdHeader);
                    if (customBot != null && customBot.BotToken == botTokenHeader)
                    {
                        context.HttpContext.Items["DiscordAuthIsBot"] = true;
                        authSw.Stop();
                        logger.LogInformation(
                            "[DiscordAuth] Bot request (custom bot) accepted. TraceId={TraceId}, Request: {Method} {Path}, BotClientId: {BotClientId}, DurationMs={DurationMs}",
                            traceId, context.HttpContext.Request.Method, context.HttpContext.Request.Path, botClientIdHeader, authSw.ElapsedMilliseconds);
                        return;
                    }
                }
            }
        }

        if (!string.IsNullOrEmpty(bearerToken))
        {
            if (!string.IsNullOrEmpty(expectedBotToken) && bearerToken == expectedBotToken)
            {
                if (!await BotHmacOkAsync()) return;
                context.HttpContext.Items["DiscordAuthIsBot"] = true;
                authSw.Stop();
                logger.LogInformation(
                    "[DiscordAuth] Bot request via Authorization header (main) accepted. TraceId={TraceId}, Request: {Method} {Path}, BotClientId: {BotClientId}, DurationMs={DurationMs}",
                    traceId, context.HttpContext.Request.Method, context.HttpContext.Request.Path, botClientIdHeader ?? "N/A", authSw.ElapsedMilliseconds);
                return;
            }

            if (!string.IsNullOrEmpty(botClientIdHeader))
            {
                var customBotService = context.HttpContext.RequestServices.GetService<ICustomBotService>();
                if (customBotService != null)
                {
                    var customBot = await customBotService.GetCustomBotByClientIdAsync(botClientIdHeader);
                    if (customBot != null && customBot.BotToken == bearerToken)
                    {
                        if (!await BotHmacOkAsync()) return;
                        context.HttpContext.Items["DiscordAuthIsBot"] = true;
                        authSw.Stop();
                        logger.LogInformation(
                            "[DiscordAuth] Bot request via Authorization header (custom bot) accepted. TraceId={TraceId}, Request: {Method} {Path}, BotClientId: {BotClientId}, DurationMs={DurationMs}",
                            traceId, context.HttpContext.Request.Method, context.HttpContext.Request.Path, botClientIdHeader, authSw.ElapsedMilliseconds);
                        return;
                    }
                }
            }
        }

        var authHeader = authHeaderRaw;

        logger.LogInformation("Authorization header received: {HasHeader}, Request: {Method} {Path}",
            !string.IsNullOrEmpty(authHeader),
            context.HttpContext.Request.Method,
            context.HttpContext.Request.Path);

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            logger.LogWarning("No Authorization header or invalid format. Header: {Header}", authHeader);
            context.Result = new UnauthorizedObjectResult(new
            {
                message = "Discord token bulunamadı. Lütfen Discord ile giriş yapın."
            });
            authSw.Stop();
            logger.LogWarning("[DiscordAuth] END Unauthorized (missing/invalid auth). TraceId={TraceId}, DurationMs={DurationMs}", traceId, authSw.ElapsedMilliseconds);
            return;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        logger.LogInformation("Token extracted (length: {Length}), validating...", token.Length);

        var requireGuildCheck = _requireGuildPermission;
        string? guildId = null;

        if (requireGuildCheck)
        {
            guildId = GetGuildIdFromRequest(context);

            if (string.IsNullOrEmpty(guildId))
                guildId = await GetGuildIdFromBodyAsync(context);

            if (string.IsNullOrEmpty(guildId))
            {
                logger.LogWarning(
                    "GuildId parameter not found in request. Method: {Method}, Path: {Path}, RouteValues: {RouteValues}",
                    context.HttpContext.Request.Method,
                    context.HttpContext.Request.Path,
                    string.Join(", ", context.RouteData.Values.Select(kv => $"{kv.Key}={kv.Value}")));

                context.Result = new BadRequestObjectResult(new
                {
                    message = "GuildId parametresi bulunamadı.",
                    method = context.HttpContext.Request.Method,
                    path = context.HttpContext.Request.Path.Value,
                    routeValues = context.RouteData.Values.ToDictionary(kv => kv.Key, kv => kv.Value?.ToString())
                });
                authSw.Stop();
                logger.LogWarning("[DiscordAuth] END BadRequest (missing guildId). TraceId={TraceId}, DurationMs={DurationMs}", traceId, authSw.ElapsedMilliseconds);
                return;
            }
        }

        var loadGuilds = _includeGuilds || requireGuildCheck;
        var validateSw = System.Diagnostics.Stopwatch.StartNew();
        var userInfo = await discordAuthService.ValidateTokenAsync(token, loadGuilds);
        validateSw.Stop();
        logger.LogInformation(
            "[DiscordAuth] ValidateToken finished. TraceId={TraceId}, IncludeGuilds={IncludeGuilds}, DurationMs={DurationMs}, IsNull={IsNull}",
            traceId, loadGuilds, validateSw.ElapsedMilliseconds, userInfo == null);

        if (userInfo == null)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                message = "Geçersiz veya süresi dolmuş Discord token."
            });
            authSw.Stop();
            logger.LogWarning("[DiscordAuth] END Unauthorized (ValidateTokenAsync null). TraceId={TraceId}, DurationMs={DurationMs}", traceId, authSw.ElapsedMilliseconds);
            return;
        }

        context.HttpContext.Items["DiscordUserId"] = userInfo.UserId;
        context.HttpContext.Items["DiscordUserGuilds"] = userInfo.Guilds;
        context.HttpContext.Items["DiscordUserInfo"] = userInfo;

        if (requireGuildCheck && !string.IsNullOrEmpty(guildId))
        {
            // GET: guild listede olması yeterli; POST/PUT/DELETE: admin yetkisi gerekir.
            var isWriteOperation = context.HttpContext.Request.Method != "GET";
            var requireAdminPermission = isWriteOperation;

            var hasPermission = discordAuthService.HasGuildPermission(userInfo, guildId, requireAdminPermission);

            if (!hasPermission)
            {
                logger.LogWarning(
                    "User {UserId} does not have permission to access guild {GuildId}. Method: {Method}, RequireAdmin: {RequireAdmin}, GuildsCount: {GuildsCount}",
                    userInfo.UserId, guildId, context.HttpContext.Request.Method, requireAdminPermission, userInfo.Guilds.Count);

                var errorMessage = userInfo.Guilds.Count == 0
                    ? "Sunucu listesi alınamadı. Lütfen çıkış yapıp Discord ile tekrar giriş yapın."
                    : requireAdminPermission
                        ? "Bu sunucuda yönetim yetkisine sahip değilsiniz."
                        : "Bu sunucuya erişim yetkiniz yok.";

                context.Result = new ObjectResult(new
                {
                    message = errorMessage,
                    guildId
                })
                {
                    StatusCode = 403
                };
                authSw.Stop();
                logger.LogWarning("[DiscordAuth] END Forbidden (guild permission). TraceId={TraceId}, GuildId={GuildId}, DurationMs={DurationMs}", traceId, guildId, authSw.ElapsedMilliseconds);
                return;
            }

            logger.LogInformation("User {UserId} has permission to access guild {GuildId}. Method: {Method}",
                userInfo.UserId, guildId, context.HttpContext.Request.Method);

            context.HttpContext.Items["GuildId"] = guildId;
        }

        authSw.Stop();
        logger.LogInformation("[DiscordAuth] END OK. TraceId={TraceId}, UserId={UserId}, DurationMs={DurationMs}", traceId, userInfo.UserId, authSw.ElapsedMilliseconds);
    }

    private string? GetGuildIdFromRequest(AuthorizationFilterContext context)
    {
        if (context.RouteData.Values.TryGetValue("guildId", out var guildIdValue)) return guildIdValue?.ToString();

        if (context.HttpContext.Request.Query.TryGetValue("guildId", out var queryGuildId))
            return queryGuildId.ToString();

        return null;
    }

    private async Task<string?> GetGuildIdFromBodyAsync(AuthorizationFilterContext context)
    {
        try
        {
            context.HttpContext.Request.EnableBuffering();
            context.HttpContext.Request.Body.Position = 0;

            using var reader = new StreamReader(context.HttpContext.Request.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            context.HttpContext.Request.Body.Position = 0;

            if (string.IsNullOrEmpty(body))
                return null;

            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("guildId", out var guildIdElement)) return guildIdElement.GetString();
        }
        catch
        {
        }

        return null;
    }
}