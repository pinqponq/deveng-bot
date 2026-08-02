using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BirthdayController : ControllerBase
{
    private readonly IBirthdayService _birthdayService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;

    public BirthdayController(
        IBirthdayService birthdayService,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization)
    {
        _birthdayService = birthdayService;
        _discordAuthService = discordAuthService;
        _botGuildAuthorization = botGuildAuthorization;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    private async Task<ActionResult?> EnsureGuildResourceAccessAsync(string guildId, bool requireAdmin)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, guildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, guildId, requireAdmin)) return Forbid();
        return null;
    }

    /// <summary>
    ///     Guild ID ile birthday settings getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("settings/guild/{guildId}")]
    public async Task<ActionResult<BirthdaySettingsDto>> GetSettingsByGuildId(string guildId)
    {
        var settings = await _birthdayService.GetBirthdaySettingsByGuildIdAsync(guildId);
        if (settings == null)
            return NotFound($"Birthday settings bulunamadı (GuildId: {guildId})");

        return Ok(settings);
    }

    /// <summary>
    ///     Yeni birthday settings oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("settings")]
    public async Task<ActionResult<BirthdaySettingsDto>> CreateOrUpdateSettings(
        [FromBody] CreateBirthdaySettingsDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var settings = await _birthdayService.CreateOrUpdateBirthdaySettingsAsync(createDto.GuildId, createDto);
        return Ok(settings);
    }

    /// <summary>
    ///     Birthday settings günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("settings/guild/{guildId}")]
    public async Task<ActionResult<BirthdaySettingsDto>> UpdateSettings(string guildId,
        [FromBody] UpdateBirthdaySettingsDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var settings = await _birthdayService.UpdateBirthdaySettingsAsync(guildId, updateDto);
        if (settings == null)
            return NotFound($"Birthday settings bulunamadı (GuildId: {guildId})");

        return Ok(settings);
    }

    /// <summary>
    ///     Birthday settings siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("settings/guild/{guildId}")]
    public async Task<IActionResult> DeleteSettings(string guildId)
    {
        var result = await _birthdayService.DeleteBirthdaySettingsAsync(guildId);
        if (!result)
            return NotFound($"Birthday settings bulunamadı (GuildId: {guildId})");

        return NoContent();
    }

    /// <summary>
    ///     Guild ID ile birthday users getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("users/guild/{guildId}")]
    public async Task<ActionResult<List<BirthdayUserDto>>> GetUsersByGuildId(string guildId)
    {
        var users = await _birthdayService.GetBirthdayUsersByGuildIdAsync(guildId);
        return Ok(users);
    }

    /// <summary>
    ///     Tarih ile birthday users getirir (bugün doğum günü olanlar)
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("users/date/{month}/{day}")]
    public async Task<ActionResult<List<BirthdayUserDto>>> GetUsersByDate(int month, int day)
    {
        var users = await _birthdayService.GetBirthdayUsersByDateAsync(month, day);
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(users);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(users.Where(u => allowed.Contains(u.GuildId)).ToList());
    }

    /// <summary>
    ///     Yeni birthday user oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("users")]
    public async Task<ActionResult<BirthdayUserDto>> CreateOrUpdateUser([FromBody] CreateBirthdayUserDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _birthdayService.CreateOrUpdateBirthdayUserAsync(createDto.GuildId, createDto);
        return Ok(user);
    }

    /// <summary>
    ///     Birthday user günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("users/guild/{guildId}/{id}")]
    public async Task<ActionResult<BirthdayUserDto>> UpdateUser(string guildId, int id, [FromBody] UpdateBirthdayUserDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _birthdayService.GetBirthdayUserByIdAsync(id);
        if (existing == null) return NotFound($"Birthday user bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var user = await _birthdayService.UpdateBirthdayUserAsync(id, updateDto);
        if (user == null)
            return NotFound($"Birthday user bulunamadı (Id: {id})");

        return Ok(user);
    }

    /// <summary>
    ///     Birthday user siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("users/guild/{guildId}/user/{userId}")]
    public async Task<IActionResult> DeleteUser(string guildId, string userId)
    {
        var result = await _birthdayService.DeleteBirthdayUserAsync(guildId, userId);
        if (!result)
            return NotFound($"Birthday user bulunamadı (GuildId: {guildId}, UserId: {userId})");

        return NoContent();
    }

    /// <summary>
    ///     Doğum günü kutlandı olarak işaretler (bu yıl tekrar mesaj gitmez)
    /// </summary>
    [DiscordAuth(false)]
    [HttpPost("users/guild/{guildId}/user/{userId}/mark-celebrated")]
    public async Task<IActionResult> MarkUserCelebrated(string guildId, string userId)
    {
        await _birthdayService.MarkBirthdayUserCelebratedAsync(guildId, userId);
        return NoContent();
    }

    /// <summary>
    ///     ID ile birthday user getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("users/{id}")]
    public async Task<ActionResult<BirthdayUserDto>> GetUserById(int id)
    {
        var user = await _birthdayService.GetBirthdayUserByIdAsync(id);
        if (user == null)
            return NotFound($"Birthday user bulunamadı (Id: {id})");

        var denied = await EnsureGuildResourceAccessAsync(user.GuildId, false);
        if (denied != null) return denied;

        return Ok(user);
    }
}