using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;

using Deveng.Discord.Infrastructure.Extensions;
using Deveng.Discord.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDevengDatabase(builder.Configuration);
builder.Services.AddHttpClient(nameof(BotDispatchClient))
    .ConfigureHttpClient(c => c.Timeout = TimeSpan.FromSeconds(90))
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        MaxConnectionsPerServer = 32
    });

builder.Services.AddOpenTelemetry()
    .ConfigureResource(rb => rb.AddService("Deveng.Discord.Worker"))
    .WithMetrics(mb =>
    {
        mb.AddMeter(SchedulingWorkerMetrics.MeterName)
            .AddOtlpExporter();
    });

builder.Services.AddSingleton<SchedulingWorkerMetrics>();
builder.Services.AddSingleton<BotDispatchClient>();
builder.Services.AddHostedService<SchedulingWorkerHostedService>();

var host = builder.Build();
await host.RunAsync();
