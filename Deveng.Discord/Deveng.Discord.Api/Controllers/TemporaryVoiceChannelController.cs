using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemporaryVoiceChannelController : ControllerBase
{
    private readonly ITemporaryVoiceChannelService _temporaryVoiceChannelService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public TemporaryVoiceChannelController(
        ITemporaryVoiceChannelService temporaryVoiceChannelService,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _temporaryVoiceChannelService = temporaryVoiceChannelService;
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

    private async Task<ActionResult?> EnsureLobbyReadAsync(TemporaryVoiceChannelLobbyDto lobby)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, lobby.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, lobby.GuildId, false)) return Forbid();
        return null;
    }

    private async Task<ActionResult?> EnsureLobbyWriteAsync(TemporaryVoiceChannelLobbyDto lobby)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, lobby.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, lobby.GuildId, true)) return Forbid();
        return null;
    }

    private async Task<ActionResult?> EnsureTvcReadAsync(TemporaryVoiceChannelDto channel)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, channel.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, channel.GuildId, false)) return Forbid();
        return null;
    }

    private async Task<ActionResult?> EnsureTvcWriteAsync(TemporaryVoiceChannelDto channel)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, channel.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, channel.GuildId, true)) return Forbid();
        return null;
    }

    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<TemporaryVoiceChannelLobbyDto>>> GetAll([FromQuery] string? guildId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var lobbies = await _temporaryVoiceChannelService.GetAllLobbiesAsync();
            return Ok(lobbies);
        }

        if (string.IsNullOrWhiteSpace(guildId))
            return BadRequest(new { message = "guildId sorgu parametresi zorunludur." });

        var list = await _temporaryVoiceChannelService.GetLobbiesByGuildIdAsync(guildId.Trim());
        return Ok(list);
    }

    [DiscordAuth(false)]
    [HttpGet("{id}")]
    public async Task<ActionResult<TemporaryVoiceChannelLobbyDto>> GetById(int id)
    {
        var lobby = await _temporaryVoiceChannelService.GetLobbyByIdAsync(id);
        if (lobby == null)
            return NotFound($"Temporary voice channel lobby kaydı bulunamadı (Id: {id})");

        var denied = await EnsureLobbyReadAsync(lobby);
        if (denied != null) return denied;

        return Ok(lobby);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<TemporaryVoiceChannelLobbyDto>>> GetByGuildId(string guildId)
    {
        var lobbies = await _temporaryVoiceChannelService.GetLobbiesByGuildIdAsync(guildId);
        return Ok(lobbies);
    }

    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<TemporaryVoiceChannelLobbyDto>> Create(
        [FromBody] CreateTemporaryVoiceChannelLobbyDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _temporaryVoiceChannelService.GetLobbiesByGuildIdAsync(createDto.GuildId)).Count;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.TempVoiceChannelLobby, current);
        }

        try
        {
            var lobby = await _temporaryVoiceChannelService.CreateLobbyAsync(createDto);
            return CreatedAtAction(nameof(GetById), new { id = lobby.Id }, lobby);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message, guildId = createDto.GuildId });
        }
        catch (Exception)
        {
            return StatusCode(500, ApiErrorResponse.Problem("lobby_create_failed",
                "Lobby oluşturulurken bir hata oluştu.", HttpContext.TraceIdentifier));
        }
    }

    [DiscordAuth(false)]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<TemporaryVoiceChannelLobbyDto>> Update(string guildId, int id,
        [FromBody] CreateTemporaryVoiceChannelLobbyDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _temporaryVoiceChannelService.GetLobbyByIdAsync(id);
        if (existing == null)
            return NotFound($"Temporary voice channel lobby kaydı bulunamadı (Id: {id})");

        var denied = await EnsureLobbyWriteAsync(existing);
        if (denied != null) return denied;

        var lobby = await _temporaryVoiceChannelService.UpdateLobbyAsync(id, updateDto);
        if (lobby == null)
            return NotFound($"Temporary voice channel lobby kaydı bulunamadı (Id: {id})");

        return Ok(lobby);
    }

    [DiscordAuth(false)]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _temporaryVoiceChannelService.GetLobbyByIdAsync(id);
        if (existing == null)
            return NotFound($"Temporary voice channel lobby kaydı bulunamadı (Id: {id})");

        var denied = await EnsureLobbyWriteAsync(existing);
        if (denied != null) return denied;

        var result = await _temporaryVoiceChannelService.DeleteLobbyAsync(id);
        if (!result)
            return NotFound($"Temporary voice channel lobby kaydı bulunamadı (Id: {id})");

        return NoContent();
    }

    [DiscordAuth(false)]
    [HttpGet("channel/{channelId}")]
    public async Task<ActionResult<TemporaryVoiceChannelDto>> GetTemporaryVoiceChannelByChannelId(string channelId)
    {
        var channel = await _temporaryVoiceChannelService.GetTemporaryVoiceChannelByChannelIdAsync(channelId);
        if (channel == null)
            return NotFound($"Geçici ses kanalı kaydı bulunamadı (ChannelId: {channelId})");

        var denied = await EnsureTvcReadAsync(channel);
        if (denied != null) return denied;

        return Ok(channel);
    }

    [DiscordAuth(false)]
    [HttpPost("channel")]
    public async Task<ActionResult<TemporaryVoiceChannelDto>> CreateTemporaryVoiceChannel(
        [FromBody] CreateTemporaryVoiceChannelDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var temp = new TemporaryVoiceChannelDto
        {
            GuildId = createDto.GuildId,
            LobbyId = createDto.LobbyId,
            ChannelId = createDto.ChannelId
        };
        var denied = await EnsureTvcWriteAsync(temp);
        if (denied != null) return denied;

        try
        {
            var channel = await _temporaryVoiceChannelService.CreateTemporaryVoiceChannelAsync(createDto);
            return CreatedAtAction(nameof(GetTemporaryVoiceChannelByChannelId), new { channelId = channel.ChannelId },
                channel);
        }
        catch (Exception)
        {
            return StatusCode(500, ApiErrorResponse.Problem("tvc_create_failed",
                "Geçici ses kanalı oluşturulurken bir hata oluştu.", HttpContext.TraceIdentifier));
        }
    }

    [DiscordAuth(false)]
    [HttpPatch("channel/{channelId}/owner")]
    public async Task<ActionResult<TemporaryVoiceChannelDto>> UpdateTemporaryVoiceChannelOwner(
        string channelId, [FromBody] UpdateTemporaryVoiceChannelOwnerDto updateDto)
    {
        if (string.IsNullOrWhiteSpace(updateDto.OwnerId))
            return BadRequest(new { message = "ownerId zorunludur." });

        var channel = await _temporaryVoiceChannelService.GetTemporaryVoiceChannelByChannelIdAsync(channelId);
        if (channel == null)
            return NotFound($"Geçici ses kanalı kaydı bulunamadı (ChannelId: {channelId})");

        var denied = await EnsureTvcWriteAsync(channel);
        if (denied != null) return denied;

        var updated = await _temporaryVoiceChannelService.UpdateTemporaryVoiceChannelOwnerAsync(channelId, updateDto.OwnerId.Trim());
        if (updated == null)
            return NotFound($"Geçici ses kanalı kaydı bulunamadı (ChannelId: {channelId})");

        return Ok(updated);
    }

    [DiscordAuth(false)]
    [HttpDelete("channel/{channelId}")]
    public async Task<IActionResult> DeleteTemporaryVoiceChannel(string channelId)
    {
        var channel = await _temporaryVoiceChannelService.GetTemporaryVoiceChannelByChannelIdAsync(channelId);
        if (channel == null)
            return NotFound($"Geçici ses kanalı kaydı bulunamadı (ChannelId: {channelId})");

        var denied = await EnsureTvcWriteAsync(channel);
        if (denied != null) return denied;

        var result = await _temporaryVoiceChannelService.DeleteTemporaryVoiceChannelAsync(channelId);
        if (!result)
            return NotFound($"Geçici ses kanalı kaydı bulunamadı (ChannelId: {channelId})");

        return NoContent();
    }
}
