using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Deveng.Discord.Api.Tests;

public class ConfigurationProductionValidationTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "test";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } =
            new PhysicalFileProvider(AppContext.BaseDirectory);
    }

    private static IConfiguration MakeConfig(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values!).Build();

    [Fact]
    public void Production_config_passes_when_secrets_present()
    {
        var cfg = MakeConfig(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=x;Database=y;User Id=a;Password=b;TrustServerCertificate=True",
            ["BotToken"] = "bot-token",
            ["Auth:Discord:ClientId"] = "client",
            ["Auth:Discord:ClientSecret"] = "secret",
            ["Redis:Host"] = "redis",
        });
        var ex = Record.Exception(() => Program.ValidateConfigurationOrThrow(cfg, new FakeHostEnvironment()));
        Assert.Null(ex);
    }

    [Fact]
    public void Production_config_fails_when_connection_missing()
    {
        var cfg = MakeConfig(new Dictionary<string, string?>
        {
            ["BotToken"] = "bot-token",
            ["Auth:Discord:ClientId"] = "client",
            ["Auth:Discord:ClientSecret"] = "secret",
            ["Redis:Host"] = "redis",
        });
        Assert.Throws<InvalidOperationException>(() => Program.ValidateConfigurationOrThrow(cfg, new FakeHostEnvironment()));
    }

    [Fact]
    public void Development_skips_validation()
    {
        var cfg = MakeConfig(new Dictionary<string, string?>());
        Program.ValidateConfigurationOrThrow(cfg,
            new FakeHostEnvironment { EnvironmentName = Environments.Development });
    }
}
