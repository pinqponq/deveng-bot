using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LevelController : ControllerBase
{
    private readonly ILevelService _levelService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly ILogger<LevelController> _logger;

    public LevelController(ILevelService levelService, IDiscordAuthService discordAuthService, ILogger<LevelController> logger)
    {
        _levelService = levelService;
        _discordAuthService = discordAuthService;
        _logger = logger;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    /// <summary>
    ///     Guild ID ile level ayarlarını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<LevelDto>> GetByGuildId(string guildId)
    {
        var level = await _levelService.GetLevelByGuildIdAsync(guildId);
        if (level == null)
            return NotFound(new { message = $"Level ayarları bulunamadı (GuildId: {guildId})" });

        return Ok(level);
    }

    /// <summary>
    ///     Yeni level ayarları oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<LevelDto>> CreateOrUpdate(string guildId, [FromBody] CreateLevelDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var level = await _levelService.CreateOrUpdateLevelAsync(guildId, createDto);
        return Ok(level);
    }

    /// <summary>
    ///     Level ayarlarını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<LevelDto>> Update(string guildId, [FromBody] UpdateLevelDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var level = await _levelService.UpdateLevelAsync(guildId, updateDto);
        if (level == null)
            return NotFound($"Level ayarları bulunamadı (GuildId: {guildId})");

        return Ok(level);
    }

    /// <summary>
    ///     Level ayarlarını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var result = await _levelService.DeleteLevelAsync(guildId);
        if (!result)
            return NotFound($"Level ayarları bulunamadı (GuildId: {guildId})");

        return NoContent();
    }

    /// <summary>
    ///     Kullanıcının level bilgilerini getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/user/{userId}")]
    public async Task<ActionResult<UserLevelDto>> GetUserLevel(string guildId, string userId)
    {
        var userLevel = await _levelService.GetUserLevelAsync(guildId, userId);
        if (userLevel == null)
            return NotFound($"Kullanıcı level bilgisi bulunamadı (GuildId: {guildId}, UserId: {userId})");
        return Ok(userLevel);
    }

    /// <summary>
    ///     Guild'deki tüm kullanıcı level bilgilerini getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/users")]
    public async Task<ActionResult<List<UserLevelDto>>> GetUserLevels(string guildId, [FromQuery] int? limit = null)
    {
        var safe = PagingGuard.ClampLimit(limit, @default: 100, max: 500);
        var userLevels = await _levelService.GetUserLevelsByGuildIdAsync(guildId, safe);
        return Ok(userLevels);
    }

    /// <summary>
    ///     Leaderboard'u getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/leaderboard")]
    public async Task<ActionResult<List<UserLevelDto>>> GetLeaderboard(string guildId, [FromQuery] int limit = 10)
    {
        var safe = PagingGuard.ClampLimit(limit, @default: 10, max: 100);
        var leaderboard = await _levelService.GetLeaderboardAsync(guildId, safe);
        return Ok(leaderboard);
    }

    /// <summary>
    ///     Kullanıcıya XP ekler (bot tarafından kullanılır)
    /// </summary>
    [DiscordAuth(false)]
    [HttpPost("guild/{guildId}/user/{userId}/add-xp")]
    public async Task<ActionResult<UserLevelDto>> AddXp(string guildId, string userId, [FromBody] AddXpDto addXpDto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var token = GetBearerToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized();
            var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
            if (userInfo == null) return Unauthorized();
            if (!_discordAuthService.HasGuildPermission(userInfo, guildId, true)) return Forbid();
        }

        var userLevel = await _levelService.AddXpToUserAsync(guildId, userId, addXpDto.Xp);
        return Ok(userLevel);
    }
}

public class AddXpDto
{
    public int Xp { get; set; }
}
