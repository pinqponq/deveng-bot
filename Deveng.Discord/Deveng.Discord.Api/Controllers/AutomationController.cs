using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AutomationController : ControllerBase
{
    private readonly IAutomationService _automationService;

    public AutomationController(IAutomationService automationService)
    {
        _automationService = automationService;
    }

    /// <summary>Sunucudaki tüm otomasyon kurallarını döner (panel veya bot token).</summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<GuildAutomationDto>>> GetByGuildId(string guildId)
    {
        var list = await _automationService.GetByGuildIdAsync(guildId);
        return Ok(list);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/{id:int}")]
    public async Task<ActionResult<GuildAutomationDto>> GetById(string guildId, int id)
    {
        var row = await _automationService.GetByIdAsync(id);
        if (row == null || row.GuildId != guildId)
            return NotFound();
        return Ok(row);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<GuildAutomationDto>> Create(string guildId, [FromBody] CreateGuildAutomationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var created = await _automationService.CreateAsync(guildId, dto);
        return Ok(created);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id:int}")]
    public async Task<ActionResult<GuildAutomationDto>> Update(string guildId, int id,
        [FromBody] UpdateGuildAutomationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var updated = await _automationService.UpdateAsync(guildId, id, dto);
        if (updated == null)
            return NotFound();
        return Ok(updated);
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id:int}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var ok = await _automationService.DeleteAsync(guildId, id);
        if (!ok)
            return NotFound();
        return NoContent();
    }
}
