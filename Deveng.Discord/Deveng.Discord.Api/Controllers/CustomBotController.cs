using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomBotController : ControllerBase
{
    private readonly ICustomBotService _customBotService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CustomBotController> _logger;

    public CustomBotController(
        ICustomBotService customBotService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<CustomBotController> logger)
    {
        _customBotService = customBotService;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private bool TryGetCallerId(out string callerId)
    {
        callerId = HttpContext.Items["DiscordUserId"]?.ToString() ?? "";
        return !string.IsNullOrEmpty(callerId);
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
            _logger.LogWarning("[CustomBot] Bot:SharedSecret yapılandırılmamış, HMAC imzası eklenmiyor");
            return;
        }

        BotHttpHmac.AddSignedHeaders(request, sharedSecret, body);
    }

    private async Task TriggerApplyProfileAsync(int id)
    {
        var botBase = GetBotBaseUrl();
        if (string.IsNullOrEmpty(botBase))
            return;

        try
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"{botBase}/api/bot/custom-bot/apply-profile/{id}";
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            AddHmacHeaders(request);
            await client.SendAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[CustomBot] apply-profile tetiklenemedi (ID: {Id})", id);
        }
    }

    [RequireDiscordUser]
    [HttpGet]
    public async Task<ActionResult<List<CustomBotDto>>> GetAll()
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var ownBots = await _customBotService.GetCustomBotsByOwnerIdAsync(callerId);
        return Ok(ownBots);
    }

    [RequireDiscordUser]
    [HttpGet("active")]
    public async Task<ActionResult<List<CustomBotDto>>> GetActive()
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var ownBots = await _customBotService.GetCustomBotsByOwnerIdAsync(callerId);
        return Ok(ownBots.Where(b => string.Equals(b.Status, "Active", StringComparison.OrdinalIgnoreCase)));
    }

    [RequireDiscordUser]
    [HttpGet("{id}")]
    public async Task<ActionResult<CustomBotDto>> GetById(int id)
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByIdAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        if (bot.OwnerId != callerId)
            return Forbid();

        return Ok(bot);
    }

    [RequireDiscordUser]
    [HttpGet("client/{clientId}")]
    public async Task<ActionResult<CustomBotDto>> GetByClientId(string clientId)
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var bot = await _customBotService.GetCustomBotByClientIdAsync(clientId);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        if (bot.OwnerId != callerId)
            return Forbid();

        return Ok(bot);
    }

    [RequireDiscordUser]
    [HttpGet("owner/{ownerId}")]
    public async Task<ActionResult<List<CustomBotDto>>> GetByOwnerId(string ownerId)
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        if (callerId != ownerId)
            return Forbid();

        var bots = await _customBotService.GetCustomBotsByOwnerIdAsync(ownerId);
        return Ok(bots);
    }

    [RequireDiscordUser]
    [EnableRateLimiting("custom-bot-mutate")]
    [HttpPost]
    public async Task<ActionResult<CustomBotDto>> Create([FromBody] CreateCustomBotDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        createDto.OwnerId = callerId;

        try
        {
            var bot = await _customBotService.CreateCustomBotAsync(createDto);
            return CreatedAtAction(nameof(GetById), new { id = bot.Id }, bot);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [RequireDiscordUser]
    [HttpPut("{id}")]
    public async Task<ActionResult<CustomBotDto>> Update(int id, [FromBody] UpdateCustomBotDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var existing = await _customBotService.GetCustomBotByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        if (existing.OwnerId != callerId)
            return Forbid();

        var bot = await _customBotService.UpdateCustomBotAsync(id, updateDto);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        return Ok(bot);
    }

    [RequireDiscordUser]
    [EnableRateLimiting("custom-bot-mutate")]
    [HttpPut("{id}/personalization")]
    public async Task<ActionResult<CustomBotDto>> UpdatePersonalization(
        int id,
        [FromBody] UpdateCustomBotPersonalizationDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var existing = await _customBotService.GetCustomBotByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        if (existing.OwnerId != callerId)
            return Forbid();

        try
        {
            var bot = await _customBotService.UpdatePersonalizationAsync(id, updateDto);
            if (bot == null)
                return NotFound(new { message = "Custom bot bulunamadı" });

            if (string.Equals(bot.Status, "Active", StringComparison.OrdinalIgnoreCase)
                && bot.PersonalizationEnabled)
            {
                await TriggerApplyProfileAsync(id);
            }

            return Ok(bot);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [DiscordAuth(requireGuildPermission: false)]
    [HttpGet("internal/active")]
    public async Task<ActionResult<List<CustomBotInternalActiveDto>>> GetActiveInternal()
    {
        var bots = await _customBotService.GetActiveCustomBotsInternalAsync();
        return Ok(bots);
    }

    [DiscordAuth(requireGuildPermission: false)]
    [HttpGet("internal/{id}/personalization")]
    public async Task<ActionResult<CustomBotPersonalizationInternalDto>> GetPersonalizationInternal(int id)
    {
        var bot = await _customBotService.GetPersonalizationInternalAsync(id);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        return Ok(bot);
    }

    [DiscordAuth(requireGuildPermission: false)]
    [HttpPut("internal/{id}/status")]
    public async Task<IActionResult> UpdateInternalStatus(
        int id,
        [FromBody] UpdateCustomBotInternalStatusDto updateDto)
    {
        var bot = await _customBotService.UpdateInternalStatusAsync(id, updateDto);
        if (bot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        return Ok(new { success = true });
    }

    [RequireDiscordUser]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!TryGetCallerId(out var callerId))
            return Unauthorized();

        var existingBot = await _customBotService.GetCustomBotByIdAsync(id);
        if (existingBot == null)
            return NotFound(new { message = "Custom bot bulunamadı" });

        if (existingBot.OwnerId != callerId)
            return Forbid();

        try
        {
            var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            if (!string.IsNullOrEmpty(botWebhookUrl))
            {
                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                var stopRequest = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/custom-bot/stop/{id}");

                if (!string.IsNullOrEmpty(sharedSecret))
                {
                    BotHttpHmac.AddSignedHeaders(stopRequest, sharedSecret);
                }

                await httpClient.SendAsync(stopRequest);
            }
        }
        catch
        {
        }

        var result = await _customBotService.DeleteCustomBotAsync(id);
        if (!result)
            return NotFound(new { message = "Custom bot silinemedi" });

        return NoContent();
    }
}
