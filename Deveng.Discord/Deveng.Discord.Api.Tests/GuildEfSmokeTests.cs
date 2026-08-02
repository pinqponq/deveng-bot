using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Deveng.Discord.Api.Tests;

/// <summary>EF Core smoke — guild CRUD ve tenant izolasyonu (InMemory; PG için Testcontainers ayrı koşulur).</summary>
public class GuildEfSmokeTests
{
    [Fact]
    public async Task CreateGuild_ThenQueryByGuildId_ReturnsSameGuild()
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DevengDbContext>();

        var guild = new Guild
        {
            GuildId = "123456789012345678",
            GuildName = "Test Guild",
            MemberCount = 10,
            LastSeen = DateTime.UtcNow
        };
        db.Guilds.Add(guild);
        await db.SaveChangesAsync();

        var loaded = await db.Guilds.AsNoTracking()
            .FirstOrDefaultAsync(g => g.GuildId == guild.GuildId);

        Assert.NotNull(loaded);
        Assert.Equal("Test Guild", loaded!.GuildName);
    }

    [Fact]
    public async Task GuildFeatures_AreIsolatedByGuildId()
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DevengDbContext>();

        db.GuildFeatures.AddRange(
            new GuildFeature { GuildId = "guild-a", FeatureName = "polls", IsEnabled = true },
            new GuildFeature { GuildId = "guild-b", FeatureName = "polls", IsEnabled = false });
        await db.SaveChangesAsync();

        var aFeatures = await db.GuildFeatures.AsNoTracking()
            .Where(f => f.GuildId == "guild-a")
            .ToListAsync();

        Assert.Single(aFeatures);
        Assert.True(aFeatures[0].IsEnabled);
    }

    private static IServiceScope CreateScope()
    {
        var services = new ServiceCollection();
        services.AddDbContext<DevengDbContext>(options =>
            options.UseInMemoryDatabase($"deveng-test-{Guid.NewGuid():N}"));
        return services.BuildServiceProvider().CreateScope();
    }
}
