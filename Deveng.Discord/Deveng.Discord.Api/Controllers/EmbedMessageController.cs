using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmbedMessageController : ControllerBase
{
    private readonly IEmbedMessageService _embedMessageService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmbedMessageController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public EmbedMessageController(
        IEmbedMessageService embedMessageService,
        IConfiguration configuration,
        ILogger<EmbedMessageController> logger,
        IHttpClientFactory httpClientFactory,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _embedMessageService = embedMessageService;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
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

    private async Task<ActionResult?> EnsureEmbedGuildReadAsync(string guildId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, guildId))
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bot bu sunucu için yetkili değil." });
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, guildId, false))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bu sunucu için yetkiniz yok." });
        return null;
    }

    /// <summary>
    ///     Tüm embed mesajları getirir (Guild ID ile)
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<EmbedMessageDto>>> GetAllByGuildId(string guildId)
    {
        var embedMessages = await _embedMessageService.GetAllEmbedMessagesByGuildIdAsync(guildId);
        return Ok(embedMessages);
    }

    /// <summary>
    ///     ID ile embed mesaj getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("{id}")]
    public async Task<ActionResult<EmbedMessageDto>> GetById(int id)
    {
        var embedMessage = await _embedMessageService.GetEmbedMessageByIdAsync(id);
        if (embedMessage == null)
            return NotFound($"Embed mesaj bulunamadı (Id: {id})");

        var denied = await EnsureEmbedGuildReadAsync(embedMessage.GuildId);
        if (denied != null) return denied;

        return Ok(embedMessage);
    }

    /// <summary>
    ///     Guild ID ve Name ile embed mesaj getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/name/{name}")]
    public async Task<ActionResult<EmbedMessageDto>> GetByGuildIdAndName(string guildId, string name)
    {
        var embedMessage = await _embedMessageService.GetEmbedMessageByGuildIdAndNameAsync(guildId, name);
        if (embedMessage == null)
            return NotFound($"Embed mesaj bulunamadı (GuildId: {guildId}, Name: {name})");

        return Ok(embedMessage);
    }

    /// <summary>
    ///     Yeni embed mesaj oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<EmbedMessageDto>> Create([FromBody] CreateEmbedMessageDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _embedMessageService.GetAllEmbedMessagesByGuildIdAsync(createDto.GuildId)).Count;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.EmbedMessage, current);
        }

        var embedMessage = await _embedMessageService.CreateEmbedMessageAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = embedMessage.Id }, embedMessage);
    }

    /// <summary>
    ///     Embed mesaj günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<EmbedMessageDto>> Update(string guildId, int id, [FromBody] UpdateEmbedMessageDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _embedMessageService.GetEmbedMessageByIdAsync(id);
        if (existing == null) return NotFound($"Embed mesaj bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var embedMessage = await _embedMessageService.UpdateEmbedMessageAsync(id, updateDto);
        if (embedMessage == null)
            return NotFound($"Embed mesaj bulunamadı (Id: {id})");

        return Ok(embedMessage);
    }

    /// <summary>
    ///     Embed mesaj siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _embedMessageService.GetEmbedMessageByIdAsync(id);
        if (existing == null) return NotFound($"Embed mesaj bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _embedMessageService.DeleteEmbedMessageAsync(id);
        if (!result)
            return NotFound($"Embed mesaj bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Embed mesajın MessageId'sini günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}/messageId")]
    public async Task<IActionResult> UpdateMessageId(string guildId, int id, [FromBody] UpdateMessageIdDto dto)
    {
        var existing = await _embedMessageService.GetEmbedMessageByIdAsync(id);
        if (existing == null) return NotFound($"Embed mesaj bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _embedMessageService.UpdateMessageIdAsync(id, dto.MessageId);
        if (!result)
            return NotFound($"Embed mesaj bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Embed mesajı kanala gönderir (Bot'a HTTP isteği gönderir)
    /// </summary>
    [DiscordAuth(false)]
    [HttpPost("{id}/send")]
    public async Task<IActionResult> SendToChannel(int id)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation("[EmbedSend] START TraceId={TraceId}, Id={Id}", traceId, id);

        var embedMessage = await _embedMessageService.GetEmbedMessageByIdAsync(id);
        if (embedMessage == null)
        {
            _logger.LogWarning("[EmbedSend] Embed not found. TraceId={TraceId}, Id={Id}", traceId, id);
            return NotFound($"Embed mesaj bulunamadı (Id: {id})");
        }

        var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botWebhookUrl))
        {
            _logger.LogError("[EmbedSend] Bot:HttpServerUrl not configured. TraceId={TraceId}", traceId);
            return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı." });
        }

        var botClientId = HttpContext.Items["BotClientId"]?.ToString();
        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");

        _logger.LogInformation("[EmbedSend] Calling bot synchronously. TraceId={TraceId}, Id={Id}", traceId, id);
        var sendResult = await SendToBotAsync(id, botWebhookUrl, botToken, botClientId, traceId);
        if (!sendResult.Success)
        {
            return StatusCode(502, new
            {
                message = "Bot'a gönderim başarısız.",
                id,
                traceId,
                upstreamStatus = sendResult.StatusCode,
                error = sendResult.Error
            });
        }

        return Ok(new { message = "Embed mesajı gönderildi.", id, traceId });
    }

    private async Task<(bool Success, int? StatusCode, string? Error)> SendToBotAsync(
        int id,
        string botWebhookUrl,
        string? botToken,
        string? botClientId,
        string traceId)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var httpClient = _httpClientFactory.CreateClient("BotClient");
            var request = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-embed-message/{id}");

            if (!string.IsNullOrEmpty(botToken))
                request.Headers.Add("X-Bot-Token", botToken);
            if (!string.IsNullOrEmpty(botClientId))
                request.Headers.Add("X-Bot-ClientId", botClientId);

            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            BotHttpHmac.AddSignedHeaders(request, sharedSecret);

            _logger.LogInformation("[EmbedSend] Calling bot. TraceId={TraceId}, Target={Target}", traceId, request.RequestUri?.ToString());
            var response = await httpClient.SendAsync(request);
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[EmbedSend] SUCCESS TraceId={TraceId}, Id={Id}, TotalMs={TotalMs}", traceId, id, sw.ElapsedMilliseconds);
                return (true, (int)response.StatusCode, null);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[EmbedSend] Bot returned error. TraceId={TraceId}, Id={Id}, Status={StatusCode}, TotalMs={TotalMs}, Body={Body}",
                    traceId, id, (int)response.StatusCode, sw.ElapsedMilliseconds, errorContent);
                return (false, (int)response.StatusCode, errorContent);
            }
        }
        catch (HttpRequestException httpEx)
        {
            sw.Stop();
            _logger.LogError(httpEx, "[EmbedSend] HttpRequestException. TraceId={TraceId}, Id={Id}, TotalMs={TotalMs}", traceId, id, sw.ElapsedMilliseconds);
            return (false, null, httpEx.Message);
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            _logger.LogError("[EmbedSend] Timeout calling bot. TraceId={TraceId}, Id={Id}, TotalMs={TotalMs}", traceId, id, sw.ElapsedMilliseconds);
            return (false, null, "Bot çağrısı timeout oldu.");
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "[EmbedSend] Unexpected error. TraceId={TraceId}, Id={Id}, TotalMs={TotalMs}", traceId, id, sw.ElapsedMilliseconds);
            return (false, null, ex.Message);
        }
    }
}