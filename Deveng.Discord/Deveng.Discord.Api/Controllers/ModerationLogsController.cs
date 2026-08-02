using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModerationLogsController : ControllerBase
{
    private readonly IModerationLogService _moderationLogService;

    public ModerationLogsController(IModerationLogService moderationLogService)
    {
        _moderationLogService = moderationLogService;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<ModerationActionLogDto>>> Query(string guildId, [FromQuery] ModerationLogQueryDto query)
    {
        var logs = await _moderationLogService.QueryAsync(guildId, query);
        return Ok(logs);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/{id:long}")]
    public async Task<ActionResult<ModerationActionLogDto>> GetById(string guildId, long id)
    {
        var log = await _moderationLogService.GetByIdAsync(guildId, id);
        if (log == null) return NotFound(new { message = "Moderasyon kaydı bulunamadı." });
        return Ok(log);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/bot-action")]
    public async Task<ActionResult<ModerationActionLogDto>> CreateBotAction(string guildId, [FromBody] CreateModerationActionLogDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        dto.GuildId = guildId;
        var log = await _moderationLogService.CreateActionLogAsync(dto);
        return Ok(log);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/bot-notice")]
    public async Task<ActionResult<ModerationUserNoticeDto>> CreateBotNotice(string guildId, [FromBody] CreateModerationUserNoticeDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        dto.GuildId = guildId;
        var notice = await _moderationLogService.CreateUserNoticeAsync(dto);
        return Ok(notice);
    }
}
