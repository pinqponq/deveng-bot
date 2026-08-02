using System.Reflection;
using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Deveng.Discord.Api.Filters;

/// <summary>
/// Deny-by-default: her API eylemi AllowAnonymous, DiscordAuth veya RequireDiscordUser ile işaretlenmelidir.
/// </summary>
public sealed class EndpointAuthorizationMetadataFilter : IAsyncAuthorizationFilter
{
    private readonly ILogger _securityLogger;

    public EndpointAuthorizationMetadataFilter(ILoggerFactory loggerFactory)
    {
        _securityLogger = loggerFactory.CreateLogger(SecurityLog.LoggerName);
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.ActionDescriptor is not ControllerActionDescriptor cad)
            return Task.CompletedTask;

        if (HasAllowAnonymous(cad))
            return Task.CompletedTask;

        if (HasDiscordAuth(cad) || HasRequireDiscordUser(cad))
            return Task.CompletedTask;

        _securityLogger.LogWarning(
            "{Event} controller={Controller} action={Action} traceId={TraceId}",
            SecurityLog.Event.AuthMetadataMissing,
            cad.ControllerName,
            cad.ActionName,
            context.HttpContext.TraceIdentifier);

        context.Result = new ObjectResult(new
        {
            code = "auth_metadata_missing",
            message = "Bu uç için güvenlik meta verisi eksik (AllowAnonymous / DiscordAuth / RequireDiscordUser).",
            traceId = context.HttpContext.TraceIdentifier
        })
        {
            StatusCode = StatusCodes.Status500InternalServerError
        };
        return Task.CompletedTask;
    }

    private static bool HasAllowAnonymous(ControllerActionDescriptor cad) =>
        cad.MethodInfo.GetCustomAttributes<AllowAnonymousAttribute>(true).Any()
        || cad.ControllerTypeInfo.GetCustomAttributes<AllowAnonymousAttribute>(true).Any();

    private static bool HasDiscordAuth(ControllerActionDescriptor cad) =>
        cad.MethodInfo.GetCustomAttributes<DiscordAuthAttribute>(true).Any()
        || cad.ControllerTypeInfo.GetCustomAttributes<DiscordAuthAttribute>(true).Any();

    private static bool HasRequireDiscordUser(ControllerActionDescriptor cad) =>
        cad.MethodInfo.GetCustomAttributes<RequireDiscordUserAttribute>(true).Any()
        || cad.ControllerTypeInfo.GetCustomAttributes<RequireDiscordUserAttribute>(true).Any();
}
