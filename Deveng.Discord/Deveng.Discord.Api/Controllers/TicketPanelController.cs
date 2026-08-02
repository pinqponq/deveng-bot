using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketPanelController : ControllerBase
{
    private readonly ITicketPanelService _ticketPanelService;
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IQuotaService _quota;

    public TicketPanelController(
        ITicketPanelService ticketPanelService,
        IConfiguration configuration,
        IDiscordAuthService discordAuthService,
        IQuotaService quota)
    {
        _ticketPanelService = ticketPanelService;
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
    ///     Tüm ticket panel kayıtlarını getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<TicketPanelDto>>> GetAll()
    {
        var ticketPanels = await _ticketPanelService.GetAllTicketPanelsAsync();
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(ticketPanels);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(ticketPanels.Where(t => allowed.Contains(t.GuildId)).ToList());
    }

    /// <summary>
    ///     Guild ID ile ticket panel kaydını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<TicketPanelDto>> GetByGuildId(string guildId)
    {
        var ticketPanel = await _ticketPanelService.GetTicketPanelByGuildIdAsync(guildId);
        if (ticketPanel == null)
            return NotFound($"Ticket panel kaydı bulunamadı (GuildId: {guildId})");

        return Ok(ticketPanel);
    }

    /// <summary>
    ///     Yeni ticket panel kaydı oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<TicketPanelDto>> Create([FromBody] CreateTicketPanelDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var existing = await _ticketPanelService.GetTicketPanelByGuildIdAsync(createDto.GuildId);
            var current = existing != null ? 1 : 0;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.TicketPanel, current);
        }

        var ticketPanel = await _ticketPanelService.CreateTicketPanelAsync(createDto);
        return CreatedAtAction(nameof(GetByGuildId), new { guildId = ticketPanel.GuildId }, ticketPanel);
    }

    /// <summary>
    ///     Ticket panel kaydını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<TicketPanelDto>> Update(string guildId, [FromBody] CreateTicketPanelDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var ticketPanel = await _ticketPanelService.UpdateTicketPanelAsync(guildId, updateDto);
        if (ticketPanel == null)
            return NotFound($"Ticket panel kaydı bulunamadı (GuildId: {guildId})");

        return Ok(ticketPanel);
    }

    /// <summary>
    ///     Ticket panel kaydını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var result = await _ticketPanelService.DeleteTicketPanelAsync(guildId);
        if (!result)
            return NotFound($"Ticket panel kaydı bulunamadı (GuildId: {guildId})");

        return NoContent();
    }

    /// <summary>
    ///     Ticket panel mesajını kanala gönderir (Bot'a HTTP isteği gönderir)
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/send")]
    public async Task<IActionResult> SendToChannel(string guildId)
    {
        var ticketPanel = await _ticketPanelService.GetTicketPanelByGuildIdAsync(guildId);
        if (ticketPanel == null)
            return NotFound($"Ticket panel kaydı bulunamadı (GuildId: {guildId})");

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();

        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
            return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        var request =
            new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-ticket-panel/{guildId}");

        if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

        var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
        BotHttpHmac.AddSignedHeaders(request, sharedSecret);

        var response = await httpClient.SendAsync(request);

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            return Ok(new { message = "Ticket panel mesajı gönderildi", guildId, response = responseContent });
        }

        var errorContent = await response.Content.ReadAsStringAsync();
        return StatusCode((int)response.StatusCode, new
        {
            message = "Bot'a istek gönderilemedi",
            statusCode = response.StatusCode,
            error = errorContent
        });
    }
}