using System.Text.Json;
using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Deveng.Discord.Api.Controllers;

/// <summary>
///     Web sadece API'ye istek atar; API bu controller ile istekleri Bot HTTP sunucusuna iletir.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BotController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BotController> _logger;
    private readonly ICustomBotService _customBotService;

    public BotController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<BotController> logger,
        ICustomBotService customBotService)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _customBotService = customBotService;
    }

    private string? GetBotBaseUrl()
    {
        var url = _configuration["Bot:HttpServerUrl"]?.Trim().TrimEnd('/');
        return string.IsNullOrEmpty(url) ? null : url;
    }

    private void AddHmacHeaders(HttpRequestMessage request, string body = "")
    {
        var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
        if (string.IsNullOrEmpty(sharedSecret))
        {
            _logger.LogWarning("[BotProxy] Bot:SharedSecret yapılandırılmamış, HMAC imzası eklenmiyor");
            return;
        }

        BotHttpHmac.AddSignedHeaders(request, sharedSecret, body);
    }

    private string? RequireUserId()
    {
        return HttpContext.Items["DiscordUserId"]?.ToString();
    }

    [DiscordAuth]
    [HttpPost("reload-commands/{guildId}")]
    public async Task<IActionResult> ReloadCommands(string guildId)
    {
        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return StatusCode(502, new { message = "Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl)." });

        var client = _httpClientFactory.CreateClient();
        var url = $"{botBase}/api/bot/reload-commands/{guildId}";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        AddHmacHeaders(request);
        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            return StatusCode((int)response.StatusCode, new { message = body });
        }
        return Ok();
    }

    [RequireDiscordUser]
    [EnableRateLimiting("custom-bot-mutate")]
    [HttpPost("custom-bot/start/{id}")]
    public async Task<IActionResult> CustomBotStart(int id)
    {
        var callerId = RequireUserId();
        if (string.IsNullOrEmpty(callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByIdAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });
        if (bot.OwnerId != callerId)
            return Forbid();

        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return StatusCode(502, new { message = "Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl)." });

        var payload = new
        {
            botToken = bot.BotToken,
            clientId = bot.ClientId,
            ownerId = bot.OwnerId,
            botName = bot.BotName
        };
        var jsonBody = JsonSerializer.Serialize(payload);

        var client = _httpClientFactory.CreateClient();
        var url = $"{botBase}/api/bot/custom-bot/start/{id}";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        AddHmacHeaders(request, jsonBody);
        request.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");
        var response = await client.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = responseBody });
        return string.IsNullOrEmpty(responseBody) ? Ok() : Ok(JsonSerializer.Deserialize<object>(responseBody));
    }

    [RequireDiscordUser]
    [HttpPost("custom-bot/stop/{id}")]
    public async Task<IActionResult> CustomBotStop(int id)
    {
        var callerId = RequireUserId();
        if (string.IsNullOrEmpty(callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByIdAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });
        if (bot.OwnerId != callerId)
            return Forbid();

        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return StatusCode(502, new { message = "Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl)." });

        var client = _httpClientFactory.CreateClient();
        var url = $"{botBase}/api/bot/custom-bot/stop/{id}";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        AddHmacHeaders(request);
        var response = await client.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = responseBody });
        return string.IsNullOrEmpty(responseBody) ? Ok() : Ok(JsonSerializer.Deserialize<object>(responseBody));
    }

    [RequireDiscordUser]
    [HttpGet("custom-bot/status/{id}")]
    public async Task<IActionResult> CustomBotStatus(int id)
    {
        var callerId = RequireUserId();
        if (string.IsNullOrEmpty(callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByIdAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });
        if (bot.OwnerId != callerId)
            return Forbid();

        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return StatusCode(502, new { message = "Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl)." });

        var client = _httpClientFactory.CreateClient();
        var url = $"{botBase}/api/bot/custom-bot/status/{id}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        AddHmacHeaders(request);
        var response = await client.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = responseBody });
        return Ok(JsonSerializer.Deserialize<object>(responseBody));
    }

    [RequireDiscordUser]
    [EnableRateLimiting("custom-bot-mutate")]
    [HttpPost("custom-bot/apply-profile/{id}")]
    public async Task<IActionResult> CustomBotApplyProfile(int id)
    {
        var callerId = RequireUserId();
        if (string.IsNullOrEmpty(callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByIdAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });
        if (bot.OwnerId != callerId)
            return Forbid();

        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return StatusCode(502, new { message = "Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl)." });

        var client = _httpClientFactory.CreateClient();
        var url = $"{botBase}/api/bot/custom-bot/apply-profile/{id}";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        AddHmacHeaders(request);
        var response = await client.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = responseBody });
        return string.IsNullOrEmpty(responseBody) ? Ok() : Ok(JsonSerializer.Deserialize<object>(responseBody));
    }
}
