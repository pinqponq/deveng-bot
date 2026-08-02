using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReactionRoleController : ControllerBase
{
    private readonly IReactionRoleService _reactionRoleService;
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IQuotaService _quota;

    public ReactionRoleController(
        IReactionRoleService reactionRoleService,
        IConfiguration configuration,
        IDiscordAuthService discordAuthService,
        IQuotaService quota)
    {
        _reactionRoleService = reactionRoleService;
        _configuration = configuration;
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
    ///     Tüm reaction role kayıtlarını getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<ReactionRoleDto>>> GetAll()
    {
        var reactionRoles = await _reactionRoleService.GetAllReactionRolesAsync();
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(reactionRoles);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(reactionRoles.Where(r => allowed.Contains(r.GuildId)).ToList());
    }

    /// <summary>
    ///     Guild ID ile tüm reaction role panellerini getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<ReactionRoleDto>>> GetByGuildId(string guildId)
    {
        var list = await _reactionRoleService.GetReactionRolesByGuildIdAsync(guildId);
        return Ok(list);
    }

    /// <summary>
    ///     Panel ID ile tek kayıt (bot veya kullanıcı; kullanıcıda sunucu üyeliği doğrulanır)
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("panel/{id:int}")]
    public async Task<ActionResult<ReactionRoleDto>> GetPanelById(int id)
    {
        var reactionRole = await _reactionRoleService.GetReactionRoleByIdAsync(id);
        if (reactionRole == null)
            return NotFound($"Reaction role bulunamadı (Id: {id})");

        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(reactionRole);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!userInfo.Guilds.Any(g => g.Id == reactionRole.GuildId))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Bu panele erişim yetkiniz yok." });

        return Ok(reactionRole);
    }

    /// <summary>
    ///     Yeni reaction role kaydı oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<ReactionRoleDto>> Create([FromBody] CreateReactionRoleDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _reactionRoleService.GetReactionRolesByGuildIdAsync(createDto.GuildId)).Count;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.ReactionRolePanel, current);
        }

        var reactionRole = await _reactionRoleService.CreateReactionRoleAsync(createDto);
        return StatusCode(StatusCodes.Status201Created, reactionRole);
    }

    /// <summary>
    ///     Reaction role panelini günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id:int}")]
    public async Task<ActionResult<ReactionRoleDto>> Update(string guildId, int id,
        [FromBody] CreateReactionRoleDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var reactionRole = await _reactionRoleService.UpdateReactionRoleAsync(guildId, id, updateDto);
        if (reactionRole == null)
            return NotFound($"Reaction role kaydı bulunamadı (GuildId: {guildId}, Id: {id})");

        return Ok(reactionRole);
    }

    /// <summary>
    ///     Reaction role panelini siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id:int}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var result = await _reactionRoleService.DeleteReactionRoleAsync(guildId, id);
        if (!result)
            return NotFound($"Reaction role kaydı bulunamadı (GuildId: {guildId}, Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Reaction role mesajını kanala gönderir (Bot'a HTTP isteği gönderir)
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/{id:int}/send")]
    public async Task<IActionResult> SendToChannel(string guildId, int id)
    {
        var reactionRole = await _reactionRoleService.GetReactionRoleByIdAsync(id);
        if (reactionRole == null || reactionRole.GuildId != guildId)
            return NotFound($"Reaction role kaydı bulunamadı (GuildId: {guildId}, Id: {id})");

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();

        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
            return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        var request =
            new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-reaction-role/{id}");

        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        if (!string.IsNullOrEmpty(botToken))
            request.Headers.Add("X-Bot-Token", botToken);

        if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

        var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
        BotHttpHmac.AddSignedHeaders(request, sharedSecret);

        var response = await httpClient.SendAsync(request);

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            return Ok(new { message = "Reaction role mesajı gönderildi", guildId, id, response = responseContent });
        }

        var errorContent = await response.Content.ReadAsStringAsync();
        return StatusCode((int)response.StatusCode, new
        {
            message = "Bot'a istek gönderilemedi",
            statusCode = response.StatusCode,
            error = errorContent
        });
    }

    /// <summary>
    ///     Kanala gönderilmiş reaction role mesajını siler (Bot HTTP) ve kayıttaki MessageId temizlenir
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/{id:int}/remove-sent-message")]
    public async Task<IActionResult> RemoveSentMessage(string guildId, int id)
    {
        var reactionRole = await _reactionRoleService.GetReactionRoleByIdAsync(id);
        if (reactionRole == null || reactionRole.GuildId != guildId)
            return NotFound($"Reaction role kaydı bulunamadı (GuildId: {guildId}, Id: {id})");

        if (string.IsNullOrWhiteSpace(reactionRole.MessageId))
            return BadRequest(new { message = "Kaldırılacak kanal mesajı yok." });

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();

        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
            return StatusCode(503,
                new
                {
                    message =
                        "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın."
                });

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"{botWebhookUrl}/api/bot/delete-reaction-role-message/{id}");

        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        if (!string.IsNullOrEmpty(botToken))
            request.Headers.Add("X-Bot-Token", botToken);

        if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

        var sharedSecretDelete = _configuration["Bot:SharedSecret"] ?? string.Empty;
        BotHttpHmac.AddSignedHeaders(request, sharedSecretDelete);

        var response = await httpClient.SendAsync(request);

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            return Ok(new { message = "Kanal mesajı kaldırıldı", guildId, id, response = responseContent });
        }

        var errorContent = await response.Content.ReadAsStringAsync();
        return StatusCode((int)response.StatusCode, new
        {
            message = "Bot mesajı silemedi",
            statusCode = response.StatusCode,
            error = errorContent
        });
    }
}
