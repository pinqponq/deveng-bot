using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReminderSettingsController : ControllerBase
{
    private readonly IReminderSettingsService _reminderSettingsService;

    public ReminderSettingsController(IReminderSettingsService reminderSettingsService)
    {
        _reminderSettingsService = reminderSettingsService;
    }

    /// <summary>
    ///     Guild ID'ye göre reminder settings'i getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<ReminderSettingsDto?>> GetByGuildId(string guildId)
    {
        var settings = await _reminderSettingsService.GetReminderSettingsByGuildIdAsync(guildId);
        if (settings == null)
            return Ok(null);

        return Ok(settings);
    }

    /// <summary>
    ///     Reminder settings oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<ReminderSettingsDto>> CreateOrUpdate(string guildId,
        [FromBody] CreateOrUpdateReminderSettingsDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var settings = await _reminderSettingsService.CreateOrUpdateReminderSettingsAsync(guildId, dto);
        return Ok(settings);
    }
}