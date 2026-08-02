using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PanelAuditLogController : ControllerBase
{
    private readonly IPanelAuditLogService _panelAuditLogService;

    public PanelAuditLogController(IPanelAuditLogService panelAuditLogService)
    {
        _panelAuditLogService = panelAuditLogService;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<PanelAuditLogDto>>> Query(string guildId, [FromQuery] PanelAuditLogQueryDto query)
    {
        var logs = await _panelAuditLogService.QueryAsync(guildId, query);
        return Ok(logs);
    }
}
