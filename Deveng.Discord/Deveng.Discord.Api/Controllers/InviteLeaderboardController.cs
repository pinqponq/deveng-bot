using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InviteLeaderboardController : ControllerBase
{
    private readonly IInviteLeaderboardService _service;

    public InviteLeaderboardController(IInviteLeaderboardService service)
    {
        _service = service;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/leaderboard")]
    public async Task<ActionResult<List<GuildInviteLeaderboardEntryDto>>> GetLeaderboard(
        string guildId,
        [FromQuery] string periodKey = "all",
        [FromQuery] int limit = 50)
    {
        // periodKey allowlist: enum bypass yerine bilinen değerleri kabul et
        var safePeriod = periodKey switch
        {
            "all" or "daily" or "weekly" or "monthly" => periodKey,
            _ => "all"
        };
        var safeLimit = PagingGuard.ClampLimit(limit, @default: 50, max: 200);
        return Ok(await _service.GetLeaderboardAsync(guildId, safePeriod, safeLimit));
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/contributions")]
    public async Task<ActionResult<List<GuildInviteContributionDto>>> GetContributions(string guildId, [FromQuery] int limit = 100)
    {
        var safeLimit = PagingGuard.ClampLimit(limit, @default: 100, max: 500);
        return Ok(await _service.GetContributionsAsync(guildId, safeLimit));
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/snapshots")]
    public async Task<ActionResult<List<GuildInviteSnapshotDto>>> GetSnapshots(string guildId)
    {
        return Ok(await _service.GetSnapshotsAsync(guildId));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/snapshots")]
    public async Task<IActionResult> UpsertSnapshot(string guildId, [FromBody] UpsertGuildInviteSnapshotDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _service.UpsertSnapshotAsync(guildId, dto);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/contributions")]
    public async Task<IActionResult> RecordContribution(string guildId, [FromBody] RecordGuildInviteContributionDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _service.RecordContributionAsync(guildId, dto);
        return NoContent();
    }
}
