using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocaleController : ControllerBase
{
    private readonly ILocaleService _localeService;
    private readonly IPanelAuditLogService _panelAuditLogService;

    public LocaleController(ILocaleService localeService, IPanelAuditLogService panelAuditLogService)
    {
        _localeService = localeService;
        _panelAuditLogService = panelAuditLogService;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<GuildLocaleDto>> Get(string guildId)
    {
        var locale = await _localeService.GetAsync(guildId);
        return Ok(locale ?? new GuildLocaleDto { GuildId = guildId });
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<GuildLocaleDto>> Upsert(string guildId, [FromBody] UpsertGuildLocaleDto dto)
    {
        var before = await _localeService.GetAsync(guildId);
        var saved = await _localeService.UpsertAsync(guildId, dto);
        await _panelAuditLogService.CreateAsync(new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = "locale.upsert",
            ResourceType = "GuildLocaleSetting",
            ResourceId = guildId,
            Before = before,
            After = saved,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        });
        return Ok(saved);
    }
}
