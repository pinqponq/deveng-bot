using Deveng.Discord.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Deveng.Discord.Api.Filters;

/// <summary>
/// MusicController için merkezi exception → HTTP status mapping.
/// Action'larda try/catch yazmak yerine bu filter exception'ları yakalar.
/// </summary>
public sealed class MusicExceptionFilter : IExceptionFilter
{
    private readonly ILogger<MusicExceptionFilter> _logger;

    public MusicExceptionFilter(ILogger<MusicExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var ex = context.Exception;
        var traceId = context.HttpContext.TraceIdentifier;

        switch (ex)
        {
            case MusicSetupRequiredException setup:
                context.Result = new ObjectResult(new
                {
                    code = "setup_required",
                    message = "Müzik özelliğini kullanmadan önce DJ rolü seçilmelidir.",
                    settings = setup.Settings,
                    traceId
                })
                {
                    StatusCode = StatusCodes.Status428PreconditionRequired
                };
                context.ExceptionHandled = true;
                return;

            case BotMusicException bot:
                {
                    var status = bot.StatusCode == 422 ? 422 : bot.StatusCode >= 500 ? 502 : bot.StatusCode;
                    context.Result = new ObjectResult(new
                    {
                        code = "music_upstream",
                        message = bot.Message,
                        botStatusCode = bot.StatusCode,
                        traceId
                    })
                    {
                        StatusCode = status
                    };
                    context.ExceptionHandled = true;
                    return;
                }

            case HttpRequestException:
            case TaskCanceledException:
            case TimeoutException:
                _logger.LogWarning(ex, "[Music] Bot upstream unreachable TraceId={TraceId}", traceId);
                context.Result = new ObjectResult(new
                {
                    code = "upstream_unavailable",
                    message = "Müzik servisine ulaşılamıyor.",
                    traceId
                })
                {
                    StatusCode = StatusCodes.Status502BadGateway
                };
                context.ExceptionHandled = true;
                return;

            case InvalidOperationException io:
                context.Result = new ObjectResult(new
                {
                    code = "music_invalid_operation",
                    message = io.Message,
                    traceId
                })
                {
                    StatusCode = StatusCodes.Status400BadRequest
                };
                context.ExceptionHandled = true;
                return;
        }
    }
}
