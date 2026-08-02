using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Deveng.Discord.Api.Attributes;

/// <summary>
/// Yalnızca Discord kullanıcı access token (Bearer) kabul eder; bot token / X-Bot-Token reddedilir.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireDiscordUserAttribute : Attribute, IAsyncAuthorizationFilter
{
    public bool IncludeGuilds { get; set; }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var discordAuthService = context.HttpContext.RequestServices.GetRequiredService<IDiscordAuthService>();
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<RequireDiscordUserAttribute>>();
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var traceId = context.HttpContext.TraceIdentifier;

        if (!string.IsNullOrEmpty(context.HttpContext.Request.Headers["X-Bot-Token"].FirstOrDefault()))
        {
            logger.LogWarning("[RequireDiscordUser] Bot token ile çağrı reddedildi. TraceId={TraceId}", traceId);
            context.Result = new ObjectResult(new { code = "bot_not_allowed", message = "Bu uç yalnızca panel kullanıcı oturumu ile çağrılabilir.", traceId })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        var expectedBotToken = configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        var authHeaderRaw = context.HttpContext.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeaderRaw) || !authHeaderRaw.StartsWith("Bearer ", StringComparison.Ordinal))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Discord token bulunamadı." });
            return;
        }

        var token = authHeaderRaw["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Discord token boş." });
            return;
        }

        if (!string.IsNullOrEmpty(expectedBotToken) && token == expectedBotToken)
        {
            logger.LogWarning("[RequireDiscordUser] Ana bot bearer ile çağrı reddedildi. TraceId={TraceId}", traceId);
            context.Result = new ObjectResult(new { code = "bot_not_allowed", message = "Bu uç yalnızca panel kullanıcı oturumu ile çağrılabilir.", traceId })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        var botClientIdHeader = context.HttpContext.Request.Headers["X-Bot-ClientId"].FirstOrDefault();
        if (!string.IsNullOrEmpty(botClientIdHeader))
        {
            var customBotService = context.HttpContext.RequestServices.GetService<ICustomBotService>();
            if (customBotService != null)
            {
                var customBot = await customBotService.GetCustomBotByClientIdAsync(botClientIdHeader);
                if (customBot != null && customBot.BotToken == token)
                {
                    logger.LogWarning("[RequireDiscordUser] Custom bot bearer ile çağrı reddedildi. TraceId={TraceId}", traceId);
                    context.Result = new ObjectResult(new { code = "bot_not_allowed", message = "Bu uç yalnızca panel kullanıcı oturumu ile çağrılabilir.", traceId })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                    return;
                }
            }
        }

        var userInfo = await discordAuthService.ValidateTokenAsync(token, IncludeGuilds);
        if (userInfo == null)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Geçersiz veya süresi dolmuş Discord token." });
            return;
        }

        context.HttpContext.Items["DiscordUserId"] = userInfo.UserId;
        context.HttpContext.Items["DiscordUserGuilds"] = userInfo.Guilds;
        context.HttpContext.Items["DiscordUserInfo"] = userInfo;
        logger.LogInformation("[RequireDiscordUser] OK TraceId={TraceId} UserId={UserId} IncludeGuilds={IncludeGuilds}", traceId, userInfo.UserId, IncludeGuilds);
    }
}
