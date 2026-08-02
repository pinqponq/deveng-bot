using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatisticsChannelController : ControllerBase
{
    private readonly IStatisticsChannelService _statisticsChannelService;
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly ILogger<StatisticsChannelController> _logger;
    private readonly IQuotaService _quota;

    public StatisticsChannelController(
        IStatisticsChannelService statisticsChannelService,
        IConfiguration configuration,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        ILogger<StatisticsChannelController> logger,
        IQuotaService quota)
    {
        _statisticsChannelService = statisticsChannelService;
        _configuration = configuration;
        _discordAuthService = discordAuthService;
        _botGuildAuthorization = botGuildAuthorization;
        _logger = logger;
        _quota = quota;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    private async Task<ActionResult?> EnsureStatisticsChannelReadAsync(StatisticsChannelDto channel)
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

    /// <summary>
    ///     Tüm istatistik kanallarını getirir (bot iç kullanımı; kullanıcı istekleri guildId filtresi gerektirir)
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<StatisticsChannelDto>>> GetAll([FromQuery] string? guildId)
    {
        var channels = await _statisticsChannelService.GetAllStatisticsChannelsAsync();

        var callerId = HttpContext.Items["DiscordUserId"]?.ToString();
        if (callerId != null)
        {
            if (string.IsNullOrEmpty(guildId))
                return BadRequest(new { message = "guildId parametresi zorunludur" });
            return Ok(channels.Where(c => c.GuildId == guildId));
        }

        return Ok(channels);
    }

    /// <summary>
    ///     Guild ID'ye göre tüm istatistik kanallarını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<StatisticsChannelDto>>> GetByGuildId(string guildId)
    {
        var channels = await _statisticsChannelService.GetEnabledStatisticsChannelsByGuildIdAsync(guildId);
        return Ok(channels);
    }

    /// <summary>
    ///     Guild ID ve Counter Type'a göre istatistik kanalını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/type/{counterType}")]
    public async Task<ActionResult<StatisticsChannelDto>> GetByGuildIdAndType(string guildId, string counterType)
    {
        var channel = await _statisticsChannelService.GetStatisticsChannelByGuildIdAndTypeAsync(guildId, counterType);
        if (channel == null)
            return NotFound($"İstatistik kanalı bulunamadı (GuildId: {guildId}, CounterType: {counterType})");

        return Ok(channel);
    }

    /// <summary>
    ///     ID'ye göre istatistik kanalını getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet("{id}")]
    public async Task<ActionResult<StatisticsChannelDto>> GetById(int id)
    {
        var channel = await _statisticsChannelService.GetStatisticsChannelByIdAsync(id);
        if (channel == null)
            return NotFound($"İstatistik kanalı bulunamadı (Id: {id})");

        var denied = await EnsureStatisticsChannelReadAsync(channel);
        if (denied != null) return denied;

        return Ok(channel);
    }

    /// <summary>
    ///     Yeni istatistik kanalı oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<StatisticsChannelDto>> Create([FromBody] CreateStatisticsChannelDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (HttpContext.Items["DiscordAuthIsBot"] is not true)
        {
            var current = (await _statisticsChannelService.GetEnabledStatisticsChannelsByGuildIdAsync(createDto.GuildId)).Count;
            await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.StatisticsChannel, current);
        }

        if (string.IsNullOrWhiteSpace(createDto.ChannelId))
            try
            {
                var botClientId = HttpContext.Items["BotClientId"]?.ToString();

                var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
                if (string.IsNullOrEmpty(botWebhookUrl))
                    return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var requestBody = new
                {
                    counterType = createDto.CounterType,
                    channelNameFormat = createDto.ChannelName
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{botWebhookUrl}/api/bot/create-statistics-channel/{createDto.GuildId}")
                {
                    Content = content
                };

                if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

                var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
                BotHttpHmac.AddSignedHeaders(request, sharedSecret, jsonContent);

                var response = await httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<JsonElement>(responseContent);

                    if (result.TryGetProperty("channelId", out var channelIdElement))
                        createDto.ChannelId = channelIdElement.GetString() ?? string.Empty;

                    if (result.TryGetProperty("channelName", out var channelNameElement))
                        createDto.ChannelName = channelNameElement.GetString();

                    _logger.LogInformation("[Statistics] Bot'tan kanal oluşturuldu GuildId={GuildId} CounterType={CounterType}", createDto.GuildId, createDto.CounterType);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Statistics] Bot kanal oluşturma başarısız GuildId={GuildId} Status={Status} Body={Body}", createDto.GuildId, (int)response.StatusCode, errorContent);
                    return BadRequest(new { message = "Bot'tan kanal oluşturulamadı.", traceId = HttpContext.TraceIdentifier });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Statistics] Bot kanal oluşturma hata GuildId={GuildId}", createDto.GuildId);
                return BadRequest(new { message = "Bot'tan kanal oluşturulamadı.", traceId = HttpContext.TraceIdentifier });
            }

        var channel = await _statisticsChannelService.CreateStatisticsChannelAsync(createDto);

        if (channel.Enabled)
            try
            {
                var botClientId = HttpContext.Items["BotClientId"]?.ToString();

                var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
                if (string.IsNullOrEmpty(botWebhookUrl))
                    return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var requestBody = new
                {
                    counterType = channel.CounterType
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{botWebhookUrl}/api/bot/update-statistics-channel/{channel.GuildId}")
                {
                    Content = content
                };

                if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

                var sharedSecretCreateNotify = _configuration["Bot:SharedSecret"] ?? string.Empty;
                BotHttpHmac.AddSignedHeaders(request, sharedSecretCreateNotify, jsonContent);

                var response = await httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[Statistics] Bot güncelleme bildirimi gönderildi GuildId={GuildId} CounterType={CounterType}", channel.GuildId, channel.CounterType);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Statistics] Bot güncelleme bildirimi başarısız GuildId={GuildId} Status={Status} Body={Body}", channel.GuildId, (int)response.StatusCode, errorContent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Statistics] Bot güncelleme bildirimi gönderilemedi GuildId={GuildId}", channel.GuildId);
            }

        return CreatedAtAction(nameof(GetById), new { id = channel.Id }, channel);
    }

    /// <summary>
    ///     İstatistik kanalını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<StatisticsChannelDto>> Update(string guildId, int id,
        [FromBody] UpdateStatisticsChannelDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingChannel = await _statisticsChannelService.GetStatisticsChannelByIdAsync(id);
        if (existingChannel == null) return NotFound($"İstatistik kanalı bulunamadı (Id: {id})");
        if (existingChannel.GuildId != guildId) return Forbid();

        var channel = await _statisticsChannelService.UpdateStatisticsChannelAsync(id, updateDto);
        if (channel == null)
            return NotFound($"İstatistik kanalı bulunamadı (Id: {id})");

        if (channel.Enabled)
            try
            {
                var botClientId = HttpContext.Items["BotClientId"]?.ToString();

                var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
                if (string.IsNullOrEmpty(botWebhookUrl))
                    return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var requestBody = new
                {
                    counterType = channel.CounterType
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{botWebhookUrl}/api/bot/update-statistics-channel/{channel.GuildId}")
                {
                    Content = content
                };

                if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

                var sharedSecretUpdate = _configuration["Bot:SharedSecret"] ?? string.Empty;
                BotHttpHmac.AddSignedHeaders(request, sharedSecretUpdate, jsonContent);

                var response = await httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[Statistics] Bot güncelleme bildirimi gönderildi GuildId={GuildId} CounterType={CounterType}", channel.GuildId, channel.CounterType);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Statistics] Bot güncelleme bildirimi başarısız GuildId={GuildId} Status={Status} Body={Body}", channel.GuildId, (int)response.StatusCode, errorContent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Statistics] Bot güncelleme bildirimi gönderilemedi GuildId={GuildId}", channel.GuildId);
            }

        return Ok(channel);
    }

    /// <summary>
    ///     "Rekor Çevrimiçi" sayacı için anlık online değerini kalıcı tepe ile karşılaştırır
    ///     ve sonuçtaki tepe (max) değerini döndürür. Bot tarafından çağrılır.
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/peak")]
    public async Task<ActionResult> UpdatePeak(string guildId, [FromBody] UpdateStatisticsChannelPeakDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var counterType = dto.CounterType?.Trim();
        if (string.IsNullOrEmpty(counterType))
            return BadRequest(new { message = "counterType zorunludur" });

        if (dto.CurrentOnline < 0)
            return BadRequest(new { message = "currentOnline negatif olamaz" });

        var peak = await _statisticsChannelService.UpdateAndGetPeakOnlineAsync(guildId, counterType, dto.CurrentOnline);
        return Ok(new { peakOnlineCount = peak });
    }

    /// <summary>
    ///     İstatistik kanalını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var channel = await _statisticsChannelService.GetStatisticsChannelByIdAsync(id);
        if (channel == null)
            return NotFound($"İstatistik kanalı bulunamadı (Id: {id})");
        if (channel.GuildId != guildId) return Forbid();

        try
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();

            var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
            if (string.IsNullOrEmpty(botWebhookUrl))
                return StatusCode(503, new { message = "Bot:HttpServerUrl yapılandırması bulunamadı. appsettings.json içinde Bot:HttpServerUrl ayarlayın." });

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            var requestBody = new
            {
                channelId = channel.ChannelId
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post,
                $"{botWebhookUrl}/api/bot/delete-statistics-channel/{channel.GuildId}")
            {
                Content = content
            };

            if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

            var sharedSecretDelete = _configuration["Bot:SharedSecret"] ?? string.Empty;
            BotHttpHmac.AddSignedHeaders(request, sharedSecretDelete, jsonContent);

            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Statistics] Bot silme bildirimi gönderildi GuildId={GuildId} ChannelId={ChannelId}", channel.GuildId, channel.ChannelId);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Statistics] Bot silme bildirimi başarısız GuildId={GuildId} Status={Status} Body={Body}", channel.GuildId, (int)response.StatusCode, errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Statistics] Bot silme bildirimi gönderilemedi GuildId={GuildId}", channel.GuildId);
        }

        var result = await _statisticsChannelService.DeleteStatisticsChannelAsync(id);
        if (!result)
            return NotFound($"İstatistik kanalı bulunamadı (Id: {id})");

        return NoContent();
    }
}