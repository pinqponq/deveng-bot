using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AIModerationController : ControllerBase
{
    private readonly IAIModerationService _aiModerationService;
    private readonly IPanelAuditLogService _panelAuditLogService;

    public AIModerationController(
        IAIModerationService aiModerationService,
        IPanelAuditLogService panelAuditLogService)
    {
        _aiModerationService = aiModerationService;
        _panelAuditLogService = panelAuditLogService;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/settings")]
    public async Task<ActionResult<AIModerationSettingDto>> GetSettings(string guildId)
    {
        var settings = await _aiModerationService.GetSettingsAsync(guildId);
        if (settings == null) return NotFound(new { message = "AI moderasyon ayarı bulunamadı." });
        return Ok(settings);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/settings")]
    public async Task<ActionResult<AIModerationSettingDto>> UpsertSettings(
        string guildId,
        [FromBody] UpsertAIModerationSettingDto dto)
    {
        var before = await _aiModerationService.GetSettingsAsync(guildId);
        var settings = await _aiModerationService.UpsertSettingsAsync(guildId, dto);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "ai_moderation.settings.upsert", "AIModerationSetting", guildId, before, settings));
        return Ok(settings);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/policies")]
    public async Task<ActionResult<List<AIModerationPolicyDto>>> GetPolicies(string guildId)
    {
        var policies = await _aiModerationService.GetPoliciesAsync(guildId);
        return Ok(policies);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/policies/{category}")]
    public async Task<ActionResult<AIModerationPolicyDto>> UpsertPolicy(
        string guildId,
        string category,
        [FromBody] UpsertAIModerationPolicyDto dto)
    {
        dto.Category = category;
        var before = (await _aiModerationService.GetPoliciesAsync(guildId))
            .FirstOrDefault(p => string.Equals(p.Category, category, StringComparison.OrdinalIgnoreCase));
        var policy = await _aiModerationService.UpsertPolicyAsync(guildId, dto);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "ai_moderation.policy.upsert", "AIModerationPolicy", category, before, policy));
        return Ok(policy);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/queue")]
    public async Task<ActionResult<object>> Enqueue(string guildId, [FromBody] CreateAIModerationQueueDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        dto.GuildId = guildId;
        var id = await _aiModerationService.EnqueueAsync(dto);
        return Ok(new { id });
    }

    [DiscordAuth]
    [HttpGet("queue/pending")]
    public async Task<ActionResult<List<AIModerationQueueItemDto>>> GetPendingQueue([FromQuery] int batchSize = 25)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        var safe = PagingGuard.ClampLimit(batchSize, @default: 25, max: 100);
        var list = await _aiModerationService.GetPendingQueueAsync(safe);
        return Ok(list);
    }

    [DiscordAuth]
    [HttpPost("queue/{queueId:long}/complete")]
    public async Task<IActionResult> CompleteQueueItem(long queueId, [FromBody] CompleteAIModerationQueueWorkerDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _aiModerationService.CompleteQueueWithReviewAsync(queueId, dto);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("queue/{queueId:long}/fail")]
    public async Task<IActionResult> FailQueueItem(long queueId, [FromBody] FailAIModerationQueueRequest? body)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _aiModerationService.FailQueueItemAsync(queueId, body?.ErrorCode ?? "unknown");
        return NoContent();
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/reviews")]
    public async Task<ActionResult<List<AIModerationReviewDto>>> GetReviews(string guildId, [FromQuery] int limit = 100)
    {
        var safe = PagingGuard.ClampLimit(limit, @default: 100, max: 500);
        var reviews = await _aiModerationService.GetReviewsAsync(guildId, safe);
        return Ok(reviews);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/reviews/{reviewId:long}/decision")]
    public async Task<IActionResult> SetReviewDecision(string guildId, long reviewId, [FromBody] ReviewDecisionRequest request)
    {
        var ok = await _aiModerationService.SetReviewDecisionAsync(guildId, reviewId, request.Decision);
        if (!ok) return NotFound(new { message = "AI moderasyon inceleme kaydı bulunamadı." });
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "ai_moderation.review.decision", "AIModerationReview", reviewId.ToString(), null, request));
        return NoContent();
    }

    private CreatePanelAuditLogDto CreateAudit(
        string guildId,
        string action,
        string resourceType,
        string? resourceId,
        object? before,
        object? after)
    {
        return new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Before = before,
            After = after,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        };
    }
}

public class ReviewDecisionRequest
{
    public string Decision { get; set; } = "dismissed";
}

public class FailAIModerationQueueRequest
{
    public string? ErrorCode { get; set; }
}
