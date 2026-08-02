using System.Text;
using System.Text.Json;
using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;

    public TicketController(ITicketService ticketService, IConfiguration configuration, IDiscordAuthService discordAuthService)
    {
        _ticketService = ticketService;
        _configuration = configuration;
        _discordAuthService = discordAuthService;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    private async Task<IActionResult?> EnsureGuildAdminAsync(string guildId)
    {
        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, guildId, true)) return Forbid();
        return null;
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/bot/tickets")]
    public async Task<ActionResult<int>> BotCreateTicket(string guildId, [FromBody] CreateTicketRecordDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        var id = await _ticketService.CreateTicketRecordAsync(guildId, dto);
        return Ok(id);
    }

    [DiscordAuth]
    [HttpPatch("guild/{guildId}/bot/tickets/channel/{channelId}/claim")]
    public async Task<IActionResult> BotClaimTicket(string guildId, string channelId, [FromBody] TicketActorDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ticketService.UpdateTicketClaimedByChannelAsync(guildId, channelId, dto.UserId);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPatch("guild/{guildId}/bot/tickets/channel/{channelId}/close")]
    public async Task<IActionResult> BotCloseTicket(string guildId, string channelId, [FromBody] TicketCloseDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ticketService.UpdateTicketClosedByChannelAsync(guildId, channelId, dto.ClosedByUserId, dto.TranscriptId);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/bot/tickets/channel/{channelId}/staff-panel-touch")]
    public async Task<IActionResult> BotTouchStaffPanelMessage(string guildId, string channelId, [FromBody] TicketStaffTouchDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _ticketService.TouchTicketStaffPanelMessageAsync(guildId, channelId, dto.StaffUserId, dto.OccurredAtUtc);
        return NoContent();
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<IActionResult> ListTickets(string guildId, [FromQuery] int? status = null)
    {
        var denied = await EnsureGuildAdminAsync(guildId);
        if (denied != null) return denied;
        var staffId = HttpContext.Items["DiscordUserId"] as string ?? "";
        var rows = await _ticketService.GetTicketsByGuildAsync(guildId, staffId, status);
        return Ok(rows);
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/{ticketId:int}/read")]
    public async Task<IActionResult> MarkRead(string guildId, int ticketId)
    {
        var denied = await EnsureGuildAdminAsync(guildId);
        if (denied != null) return denied;
        var staffId = HttpContext.Items["DiscordUserId"] as string;
        if (string.IsNullOrEmpty(staffId)) return Unauthorized();
        await _ticketService.UpsertTicketStaffReadAsync(ticketId, staffId);
        return NoContent();
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/{ticketId:int}/staff-message")]
    public async Task<IActionResult> SendStaffMessage(string guildId, int ticketId, [FromBody] TicketStaffMessageDto dto)
    {
        var denied = await EnsureGuildAdminAsync(guildId);
        if (denied != null) return denied;
        var staffId = HttpContext.Items["DiscordUserId"] as string;
        if (string.IsNullOrEmpty(staffId)) return Unauthorized();

        var ticket = await _ticketService.GetTicketByIdAsync(guildId, ticketId);
        if (ticket == null) return NotFound();

        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
            return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı." });

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();
        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN") ?? "";

        var payload = new
        {
            channelId = ticket.ChannelId,
            content = dto.Content,
            embedTitle = dto.EmbedTitle,
            embedDescription = dto.EmbedDescription,
            embedColor = dto.EmbedColor,
            staffUserId = staffId
        };
        var jsonBody = JsonSerializer.Serialize(payload);

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        var request = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl.TrimEnd('/')}/api/bot/send-ticket-staff-message/{guildId}")
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrEmpty(botToken)) request.Headers.TryAddWithoutValidation("X-Bot-Token", botToken);
        if (!string.IsNullOrEmpty(botClientId)) request.Headers.TryAddWithoutValidation("X-Bot-ClientId", botClientId);

        var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
        BotHttpHmac.AddSignedHeaders(request, sharedSecret, jsonBody);

        var response = await httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return StatusCode((int)response.StatusCode, new { message = "Bot mesaj gönderemedi", error = err });
        }

        return Ok(new { message = "Mesaj gönderildi" });
    }
}
