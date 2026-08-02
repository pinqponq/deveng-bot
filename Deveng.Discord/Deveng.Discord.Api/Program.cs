using Deveng.Discord.Api.Configuration;
using Deveng.Discord.Infrastructure.Extensions;
using Deveng.Discord.Api.Features;
using Deveng.Discord.Api.Middleware;
using Deveng.Discord.Api.Messaging;
using Deveng.Discord.Api.Exceptions;
using Deveng.Discord.Api.Filters;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Services;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Shared.Redis.Configuration;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Pinqloq;
using System.Threading.RateLimiting;
using NLog;
using NLog.Web;

var logger = LogManager.Setup()
    .LoadConfigurationFromFile("nlog.config")
    .GetCurrentClassLogger();

try
{

var builder = WebApplication.CreateBuilder(args);

var otlpEndpoint = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")?.Trim();
if (!string.IsNullOrEmpty(otlpEndpoint))
{
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(rb => rb.AddService(
            serviceName: Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME")?.Trim() ?? "deveng-discord-api",
            serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString()))
        .WithTracing(tb => tb
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter());
}

builder.Logging.ClearProviders();
builder.Host.UseNLog();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1 * 1024 * 1024;
    options.Limits.MaxRequestHeadersTotalSize = 32 * 1024;
    options.Limits.MaxRequestLineSize = 8 * 1024;
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(o =>
{
    o.SerializerOptions.MaxDepth = 32;
});
builder.Services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(o =>
{
    o.JsonSerializerOptions.MaxDepth = 32;
});

builder.Services.AddDevengDatabase(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddRedisConnection(builder.Configuration);
builder.Services.AddSingleton<Deveng.Discord.Api.Services.IRedisCacheService, Deveng.Discord.Api.Services.RedisCacheService>();
builder.Services.AddDevengMessaging();
builder.Services.AddDevengVerticalSliceFeatures();

// HttpClient outbound hardening:
// - AllowAutoRedirect=false → 3xx kullanıcının kontrolünde olmaz, SSRF redirect-chain pivotunu kapatır
// - Connect/total timeout sınırları → slowloris/yavas-upstream'e karşı bağlantı tüketmez
static System.Net.Http.HttpMessageHandler BuildHardenedHandler() => new SocketsHttpHandler
{
    AllowAutoRedirect = false,
    ConnectTimeout = TimeSpan.FromSeconds(10),
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    MaxConnectionsPerServer = 32,
    AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate
};

builder.Services.AddHttpClient<IDiscordAuthService, DiscordAuthService>()
    .ConfigurePrimaryHttpMessageHandler(BuildHardenedHandler);

builder.Services.AddHttpClient(string.Empty)
    .ConfigurePrimaryHttpMessageHandler(BuildHardenedHandler);
builder.Services.AddHttpClient("BotClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
}).ConfigurePrimaryHttpMessageHandler(BuildHardenedHandler);

builder.Services.AddScoped<IBotGuildAuthorizationService, BotGuildAuthorizationService>();

builder.Services.AddScoped<IWelcomeService, WelcomeService>();
builder.Services.AddScoped<IGoodbyeService, GoodbyeService>();
builder.Services.AddScoped<IReactionRoleService, ReactionRoleService>();
builder.Services.AddScoped<IQuotaService, QuotaService>();
builder.Services.AddScoped<IGuildService, GuildService>();
builder.Services.AddScoped<IModeratorService, ModeratorService>();
builder.Services.AddScoped<ICustomCommandService, CustomCommandService>();
builder.Services.AddScoped<IAutomationService, AutomationService>();
builder.Services.AddScoped<ITicketPanelService, TicketPanelService>();
builder.Services.AddScoped<IEmbedMessageService, EmbedMessageService>();
builder.Services.AddScoped<IPollService, PollService>();
builder.Services.AddScoped<ITemporaryVoiceChannelService, TemporaryVoiceChannelService>();
builder.Services.AddScoped<IStatisticsChannelService, StatisticsChannelService>();
builder.Services.AddScoped<IHelpCommandService, HelpCommandService>();
builder.Services.AddScoped<IBirthdayService, BirthdayService>();
builder.Services.AddScoped<IReminderService, ReminderService>();
builder.Services.AddScoped<IReminderSettingsService, ReminderSettingsService>();
builder.Services.AddScoped<ILogChannelService, LogChannelService>();
builder.Services.AddScoped<IGiveawayService, GiveawayService>();
builder.Services.AddScoped<IGuildFeatureService, GuildFeatureService>();
builder.Services.AddScoped<ICustomBotService, CustomBotService>();
builder.Services.AddScoped<ILevelService, LevelService>();
builder.Services.AddScoped<IMusicService, MusicService>();
builder.Services.AddScoped<IPanelAuditLogService, PanelAuditLogService>();
builder.Services.AddScoped<IModerationLogService, ModerationLogService>();
builder.Services.AddScoped<IAIModerationService, AIModerationService>();
builder.Services.AddScoped<IAutoRoleService, AutoRoleService>();
builder.Services.AddScoped<ILocaleService, LocaleService>();
builder.Services.AddScoped<IFeedAnnouncementService, FeedAnnouncementService>();
builder.Services.AddScoped<IInviteLeaderboardService, InviteLeaderboardService>();
builder.Services.AddScoped<GuildAnalyticsService>();
builder.Services.AddScoped<IGuildAnalyticsService>(sp => sp.GetRequiredService<GuildAnalyticsService>());
builder.Services.AddScoped<IGuildAnalyticsIngestService>(sp => sp.GetRequiredService<GuildAnalyticsService>());
builder.Services.AddScoped<ITicketService, TicketService>();
builder.Services.AddScoped<IScheduledAnnouncementService, ScheduledAnnouncementService>();
builder.Services.AddScoped<IGuildReportService, GuildReportService>();
builder.Services.Configure<ReportEmailOptions>(builder.Configuration.GetSection(ReportEmailOptions.SectionName));
builder.Services.AddScoped<IGuildReportEmailSender, GuildReportEmailSender>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 5;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("api", o =>
    {
        o.PermitLimit = 120;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });

    options.AddPolicy("poll-vote", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 40,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("poll-send", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("custom-bot-mutate", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 15,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("music-search", context =>
    {
        var key = context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("music-control", context =>
    {
        var key = context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("music-events", context =>
    {
        var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("public-read", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    // Guild-level mutate cap — [EnableRateLimiting("guild-mutate")] ile bağlanır.
    options.AddPolicy("guild-mutate", context =>
    {
        var guildId =
            (context.GetRouteData().Values.TryGetValue("guildId", out var g) ? g?.ToString() : null)
            ?? context.Request.Query["guildId"].FirstOrDefault()
            ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter($"g:{guildId}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    if (builder.Environment.IsDevelopment())
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/health"))
                return RateLimitPartition.GetNoLimiter("health");

            return RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });
    }
    else
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/health"))
                return RateLimitPartition.GetNoLimiter("health");

            return RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowList", policy =>
    {
        var origins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];
        if (origins.Length == 0 && !builder.Environment.IsDevelopment())
            throw new InvalidOperationException("Cors:AllowedOrigins yapılandırması zorunludur.");

        if (origins.Length > 0)
            policy.WithOrigins(origins).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
        else
            policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
                .AllowAnyMethod().AllowAnyHeader().AllowCredentials();
    });
});

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddAuthorization();
builder.Services.AddScoped<MusicExceptionFilter>();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<EndpointAuthorizationMetadataFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var pinqloqSecretKey = builder.Configuration["Pinqloq:SecretKey"]?.Trim();
var pinqloqEnabled = !string.IsNullOrWhiteSpace(pinqloqSecretKey);
if (pinqloqEnabled)
{
    builder.Services.AddPinqloq(options =>
    {
        builder.Configuration.GetSection("Pinqloq").Bind(options);
        options.SecretKey = pinqloqSecretKey!;
        if (string.IsNullOrWhiteSpace(options.ApiLogsCollectionName))
            options.ApiLogsCollectionName = "deveng_api_logs";
        if (string.IsNullOrWhiteSpace(options.AppVersionName))
            options.AppVersionName = typeof(Program).Assembly.GetName().Version?.ToString() ?? string.Empty;
    });
}

Program.ValidateConfigurationOrThrow(builder.Configuration, builder.Environment);

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();

if (pinqloqEnabled)
    app.UseMiddleware<PinqloqLoggingMiddleware>();
else
    app.Logger.LogInformation("Optional telemetry disabled (Pinqloq:SecretKey not set).");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        var log = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Exception");
        var error = feature?.Error;

            if (error is ApiException api)
            {
                log.LogWarning(api,
                    "Handled ApiException Code={Code} Status={Status} TraceId={TraceId}",
                    api.Code, api.StatusCode, context.TraceIdentifier);

                context.Response.StatusCode = api.StatusCode;
                context.Response.ContentType = "application/json";

                object payload = api switch
                {
                    FeatureLimitException flx => new
                    {
                        code = flx.Code,
                        message = flx.Message,
                        quota = flx.Quota,
                        limit = flx.Limit,
                        current = flx.Current,
                        traceId = context.TraceIdentifier
                    },
                    _ => new
                    {
                        code = api.Code,
                        message = api.Message,
                        traceId = context.TraceIdentifier
                    }
                };
                await context.Response.WriteAsJsonAsync(payload);
                return;
            }

        var pgEx = error as PostgresException ?? error?.InnerException as PostgresException;
        if (pgEx is { SqlState: "42P01" or "42883" })
        {
            log.LogError(pgEx,
                "PostgreSQL schema/object missing SqlState={SqlState} TraceId={TraceId}",
                pgEx.SqlState, context.TraceIdentifier);
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                code = "database_object_missing",
                message =
                    "Gerekli veritabanı nesneleri bulunamadı. Sunucuda `dotnet ef database update` ile EF migration'ların uygulandığını doğrulayın.",
                traceId = context.TraceIdentifier
            });
            return;
        }

        var (mappedStatus, mappedCode, mappedMessage) = error switch
        {
            ArgumentException => (400, "bad_request", error.Message),
            KeyNotFoundException => (404, "not_found", error.Message),
            UnauthorizedAccessException => (401, "unauthorized", "Yetkilendirme gerekli."),
            OperationCanceledException => (499, "client_closed_request", "İstek iptal edildi."),
            HttpRequestException => (502, "upstream_unavailable", "Üst hizmete ulaşılamıyor."),
            _ => (0, string.Empty, string.Empty)
        };

        if (mappedStatus != 0)
        {
            log.LogWarning(error,
                "Mapped framework exception Type={Type} Status={Status} TraceId={TraceId}",
                error!.GetType().Name, mappedStatus, context.TraceIdentifier);

            context.Response.StatusCode = mappedStatus;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                code = mappedCode,
                message = mappedMessage,
                traceId = context.TraceIdentifier
            });
            return;
        }

        if (error != null)
            log.LogError(error, "Unhandled exception TraceId={TraceId}", context.TraceIdentifier);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        if (app.Environment.IsDevelopment() && error is { } ex)
        {
            string? pgSqlState = null;
            for (var e = (Exception?)ex; e != null; e = e.InnerException)
                if (e is PostgresException pe)
                {
                    pgSqlState = pe.SqlState;
                    break;
                }

            await context.Response.WriteAsJsonAsync(new
            {
                code = "internal_error",
                message = "Bir hata oluştu.",
                traceId = context.TraceIdentifier,
                detail = ex.Message,
                exceptionType = ex.GetType().FullName,
                pgSqlState
            });
            return;
        }

        await context.Response.WriteAsJsonAsync(new
        {
            code = "internal_error",
            message = "Bir hata oluştu.",
            traceId = context.TraceIdentifier
        });
    });
});
app.UseStatusCodePages();

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    ctx.Response.Headers["X-XSS-Protection"] = "0";
    if (ctx.Request.IsHttps)
        ctx.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";

    await next();
});

if (app.Configuration.GetValue("EnableHttpsRedirection", false))
    app.UseHttpsRedirection();

app.UseCors("AllowList");

app.Use(async (context, next) =>
{
    var method = context.Request.Method;
    var path = context.Request.Path.Value ?? string.Empty;
    var sw = System.Diagnostics.Stopwatch.StartNew();
    await next(context);
    sw.Stop();
    var status = context.Response.StatusCode;
    var logger = app.Logger;
    var slowMs = app.Configuration.GetValue("Logging:ApiRequestSlowMs", 2000);
    if (status >= 500)
        logger.LogWarning("[API] {Method} {Path} -> {Status} ({Elapsed}ms)", method, path, status, sw.ElapsedMilliseconds);
    else if (status >= 400)
        logger.LogInformation("[API] {Method} {Path} -> {Status} ({Elapsed}ms)", method, path, status, sw.ElapsedMilliseconds);
    else if (sw.ElapsedMilliseconds >= slowMs)
        logger.LogInformation("[API] {Method} {Path} -> {Status} ({Elapsed}ms) slow", method, path, status, sw.ElapsedMilliseconds);
    else
        logger.LogDebug("[API] {Method} {Path} -> {Status} ({Elapsed}ms)", method, path, status, sw.ElapsedMilliseconds);
});

app.UseRateLimiter();

app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

async Task VerifyStartupConnectionsAsync()
{
    var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
    try
    {
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DevengDbContext>();
            var canConnect = await db.Database.CanConnectAsync();
            if (!canConnect)
                throw new InvalidOperationException("PostgreSQL bağlantısı kurulamadı.");
            startupLogger.LogInformation("[STARTUP] PostgreSQL bağlantısı doğrulandı ✓");
        }

        var redis = app.Services.GetRequiredService<Deveng.Shared.Redis.Interfaces.IRedisConnectionService>();
        var redisConn = redis.GetConnection();
        var redisDb = redisConn.GetDatabase();
        await redisDb.PingAsync();
        var redisEndpoint = redisConn.GetEndPoints().FirstOrDefault()?.ToString() ?? "?";
        startupLogger.LogInformation("[STARTUP] Redis bağlantısı doğrulandı ✓ ({Endpoint})", redisEndpoint);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "[STARTUP] Bağlantı doğrulama BAŞARISIZ ✗");
        throw;
    }
}

await VerifyStartupConnectionsAsync();

app.Run();

}
catch (Exception ex)
{
    logger.Error(ex, "[STARTUP] Uygulama başlatılırken kritik hata oluştu");
    throw;
}
finally
{
    LogManager.Shutdown();
}

public partial class Program
{
    /// <summary>
    /// Üretim ortamında zorunlu sırların ortam değişkeni veya yapılandırma ile sağlandığını doğrular.
    /// </summary>
    public static void ValidateConfigurationOrThrow(IConfiguration configuration, IHostEnvironment environment)
    {
        if (!environment.IsProduction()) return;

        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("DefaultConnection")))
            missing.Add("ConnectionStrings:DefaultConnection");

        var botTok = (configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN") ?? "").Trim();
        if (string.IsNullOrEmpty(botTok)) missing.Add("BotToken veya BOT_TOKEN");

        var clientId = (configuration["Auth:Discord:ClientId"] ?? Environment.GetEnvironmentVariable("Auth__Discord__ClientId") ?? "").Trim();
        var clientSecret = (configuration["Auth:Discord:ClientSecret"] ?? Environment.GetEnvironmentVariable("Auth__Discord__ClientSecret") ?? "").Trim();
        if (string.IsNullOrEmpty(clientId)) missing.Add("Auth:Discord:ClientId");
        if (string.IsNullOrEmpty(clientSecret)) missing.Add("Auth:Discord:ClientSecret");

        if (configuration.GetValue("Bot:RequireServiceHmac", false))
        {
            var shared = (configuration["Bot:SharedSecret"] ?? "").Trim();
            if (string.IsNullOrEmpty(shared)) missing.Add("Bot:SharedSecret (Bot:RequireServiceHmac=true)");
        }

        if (string.IsNullOrWhiteSpace(configuration["Redis:Host"]))
            missing.Add("Redis:Host");

        if (missing.Count > 0)
            throw new InvalidOperationException("Üretim yapılandırması eksik: " + string.Join("; ", missing));
    }
}
