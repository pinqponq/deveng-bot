using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuildAnalyticsController : ControllerBase
{
    private readonly IGuildAnalyticsService _guildAnalytics;
    private readonly IDiscordAuthService _discordAuthService;

    public GuildAnalyticsController(IGuildAnalyticsService guildAnalytics, IDiscordAuthService discordAuthService)
    {
        _guildAnalytics = guildAnalytics;
        _discordAuthService = discordAuthService;
    }

    /// <summary>Sunucu özeti: üye sayısı (Discord), join/leave, davet, moderasyon, aktivite günleri, talepler.</summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/summary")]
    public async Task<ActionResult<GuildAnalyticsSummaryDto>> GetSummary(
        string guildId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] bool includeMyUnreadTickets = false,
        CancellationToken cancellationToken = default)
    {
        var to = toUtc ?? DateTime.UtcNow;
        var from = fromUtc ?? to.AddDays(-30);
        string? staffId = null;
        if (includeMyUnreadTickets)
        {
            var token = Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(token) || !token.StartsWith("Bearer ", StringComparison.Ordinal))
                return Unauthorized();
            var userInfo = await _discordAuthService.ValidateTokenAsync(token["Bearer ".Length..].Trim(), true);
            if (userInfo == null) return Unauthorized();
            if (!_discordAuthService.HasGuildPermission(userInfo, guildId, true)) return Forbid();
            staffId = userInfo.UserId;
        }

        var summary = await _guildAnalytics.GetSummaryAsync(guildId, from, to, staffId, cancellationToken);
        return Ok(summary);
    }
}
