using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReminderController : ControllerBase
{
    private readonly IReminderService _reminderService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public ReminderController(
        IReminderService reminderService,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _reminderService = reminderService;
        _discordAuthService = discordAuthService;
        _botGuildAuthorization = botGuildAuthorization;
        _quota = quota;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    private async Task<ActionResult?> EnsureReminderGuildReadAsync(string guildId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, guildId))
                return Forbid();
            return null;
        }

        if (HttpContext.Items["DiscordUserInfo"] is DiscordUserInfo cachedUser)
        {
            if (!_discordAuthService.HasGuildPermission(cachedUser, guildId, false)) return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, guildId, false)) return Forbid();
        return null;
    }

    /// <summary>
    ///     Guild ID ile reminder'ları getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<ReminderDto>>> GetRemindersByGuildId(string guildId)
    {
        var reminders = await _reminderService.GetRemindersByGuildIdAsync(guildId);
        return Ok(reminders);
    }

    /// <summary>
    ///     User ID ile reminder'ları getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/user/{userId}")]
    public async Task<ActionResult<List<ReminderDto>>> GetRemindersByUserId(string guildId, string userId)
    {
        var reminders = await _reminderService.GetRemindersByUserIdAsync(guildId, userId);
        return Ok(reminders);
    }

    /// <summary>
    ///     Gönderilmemiş ve zamanı gelmiş reminder'ları getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("pending")]
    public async Task<ActionResult<List<ReminderDto>>> GetPendingReminders()
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(await _reminderService.GetPendingRemindersAsync());

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var guildIds = userInfo.Guilds.Select(g => g.Id).ToList();
        var filtered = await _reminderService.GetPendingRemindersForGuildIdsAsync(guildIds);
        return Ok(filtered);
    }

    /// <summary>
    ///     Yeni reminder oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<ReminderDto>> CreateReminder([FromBody] CreateReminderDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = await _reminderService.GetReminderCountByGuildIdAsync(createDto.GuildId);
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.Reminder, current);
        }

        var reminder = await _reminderService.CreateReminderAsync(createDto);
        return Ok(reminder);
    }

    /// <summary>
    ///     Reminder günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<ReminderDto>> UpdateReminder(string guildId, int id, [FromBody] UpdateReminderDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _reminderService.GetReminderByIdAsync(id);
        if (existing == null) return NotFound($"Reminder bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var reminder = await _reminderService.UpdateReminderAsync(id, updateDto);
        if (reminder == null)
            return NotFound($"Reminder bulunamadı (Id: {id})");

        return Ok(reminder);
    }

    /// <summary>
    ///     Reminder'ı gönderildi olarak işaretler
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/{id}/mark-sent")]
    public async Task<IActionResult> MarkReminderAsSent(string guildId, int id)
    {
        var existing = await _reminderService.GetReminderByIdAsync(id);
        if (existing == null) return NotFound($"Reminder bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _reminderService.MarkReminderAsSentAsync(id);
        if (!result)
            return NotFound($"Reminder bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Reminder siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> DeleteReminder(string guildId, int id)
    {
        var existing = await _reminderService.GetReminderByIdAsync(id);
        if (existing == null) return NotFound($"Reminder bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _reminderService.DeleteReminderAsync(id);
        if (!result)
            return NotFound($"Reminder bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     ID ile reminder getirir
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet("{id}")]
    public async Task<ActionResult<ReminderDto>> GetReminderById(int id)
    {
        var reminder = await _reminderService.GetReminderByIdAsync(id);
        if (reminder == null)
            return NotFound($"Reminder bulunamadı (Id: {id})");

        var denied = await EnsureReminderGuildReadAsync(reminder.GuildId);
        if (denied != null) return denied;

        return Ok(reminder);
    }
}