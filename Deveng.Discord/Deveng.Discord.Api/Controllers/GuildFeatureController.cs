using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuildFeatureController : ControllerBase
{
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly IEmbedMessageService _embedMessageService;
    private readonly ILogChannelService _logChannelService;
    private readonly IMusicService _musicService;
    private readonly IPanelAuditLogService _panelAuditLogService;
    private readonly ILogger<GuildFeatureController> _logger;

    public GuildFeatureController(
        IGuildFeatureService guildFeatureService,
        IEmbedMessageService embedMessageService,
        ILogChannelService logChannelService,
        IMusicService musicService,
        IPanelAuditLogService panelAuditLogService,
        ILogger<GuildFeatureController> logger)
    {
        _guildFeatureService = guildFeatureService;
        _embedMessageService = embedMessageService;
        _logChannelService = logChannelService;
        _musicService = musicService;
        _panelAuditLogService = panelAuditLogService;
        _logger = logger;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<GuildFeatureStatusDto>>> GetGuildFeatures(string guildId)
    {
        var features = await _guildFeatureService.GetGuildFeaturesAsync(guildId);
        return Ok(features);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/feature/{featureName}")]
    public async Task<ActionResult<GuildFeatureDto>> GetGuildFeature(string guildId, string featureName)
    {
        var feature = await _guildFeatureService.GetGuildFeatureAsync(guildId, featureName);
        if (feature == null)
            return NotFound($"Feature kaydı bulunamadı (GuildId: {guildId}, FeatureName: {featureName})");

        return Ok(feature);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/feature/{featureName}/enable")]
    public async Task<ActionResult<GuildFeatureDto>> EnableFeature(string guildId, string featureName)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var before = await _guildFeatureService.GetGuildFeatureAsync(guildId, featureName);
        var feature = await _guildFeatureService.EnableGuildFeatureAsync(guildId, featureName);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "feature.enable", "GuildFeature", featureName, before, feature));
        sw.Stop();
        if (sw.ElapsedMilliseconds > 5000)
            _logger.LogWarning("[GuildFeature] Enable {Feature} guild {GuildId} yavas tamamlandi: {Ms}ms", featureName, guildId, sw.ElapsedMilliseconds);
        else
            _logger.LogInformation("[GuildFeature] Enable {Feature} guild {GuildId} tamamlandi: {Ms}ms", featureName, guildId, sw.ElapsedMilliseconds);
        return Ok(feature);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/feature/{featureName}/disable")]
    public async Task<ActionResult<GuildFeatureDto>> DisableFeature(string guildId, string featureName)
    {
        var before = await _guildFeatureService.GetGuildFeatureAsync(guildId, featureName);
        if (string.Equals(featureName, "EmbedMessage", StringComparison.OrdinalIgnoreCase))
            await _embedMessageService.DeleteAllByGuildIdAsync(guildId);

        if (string.Equals(featureName, "LogChannel", StringComparison.OrdinalIgnoreCase))
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            await _logChannelService.DeleteLogChannelAsync(guildId, botClientId);
        }

        if (string.Equals(featureName, "Music", StringComparison.OrdinalIgnoreCase))
            await _musicService.CleanupGuildAsync(guildId);

        var feature = await _guildFeatureService.DisableGuildFeatureAsync(guildId, featureName);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "feature.disable", "GuildFeature", featureName, before, feature));
        return Ok(feature);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/enabled")]
    public async Task<ActionResult<List<string>>> GetEnabledFeatures(string guildId)
    {
        var features = await _guildFeatureService.GetEnabledFeaturesForGuildAsync(guildId);
        return Ok(features);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/feature/{featureName}/status")]
    public async Task<ActionResult<bool>> IsFeatureEnabled(string guildId, string featureName)
    {
        var isEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, featureName);
        return Ok(new { isEnabled });
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