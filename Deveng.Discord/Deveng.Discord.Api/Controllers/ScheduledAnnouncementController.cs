using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduledAnnouncementController : ControllerBase
{
    private readonly IScheduledAnnouncementService _service;
    private readonly IQuotaService _quota;

    public ScheduledAnnouncementController(IScheduledAnnouncementService service, IQuotaService quota)
    {
        _service = service;
        _quota = quota;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<ScheduledAnnouncementDto>>> GetByGuild(string guildId)
    {
        return Ok(await _service.GetByGuildIdAsync(guildId));
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/runs")]
    public async Task<ActionResult<List<ScheduledAnnouncementRunDto>>> GetRuns(string guildId)
    {
        return Ok(await _service.GetRunsAsync(guildId, 100));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<ScheduledAnnouncementDto>> Upsert(string guildId, [FromBody] UpsertScheduledAnnouncementDto dto)
    {
        if (!dto.Id.HasValue && HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _service.GetByGuildIdAsync(guildId)).Count;
            await _quota.EnforceQuotaAsync(guildId, FeatureQuota.ScheduledAnnouncement, current);
        }
        return Ok(await _service.UpsertAsync(guildId, HttpContext.Items["DiscordUserId"]?.ToString(), dto));
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id:long}")]
    public async Task<IActionResult> Delete(string guildId, long id)
    {
        await _service.DeleteAsync(guildId, id);
        return NoContent();
    }

    [DiscordAuth]
    [HttpGet("pending")]
    public async Task<ActionResult<List<ScheduledAnnouncementDto>>> GetPending([FromQuery] int batchSize = 50)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        return Ok(await _service.GetPendingAsync(batchSize));
    }

    [DiscordAuth]
    [HttpPost("{announcementId:long}/run")]
    public async Task<IActionResult> MarkRun(long announcementId, [FromBody] MarkScheduledAnnouncementRunDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _service.MarkRunAsync(announcementId, dto);
        return NoContent();
    }
}
