using Deveng.Discord.Api.Models;
using Deveng.Discord.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Deveng.Discord.Api.Tests;

/// <summary>
/// AUTHZ-001 / RATELIMIT-AUTHZ-001 regresyon koruması: <see cref="DiscordAuthService.HasGuildPermission"/>
/// guild-scope yetkilendirme kararlarını doğrudan test eder (altyapı gerektirmez; HasGuildPermission yalnız logger kullanır).
/// Özellikle: Discord 429 rate-limit penceresinde boş guild listesiyle KÖR erişim verilmemeli (IDOR).
/// </summary>
public class DiscordAuthServiceGuildPermissionTests
{
    private const long AdministratorPermission = 0x8;
    private const long ManageGuildPermission = 0x20;

    private static DiscordAuthService CreateService() =>
        new(new HttpClient(), NullLogger<DiscordAuthService>.Instance, null!);

    private static DiscordUserInfo User(bool rateLimitHit, params DiscordGuildInfo[] guilds) =>
        new() { UserId = "user-1", RateLimitHit = rateLimitHit, Guilds = guilds.ToList() };

    private static DiscordGuildInfo Guild(string id, bool owner = false, long permissions = 0) =>
        new() { Id = id, Owner = owner, Permissions = permissions };

    [Fact]
    public void RateLimit_with_empty_guilds_denies_read_access()
    {
        // IDOR düzeltmesi: eski davranış GET'e kör izin veriyordu. Artık üyelik doğrulanamıyorsa reddedilir.
        var svc = CreateService();
        var user = User(rateLimitHit: true); // guild listesi boş
        Assert.False(svc.HasGuildPermission(user, "guild-x", requireAdminPermission: false));
    }

    [Fact]
    public void RateLimit_with_empty_guilds_denies_write_access()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: true);
        Assert.False(svc.HasGuildPermission(user, "guild-x", requireAdminPermission: true));
    }

    [Fact]
    public void Member_in_guild_list_is_allowed_for_read()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a"));
        Assert.True(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: false));
    }

    [Fact]
    public void Non_member_is_denied_for_read()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a"));
        Assert.False(svc.HasGuildPermission(user, "guild-b", requireAdminPermission: false));
    }

    [Fact]
    public void Owner_is_allowed_for_write()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a", owner: true));
        Assert.True(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: true));
    }

    [Fact]
    public void Administrator_permission_is_allowed_for_write()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a", permissions: AdministratorPermission));
        Assert.True(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: true));
    }

    [Fact]
    public void ManageGuild_permission_is_allowed_for_write()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a", permissions: ManageGuildPermission));
        Assert.True(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: true));
    }

    [Fact]
    public void Member_without_admin_permissions_is_denied_for_write()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a", permissions: 0));
        Assert.False(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: true));
    }

    [Fact]
    public void Member_read_allowed_but_write_denied_without_admin()
    {
        var svc = CreateService();
        var user = User(rateLimitHit: false, Guild("guild-a", permissions: 0));
        Assert.True(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: false));
        Assert.False(svc.HasGuildPermission(user, "guild-a", requireAdminPermission: true));
    }
}
