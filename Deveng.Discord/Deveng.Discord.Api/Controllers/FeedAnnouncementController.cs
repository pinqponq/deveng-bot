using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeedAnnouncementController : ControllerBase
{
    private readonly IFeedAnnouncementService _feedService;
    private readonly IPanelAuditLogService _panelAuditLogService;
    private readonly IQuotaService _quota;

    public FeedAnnouncementController(IFeedAnnouncementService feedService, IPanelAuditLogService panelAuditLogService, IQuotaService quota)
    {
        _feedService = feedService;
        _panelAuditLogService = panelAuditLogService;
        _quota = quota;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<FeedSubscriptionDto>>> GetByGuild(string guildId)
    {
        return Ok(await _feedService.GetByGuildIdAsync(guildId));
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/deliveries")]
    public async Task<ActionResult<List<FeedDeliveryDto>>> GetDeliveries(string guildId, [FromQuery] int take = 100)
    {
        return Ok(await _feedService.GetDeliveriesAsync(guildId, take));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/preview")]
    public async Task<ActionResult<FeedPreviewDto>> Preview(string guildId, [FromBody] FeedPreviewRequestDto dto)
    {
        return Ok(await _feedService.PreviewAsync(dto.Url));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<FeedSubscriptionDto>> Upsert(string guildId, [FromBody] UpsertFeedSubscriptionDto dto)
    {
        var before = dto.Id.HasValue ? await _feedService.GetByIdAsync(dto.Id.Value) : null;
        if (!dto.Id.HasValue && HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _feedService.GetByGuildIdAsync(guildId)).Count;
            await _quota.EnforceQuotaAsync(guildId, FeatureQuota.FeedSubscription, current);
        }
        var saved = await _feedService.UpsertAsync(guildId, dto);
        await _panelAuditLogService.CreateAsync(new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = dto.Id.HasValue ? "feed.update" : "feed.create",
            ResourceType = "FeedSubscription",
            ResourceId = saved.Id.ToString(),
            Before = before,
            After = saved,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        });
        return Ok(saved);
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id:long}")]
    public async Task<IActionResult> Delete(string guildId, long id)
    {
        var before = await _feedService.GetByIdAsync(id);
        await _feedService.DeleteAsync(guildId, id);
        await _panelAuditLogService.CreateAsync(new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = "feed.delete",
            ResourceType = "FeedSubscription",
            ResourceId = id.ToString(),
            Before = before,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        });
        return NoContent();
    }

    [DiscordAuth]
    [HttpGet("due")]
    public async Task<ActionResult<List<FeedSubscriptionDto>>> GetDue([FromQuery] int batchSize = 50)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        return Ok(await _feedService.GetDueAsync(batchSize));
    }

    [DiscordAuth]
    [HttpPost("{subscriptionId:long}/delivery")]
    public async Task<IActionResult> RecordDelivery(long subscriptionId, [FromBody] RecordFeedDeliveryDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _feedService.RecordDeliveryAsync(subscriptionId, dto);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("{subscriptionId:long}/error")]
    public async Task<IActionResult> RecordError(long subscriptionId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _feedService.RecordErrorAsync(subscriptionId);
        return NoContent();
    }
}
