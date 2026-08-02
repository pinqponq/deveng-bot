using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

/// <summary>Bot tarafından doldurulan telemetri uçları (HMAC + X-Bot-Token).</summary>
[ApiController]
[Route("api/[controller]")]
public class GuildAnalyticsIngestController : ControllerBase
{
    private readonly IGuildAnalyticsIngestService _ingest;

    public GuildAnalyticsIngestController(IGuildAnalyticsIngestService ingest)
    {
        _ingest = ingest;
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/member-event")]
    public async Task<IActionResult> RecordMemberEvent(string guildId, [FromBody] RecordGuildMemberEventDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ingest.RecordMemberEventAsync(guildId, dto);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/activity-day")]
    public async Task<IActionResult> MergeActivityDay(string guildId, [FromBody] MergeGuildUserActivityDayDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ingest.MergeUserActivityDayAsync(guildId, dto);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/ticket-last-message")]
    public async Task<IActionResult> TryTicketLastMessage(string guildId, [FromBody] TryUpdateTicketLastMessageDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ingest.TryUpdateTicketLastMessageAsync(guildId, dto);
        return NoContent();
    }
}
