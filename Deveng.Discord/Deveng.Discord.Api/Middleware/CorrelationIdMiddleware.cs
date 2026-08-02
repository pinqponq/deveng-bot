using System.Diagnostics;

namespace Deveng.Discord.Api.Middleware;

/// <summary>
/// İstemciden gelen veya oluşturulan correlation-id ile izlenebilirlik; OTEL baggage ile uyumludur.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var incoming = context.Request.Headers[HeaderName].FirstOrDefault()?.Trim();
        var correlationId = string.IsNullOrEmpty(incoming) ? context.TraceIdentifier : incoming;

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers.Append(HeaderName, correlationId);

        var activity = Activity.Current;
        activity?.AddBaggage("correlation.id", correlationId);

        await next(context);
    }
}
