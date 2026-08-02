using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogChannelController : ControllerBase
{
    private readonly ILogChannelService _logChannelService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IQuotaService _quota;

    public LogChannelController(
        ILogChannelService logChannelService,
        IDiscordAuthService discordAuthService,
        IQuotaService quota)
    {
        _logChannelService = logChannelService;
        _discordAuthService = discordAuthService;
        _quota = quota;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    /// <summary>
    ///     Tüm log channel kayıtlarını getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<LogChannelDto>>> GetAll()
    {
        var logChannels = await _logChannelService.GetAllLogChannelsAsync();
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(logChannels);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(logChannels.Where(c => allowed.Contains(c.GuildId)).ToList());
    }

    /// <summary>
    ///     Guild ID ile log channel kaydını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<LogChannelDto>> GetByGuildId(string guildId)
    {
        var logChannel = await _logChannelService.GetLogChannelByGuildIdAsync(guildId);
        if (logChannel == null)
            return NotFound($"LogChannel kaydı bulunamadı (GuildId: {guildId})");

        return Ok(logChannel);
    }

    /// <summary>
    ///     Guild ID ile log channel türlerini getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/types")]
    public async Task<ActionResult<List<LogChannelTypeDto>>> GetTypesByGuildId(string guildId)
    {
        var types = await _logChannelService.GetLogChannelTypesByGuildIdAsync(guildId);
        return Ok(types);
    }

    /// <summary>
    ///     Guild ID ve Log Type ile tek bir log channel türünü getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/types/{logType}")]
    public async Task<ActionResult<LogChannelTypeDto>> GetTypeByGuildIdAndType(string guildId, string logType)
    {
        var logChannelType = await _logChannelService.GetLogChannelTypeByGuildIdAndTypeAsync(guildId, logType);
        if (logChannelType == null)
            return NotFound($"LogChannelType kaydı bulunamadı (GuildId: {guildId}, LogType: {logType})");

        return Ok(logChannelType);
    }

    /// <summary>
    ///     Yeni log channel kaydı oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<LogChannelDto>> Create([FromBody] CreateLogChannelDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var existing = await _logChannelService.GetLogChannelByGuildIdAsync(createDto.GuildId);
            var current = existing != null ? 1 : 0;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.LogChannel, current);
        }

        var logChannel = await _logChannelService.CreateLogChannelAsync(createDto);
        return CreatedAtAction(nameof(GetByGuildId), new { guildId = logChannel.GuildId }, logChannel);
    }

    /// <summary>
    ///     Log channel kaydını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<LogChannelDto>> Update(string guildId, [FromBody] UpdateLogChannelDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var logChannel = await _logChannelService.UpdateLogChannelAsync(guildId, updateDto);
        if (logChannel == null)
            return NotFound($"LogChannel kaydı bulunamadı (GuildId: {guildId})");

        return Ok(logChannel);
    }

    /// <summary>
    ///     Log channel kaydını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var botClientId = HttpContext.Items["BotClientId"]?.ToString();
        var result = await _logChannelService.DeleteLogChannelAsync(guildId, botClientId);
        if (!result)
            return NotFound($"LogChannel kaydı bulunamadı (GuildId: {guildId})");

        return NoContent();
    }

    /// <summary>
    ///     Log channel türü ekler
    /// </summary>
    [DiscordAuth]
    [HttpPost("types")]
    public async Task<ActionResult<LogChannelTypeDto>> CreateType([FromBody] CreateLogChannelTypeDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var logChannelType = await _logChannelService.CreateLogChannelTypeAsync(createDto);
        return Ok(logChannelType);
    }

    /// <summary>
    ///     Log channel türünü günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/types/{logType}")]
    public async Task<ActionResult<LogChannelTypeDto>> UpdateType(string guildId, string logType,
        [FromBody] UpdateLogChannelTypeDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var logChannelType = await _logChannelService.UpdateLogChannelTypeAsync(guildId, logType, updateDto);
        if (logChannelType == null)
            return NotFound($"LogChannelType kaydı bulunamadı (GuildId: {guildId}, LogType: {logType})");

        return Ok(logChannelType);
    }

    /// <summary>
    ///     Log channel türünü siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/types/{logType}")]
    public async Task<IActionResult> DeleteType(string guildId, string logType)
    {
        var botClientId = HttpContext.Items["BotClientId"]?.ToString();
        var result = await _logChannelService.DeleteLogChannelTypeAsync(guildId, logType, botClientId);
        if (!result)
            return NotFound($"LogChannelType kaydı bulunamadı (GuildId: {guildId}, LogType: {logType})");

        return NoContent();
    }
}