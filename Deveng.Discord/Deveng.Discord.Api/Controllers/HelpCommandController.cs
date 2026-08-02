using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HelpCommandController : ControllerBase
{
    private readonly IHelpCommandService _helpCommandService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HelpCommandController> _logger;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public HelpCommandController(
        IHelpCommandService helpCommandService,
        IConfiguration configuration,
        ILogger<HelpCommandController> logger,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _helpCommandService = helpCommandService;
        _configuration = configuration;
        _logger = logger;
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

    private async Task<ActionResult?> EnsureHelpCommandGuildReadAsync(string guildId)
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
        if (!_discordAuthService.HasGuildPermission(userInfo, guildId, false)) return Forbid();
        return null;
    }

    /// <summary>
    ///     Bot HTTP sunucusuna HMAC ile slash komutlarını yeniden kaydetmesi için istek gönderir (/help dahil).
    /// </summary>
    private async Task NotifyBotToReregisterCommandsAsync(string guildId)
    {
        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
        {
            _logger.LogWarning("[HelpCommand] Bot:HttpServerUrl tanımlı değil, slash senkron atlandı (GuildId: {GuildId})", guildId);
            return;
        }

        try
        {
            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(90);
            var url = $"{botWebhookUrl.TrimEnd('/')}/api/bot/reload-commands/{guildId}";
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            if (!string.IsNullOrEmpty(sharedSecret))
                BotHttpHmac.AddSignedHeaders(request, sharedSecret, string.Empty);
            var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
            if (!string.IsNullOrEmpty(botToken))
                request.Headers.TryAddWithoutValidation("X-Bot-Token", botToken);

            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning(
                    "[HelpCommand] Bot slash yenileme başarısız: {Status} (GuildId: {GuildId}) {Body}",
                    (int)response.StatusCode, guildId, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[HelpCommand] Bot slash yenileme isteği atılamadı (GuildId: {GuildId})", guildId);
        }
    }

    /// <summary>
    ///     Tüm yardım komutlarını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<HelpCommandDto>>> GetByGuildId(string guildId)
    {
        var commands = await _helpCommandService.GetHelpCommandsAsync(guildId);
        return Ok(commands);
    }

    /// <summary>
    ///     Komut adı ile yardım komutunu getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/command/{commandName}")]
    public async Task<ActionResult<HelpCommandDto>> GetByName(string guildId, string commandName)
    {
        var command = await _helpCommandService.GetHelpCommandByNameAsync(guildId, commandName);
        if (command == null)
            return NotFound($"Yardım komutu bulunamadı (GuildId: {guildId}, CommandName: {commandName})");

        return Ok(command);
    }

    /// <summary>
    ///     ID ile yardım komutunu getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("{id}")]
    public async Task<ActionResult<HelpCommandDto>> GetById(int id)
    {
        var command = await _helpCommandService.GetHelpCommandByIdAsync(id);
        if (command == null)
            return NotFound($"Yardım komutu bulunamadı (Id: {id})");

        var denied = await EnsureHelpCommandGuildReadAsync(command.GuildId);
        if (denied != null) return denied;

        return Ok(command);
    }

    /// <summary>
    ///     Yeni yardım komutu oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<HelpCommandDto>> CreateOrUpdate(string guildId,
        [FromBody] CreateHelpCommandDto createDto)
    {
        if (createDto == null)
            return BadRequest(new { message = "Request body boş olamaz" });

        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .Select(x => new { field = x.Key, errors = x.Value?.Errors.Select(e => e.ErrorMessage) })
                .ToList();
            return BadRequest(new { message = "Validation hatası", errors });
        }

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var existing = await _helpCommandService.GetHelpCommandByNameAsync(guildId, createDto.CommandName);
            if (existing == null)
            {
                var current = (await _helpCommandService.GetHelpCommandsAsync(guildId)).Count;
                await _quota.EnforceQuotaAsync(guildId, FeatureQuota.HelpCommand, current);
            }
        }

        var command = await _helpCommandService.CreateOrUpdateHelpCommandAsync(guildId, createDto);
        await NotifyBotToReregisterCommandsAsync(guildId);
        return Ok(command);
    }

    /// <summary>
    ///     Yardım komutunu günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<HelpCommandDto>> Update(string guildId, int id, [FromBody] UpdateHelpCommandDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _helpCommandService.GetHelpCommandByIdAsync(id);
        if (existing == null) return NotFound($"Yardım komutu bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var command = await _helpCommandService.UpdateHelpCommandAsync(id, updateDto);
        if (command == null)
            return NotFound($"Yardım komutu bulunamadı (Id: {id})");

        await NotifyBotToReregisterCommandsAsync(guildId);
        return Ok(command);
    }

    /// <summary>
    ///     Yardım komutunu siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _helpCommandService.GetHelpCommandByIdAsync(id);
        if (existing == null) return NotFound($"Yardım komutu bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _helpCommandService.DeleteHelpCommandAsync(id);
        if (!result)
            return NotFound($"Yardım komutu bulunamadı (Id: {id})");

        await NotifyBotToReregisterCommandsAsync(guildId);
        return NoContent();
    }
}