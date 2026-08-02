using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GiveawayController : ControllerBase
{
    private readonly IGiveawayService _giveawayService;
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public GiveawayController(
        IGiveawayService giveawayService,
        IConfiguration configuration,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _giveawayService = giveawayService;
        _configuration = configuration;
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

    private async Task<ActionResult?> EnsureGiveawayReadAsync(GiveawayDto giveaway)
    {
        var isBot = HttpContext.Items["DiscordAuthIsBot"] is true;
        if (isBot)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, giveaway.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, giveaway.GuildId, false)) return Forbid();
        return null;
    }

    private async Task<ActionResult?> EnsureGiveawayAdminAsync(GiveawayDto giveaway)
    {
        var isBot = HttpContext.Items["DiscordAuthIsBot"] is true;
        if (isBot)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, giveaway.GuildId))
                return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, giveaway.GuildId, true)) return Forbid();
        return null;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<GiveawayDto>>> GetAllByGuildId(string guildId)
    {
        var giveaways = await _giveawayService.GetGiveawaysByGuildIdAsync(guildId);
        return Ok(giveaways);
    }

    /// <summary>Aktif çekilişler — yalnızca belirtilen sunucu için.</summary>
    [DiscordAuth(false)]
    [HttpGet("active")]
    public async Task<ActionResult<List<GiveawayDto>>> GetActive([FromQuery] string? guildId = null)
    {
        var isBot = HttpContext.Items["DiscordAuthIsBot"] is true;
        var normalizedGuildId = guildId?.Trim();
        if (!isBot && string.IsNullOrWhiteSpace(normalizedGuildId))
            return BadRequest(new { message = "guildId sorgu parametresi zorunludur." });

        var giveaways = await _giveawayService.GetActiveGiveawaysAsync();
        if (isBot && string.IsNullOrWhiteSpace(normalizedGuildId))
            return Ok(giveaways);

        return Ok(giveaways.Where(g => string.Equals(g.GuildId, normalizedGuildId, StringComparison.Ordinal)).ToList());
    }

    [DiscordAuth(false)]
    [HttpGet("{id}")]
    public async Task<ActionResult<GiveawayDto>> GetById(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        return Ok(giveaway);
    }

    [DiscordAuth(false)]
    [HttpGet("message/{messageId}")]
    public async Task<ActionResult<GiveawayDto>> GetByMessageId(string messageId)
    {
        var giveaway = await _giveawayService.GetGiveawayByMessageIdAsync(messageId);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (MessageId: {messageId})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        return Ok(giveaway);
    }

    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<GiveawayDto>> Create([FromBody] CreateGiveawayDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            // Free tier: bitmemiş çekilişler kotaya girer (eşzamanlı “aktif” slot).
            var current = (await _giveawayService.GetGiveawaysByGuildIdAsync(createDto.GuildId))
                .Count(g => !g.IsEnded);
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.Giveaway, current);
        }

        var giveaway = await _giveawayService.CreateGiveawayAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = giveaway.Id }, giveaway);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<GiveawayDto>> Update(string guildId, int id, [FromBody] UpdateGiveawayDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _giveawayService.GetGiveawayByIdAsync(id);
        if (existing == null) return NotFound($"Çekiliş bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var giveaway = await _giveawayService.UpdateGiveawayAsync(id, updateDto);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        return Ok(giveaway);
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _giveawayService.GetGiveawayByIdAsync(id);
        if (existing == null) return NotFound($"Çekiliş bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _giveawayService.DeleteGiveawayAsync(id);
        if (!result)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        return NoContent();
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}/messageId")]
    public async Task<IActionResult> UpdateMessageId(string guildId, int id, [FromBody] UpdateMessageIdDto dto)
    {
        var existing = await _giveawayService.GetGiveawayByIdAsync(id);
        if (existing == null) return NotFound($"Çekiliş bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _giveawayService.UpdateMessageIdAsync(id, dto.MessageId);
        if (!result)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/{id}/end")]
    public async Task<IActionResult> EndGiveaway(string guildId, int id)
    {
        var existing = await _giveawayService.GetGiveawayByIdAsync(id);
        if (existing == null) return NotFound($"Çekiliş bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _giveawayService.EndGiveawayAsync(id);
        if (!result)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        return Ok(new { message = "Çekiliş sonlandırıldı" });
    }

    [DiscordAuth(false)]
    [HttpPost("{id}/participant")]
    public async Task<IActionResult> AddParticipant(int id, [FromBody] AddParticipantDto dto)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var isBot = HttpContext.Items["DiscordAuthIsBot"] is true;
        string userId;
        if (isBot)
        {
            var denied = await EnsureGiveawayReadAsync(giveaway);
            if (denied != null) return denied;
            userId = dto.UserId;
        }
        else
        {
            var token = GetBearerToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized();
            var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
            if (userInfo == null) return Unauthorized();
            if (!_discordAuthService.HasGuildPermission(userInfo, giveaway.GuildId, false)) return Forbid();
            userId = userInfo.UserId;
        }

        var result = await _giveawayService.AddParticipantAsync(id, userId);
        if (!result)
            return BadRequest(new { message = "Katılımcı eklenemedi. Zaten katılmış olabilirsiniz." });

        return Ok(new { message = "Katılımcı eklendi" });
    }

    [DiscordAuth(false)]
    [HttpDelete("{id}/participant")]
    public async Task<IActionResult> RemoveParticipant(int id, [FromBody] RemoveParticipantDto dto)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var isBot = HttpContext.Items["DiscordAuthIsBot"] is true;
        if (isBot)
        {
            var denied = await EnsureGiveawayReadAsync(giveaway);
            if (denied != null) return denied;
            await _giveawayService.RemoveParticipantAsync(id, dto.UserId);
            return Ok(new { message = "Katılımcı kaldırıldı" });
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var isSelf = string.Equals(userInfo.UserId, dto.UserId, StringComparison.Ordinal);
        if (!isSelf && !_discordAuthService.HasGuildPermission(userInfo, giveaway.GuildId, true))
            return Forbid();

        await _giveawayService.RemoveParticipantAsync(id, dto.UserId);
        return Ok(new { message = "Katılımcı kaldırıldı" });
    }

    [DiscordAuth(false)]
    [HttpGet("{id}/participants")]
    public async Task<ActionResult<List<GiveawayParticipantDto>>> GetParticipants(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        var participants = await _giveawayService.GetParticipantsAsync(id);
        return Ok(participants);
    }

    [DiscordAuth(false)]
    [HttpPost("{id}/winner")]
    public async Task<IActionResult> AddWinner(int id, [FromBody] AddWinnerDto dto)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var result = await _giveawayService.AddWinnerAsync(id, dto.UserId);
        if (!result)
            return BadRequest(new { message = "Kazanan eklenemedi. Zaten kazanmış olabilir." });

        return Ok(new { message = "Kazanan eklendi" });
    }

    [DiscordAuth(false)]
    [HttpGet("{id}/winners")]
    public async Task<ActionResult<List<GiveawayWinnerDto>>> GetWinners(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        var winners = await _giveawayService.GetWinnersAsync(id);
        return Ok(winners);
    }

    [DiscordAuth(false)]
    [HttpPost("{id}/role")]
    public async Task<IActionResult> AddRole(int id, [FromBody] AddGiveawayRoleDto dto)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var result = await _giveawayService.AddRoleAsync(id, dto.RoleId, dto.WinChanceMultiplier);
        if (!result)
            return BadRequest(new { message = "Rol eklenemedi" });

        return Ok(new { message = "Rol eklendi" });
    }

    [DiscordAuth(false)]
    [HttpDelete("{id}/role/{roleId}")]
    public async Task<IActionResult> RemoveRole(int id, string roleId)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var result = await _giveawayService.RemoveRoleAsync(id, roleId);
        if (!result)
            return NotFound($"Rol bulunamadı (RoleId: {roleId})");

        return Ok(new { message = "Rol kaldırıldı" });
    }

    [DiscordAuth(false)]
    [HttpGet("{id}/roles")]
    public async Task<ActionResult<List<GiveawayRoleDto>>> GetRoles(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        var roles = await _giveawayService.GetRolesAsync(id);
        return Ok(roles);
    }

    [DiscordAuth(false)]
    [HttpPost("{id}/allowed-role")]
    public async Task<IActionResult> AddAllowedRole(int id, [FromBody] AddAllowedRoleDto dto)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var result = await _giveawayService.AddAllowedRoleAsync(id, dto.RoleId);
        if (!result)
            return BadRequest(new { message = "Rol eklenemedi" });

        return Ok(new { message = "Rol eklendi" });
    }

    [DiscordAuth(false)]
    [HttpDelete("{id}/allowed-role/{roleId}")]
    public async Task<IActionResult> RemoveAllowedRole(int id, string roleId)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var result = await _giveawayService.RemoveAllowedRoleAsync(id, roleId);
        if (!result)
            return NotFound($"Rol bulunamadı (RoleId: {roleId})");

        return Ok(new { message = "Rol kaldırıldı" });
    }

    [DiscordAuth(false)]
    [HttpGet("{id}/allowed-roles")]
    public async Task<ActionResult<List<GiveawayAllowedRoleDto>>> GetAllowedRoles(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayReadAsync(giveaway);
        if (denied != null) return denied;

        var roles = await _giveawayService.GetAllowedRolesAsync(id);
        return Ok(roles);
    }

    [DiscordAuth(false)]
    [HttpPost("{id}/send")]
    public async Task<IActionResult> SendToChannel(int id)
    {
        var giveaway = await _giveawayService.GetGiveawayByIdAsync(id);
        if (giveaway == null)
            return NotFound($"Çekiliş bulunamadı (Id: {id})");

        var denied = await EnsureGiveawayAdminAsync(giveaway);
        if (denied != null) return denied;

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();
        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");

        try
        {
            var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
            if (string.IsNullOrEmpty(botWebhookUrl))
                return StatusCode(503, ApiErrorResponse.Problem("bot_url_missing",
                    "Bot:HttpServerUrl yapılandırması bulunamadı.", HttpContext.TraceIdentifier));

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-giveaway/{id}");

            if (!string.IsNullOrEmpty(botToken)) request.Headers.Add("X-Bot-Token", botToken);
            if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            BotHttpHmac.AddSignedHeaders(request, sharedSecret);

            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                return Ok(new { message = "Çekiliş gönderildi", id, response = responseContent });
            }

            return StatusCode((int)response.StatusCode, ApiErrorResponse.Problem("bot_rejected",
                "Bot isteği başarısız.", HttpContext.TraceIdentifier));
        }
        catch (HttpRequestException)
        {
            return StatusCode(500, ApiErrorResponse.Problem("bot_unreachable",
                "Bot'a bağlanılamadı.", HttpContext.TraceIdentifier));
        }
        catch (TaskCanceledException)
        {
            return StatusCode(500, ApiErrorResponse.Problem("bot_timeout",
                "Bot'a istek zaman aşımına uğradı.", HttpContext.TraceIdentifier));
        }
        catch (Exception)
        {
            return StatusCode(500, ApiErrorResponse.Problem("bot_error",
                "Bot'a istek gönderilirken hata oluştu.", HttpContext.TraceIdentifier));
        }
    }
}

public class UpdateMessageIdDto
{
    public string MessageId { get; set; } = string.Empty;
}

public class AddParticipantDto
{
    public string UserId { get; set; } = string.Empty;
}

public class RemoveParticipantDto
{
    public string UserId { get; set; } = string.Empty;
}

public class AddWinnerDto
{
    public string UserId { get; set; } = string.Empty;
}

public class AddGiveawayRoleDto
{
    public string RoleId { get; set; } = string.Empty;
    public decimal WinChanceMultiplier { get; set; } = 1.00m;
}

public class AddAllowedRoleDto
{
    public string RoleId { get; set; } = string.Empty;
}
