using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomCommandController : ControllerBase
{
    private readonly ICustomCommandService _customCommandService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CustomCommandController> _logger;
    private readonly IQuotaService _quota;

    public CustomCommandController(
        ICustomCommandService customCommandService,
        IConfiguration configuration,
        ILogger<CustomCommandController> logger,
        IQuotaService quota)
    {
        _customCommandService = customCommandService;
        _configuration = configuration;
        _logger = logger;
        _quota = quota;
    }

    /// <summary>
    ///     Bot HTTP sunucusuna HMAC ile slash komutlarını yeniden kaydetmesi için istek gönderir (BotProxy ile aynı sözleşme).
    /// </summary>
    private async Task NotifyBotToReregisterCommandsAsync(string guildId)
    {
        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
        {
            _logger.LogWarning("[CustomCommand] Bot:HttpServerUrl tanımlı değil, slash senkron atlandı (GuildId: {GuildId})", guildId);
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
                    "[CustomCommand] Bot slash yenileme başarısız: {Status} (GuildId: {GuildId}) {Body}",
                    (int)response.StatusCode, guildId, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[CustomCommand] Bot slash yenileme isteği atılamadı (GuildId: {GuildId})", guildId);
        }
    }

    /// <summary>
    ///     Tüm özel komutları getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<CustomCommandDto>>> GetByGuildId(string guildId)
    {
        var commands = await _customCommandService.GetCustomCommandsAsync(guildId);
        return Ok(commands);
    }

    /// <summary>
    ///     Komut adı ile özel komutu getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/command/{commandName}")]
    public async Task<ActionResult<CustomCommandDto>> GetByName(string guildId, string commandName)
    {
        var command = await _customCommandService.GetCustomCommandByNameAsync(guildId, commandName);
        if (command == null)
            return NotFound($"Özel komut bulunamadı (GuildId: {guildId}, CommandName: {commandName})");

        return Ok(command);
    }

    /// <summary>
    ///     Yeni özel komut oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<CustomCommandDto>> CreateOrUpdate(string guildId,
        [FromBody] CreateCustomCommandDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Yalnızca yeni komut oluşturulurken kotayı denetle (mevcut komutun update'i sayım'ı değiştirmez)
        var existing = await _customCommandService.GetCustomCommandByNameAsync(guildId, createDto.CommandName);
        if (existing == null)
        {
            var current = (await _customCommandService.GetCustomCommandsAsync(guildId)).Count;
            await _quota.EnforceQuotaAsync(guildId, FeatureQuota.CustomCommand, current);
        }

        var command = await _customCommandService.CreateOrUpdateCustomCommandAsync(guildId, createDto);
        await NotifyBotToReregisterCommandsAsync(guildId);
        return Ok(command);
    }

    /// <summary>
    ///     Özel komutu günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<CustomCommandDto>> Update(string guildId, int id, [FromBody] UpdateCustomCommandDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _customCommandService.GetCustomCommandByIdAsync(id);
        if (existing == null) return NotFound($"Özel komut bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var command = await _customCommandService.UpdateCustomCommandAsync(id, updateDto);
        if (command == null)
            return NotFound($"Özel komut bulunamadı (Id: {id})");

        await NotifyBotToReregisterCommandsAsync(guildId);
        return Ok(command);
    }

    /// <summary>
    ///     Özel komutu siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _customCommandService.GetCustomCommandByIdAsync(id);
        if (existing == null) return NotFound($"Özel komut bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _customCommandService.DeleteCustomCommandAsync(id);
        if (!result)
            return NotFound($"Özel komut bulunamadı (Id: {id})");

        await NotifyBotToReregisterCommandsAsync(guildId);
        return NoContent();
    }
}