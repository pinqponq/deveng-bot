using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AutoRoleController : ControllerBase
{
    private readonly IAutoRoleService _autoRoleService;
    private readonly IPanelAuditLogService _panelAuditLogService;

    public AutoRoleController(IAutoRoleService autoRoleService, IPanelAuditLogService panelAuditLogService)
    {
        _autoRoleService = autoRoleService;
        _panelAuditLogService = panelAuditLogService;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<AutoRoleDto>> Get(string guildId)
    {
        var config = await _autoRoleService.GetByGuildIdAsync(guildId);
        if (config == null) return NotFound(new { message = "Otomatik rol ayarı bulunamadı." });
        return Ok(config);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/audit")]
    public async Task<ActionResult<List<AutoRoleAuditLogDto>>> GetAudit(string guildId, [FromQuery] int take = 100)
    {
        return Ok(await _autoRoleService.GetAuditAsync(guildId, take));
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<AutoRoleDto>> Upsert(string guildId, [FromBody] UpsertAutoRoleDto dto)
    {
        var before = await _autoRoleService.GetByGuildIdAsync(guildId);
        var saved = await _autoRoleService.UpsertAsync(guildId, dto);
        await _panelAuditLogService.CreateAsync(new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = "autorole.upsert",
            ResourceType = "AutoRole",
            ResourceId = guildId,
            Before = before,
            After = saved,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        });
        return Ok(saved);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/audit")]
    public async Task<IActionResult> InsertAudit(string guildId, [FromBody] AutoRoleAuditDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        dto.GuildId = guildId;
        await _autoRoleService.InsertAuditAsync(dto);
        return NoContent();
    }
}
