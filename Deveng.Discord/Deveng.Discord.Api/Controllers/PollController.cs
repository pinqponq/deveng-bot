using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using Deveng.Discord.Api.Limits;
using Deveng.Discord.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PollController : ControllerBase
{
    private readonly IPollService _pollService;
    private readonly IConfiguration _configuration;
    private readonly IRedisCacheService _redisCache;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IBotGuildAuthorizationService _botGuildAuthorization;
    private readonly IQuotaService _quota;

    public PollController(
        IPollService pollService,
        IConfiguration configuration,
        IRedisCacheService redisCache,
        IDiscordAuthService discordAuthService,
        IBotGuildAuthorizationService botGuildAuthorization,
        IQuotaService quota)
    {
        _pollService = pollService;
        _configuration = configuration;
        _redisCache = redisCache;
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

    private async Task<ActionResult?> EnsurePollReadAccessAsync(PollDto poll)
    {
        var isBot = HttpContext.Items.ContainsKey("DiscordAuthIsBot") && HttpContext.Items["DiscordAuthIsBot"] is true;
        if (isBot)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, poll.GuildId))
                return Forbid();
            return null;
        }

        if (HttpContext.Items["DiscordUserInfo"] is DiscordUserInfo cachedUser)
        {
            if (!_discordAuthService.HasGuildPermission(cachedUser, poll.GuildId, false)) return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();

        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, poll.GuildId, false)) return Forbid();

        return null;
    }

    private async Task<ActionResult?> EnsurePollSendAccessAsync(PollDto poll)
    {
        var isBot = HttpContext.Items.ContainsKey("DiscordAuthIsBot") && HttpContext.Items["DiscordAuthIsBot"] is true;
        if (isBot)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, poll.GuildId))
                return Forbid();
            return null;
        }

        if (HttpContext.Items["DiscordUserInfo"] is DiscordUserInfo cachedUser)
        {
            if (!_discordAuthService.HasGuildPermission(cachedUser, poll.GuildId, true)) return Forbid();
            return null;
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();

        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        if (!_discordAuthService.HasGuildPermission(userInfo, poll.GuildId, true)) return Forbid();

        return null;
    }

    /// <summary>
    ///     Tüm anketleri getirir (Guild ID ile)
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<PollDto>>> GetAllByGuildId(
        string guildId,
        [FromQuery] int offset = 0,
        [FromQuery] int? limit = null)
    {
        var polls = await _pollService.GetAllPollsByGuildIdAsync(guildId, offset, limit);
        return Ok(polls);
    }

    /// <summary>
    ///     ID ile anket getirir
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet("{id}")]
    public async Task<ActionResult<PollDto>> GetById(int id)
    {
        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var denied = await EnsurePollReadAccessAsync(poll);
        if (denied != null) return denied;

        return Ok(poll);
    }

    /// <summary>
    ///     Kanalda aktif anket getirir
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet("channel/{channelId}/active")]
    public async Task<ActionResult<PollDto>> GetActiveByChannelId(string channelId)
    {
        var poll = await _pollService.GetActivePollByChannelIdAsync(channelId);
        if (poll == null)
            return NotFound($"Aktif anket bulunamadı (ChannelId: {channelId})");

        var denied = await EnsurePollReadAccessAsync(poll);
        if (denied != null) return denied;

        return Ok(poll);
    }

    /// <summary>
    ///     Yeni anket oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<PollDto>> Create([FromBody] CreatePollDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var activeInChannel = await _pollService.GetActivePollByChannelIdAsync(createDto.ChannelId);
        if (activeInChannel != null && activeInChannel.GuildId == createDto.GuildId)
            return Conflict(new
            {
                message =
                    "Bu kanalda zaten aktif bir anket var. Önce mevcut anketi kapatın veya başka bir kanal seçin."
            });

        var current = await _pollService.GetActivePollCountByGuildIdAsync(createDto.GuildId);
        await _quota.EnforceQuotaAsync(createDto.GuildId, FeatureQuota.Poll, current);

        var poll = await _pollService.CreatePollAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = poll.Id }, poll);
    }

    /// <summary>
    ///     Anket günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}")]
    public async Task<ActionResult<PollDto>> Update(string guildId, int id, [FromBody] UpdatePollDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existing = await _pollService.GetPollByIdAsync(id);
        if (existing == null) return NotFound($"Anket bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var poll = await _pollService.UpdatePollAsync(id, updateDto);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        return Ok(poll);
    }

    /// <summary>
    ///     Anket siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/{id}")]
    public async Task<IActionResult> Delete(string guildId, int id)
    {
        var existing = await _pollService.GetPollByIdAsync(id);
        if (existing == null) return NotFound($"Anket bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _pollService.DeletePollAsync(id);
        if (!result)
            return NotFound($"Anket bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Anketin MessageId'sini günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/{id}/messageId")]
    public async Task<IActionResult> UpdateMessageId(string guildId, int id, [FromBody] UpdateMessageIdDto dto)
    {
        var existing = await _pollService.GetPollByIdAsync(id);
        if (existing == null) return NotFound($"Anket bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _pollService.UpdateMessageIdAsync(id, dto.MessageId);
        if (!result)
            return NotFound($"Anket bulunamadı (Id: {id})");

        return NoContent();
    }

    /// <summary>
    ///     Anketi sonlandırır
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/{id}/end")]
    public async Task<IActionResult> EndPoll(string guildId, int id)
    {
        var existing = await _pollService.GetPollByIdAsync(id);
        if (existing == null) return NotFound($"Anket bulunamadı (Id: {id})");
        if (existing.GuildId != guildId) return Forbid();

        var result = await _pollService.EndPollAsync(id);
        if (!result)
            return NotFound($"Anket bulunamadı (Id: {id})");

        return Ok(new { message = "Anket sonlandırıldı" });
    }

    /// <summary>
    ///     Oy ekler
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [EnableRateLimiting("poll-vote")]
    [HttpPost("{id}/vote")]
    public async Task<IActionResult> AddVote(int id, [FromBody] PollVoteDto voteDto)
    {
        if (voteDto.PollId != id)
            return BadRequest(new { message = "PollId uyuşmuyor" });

        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var (userId, denied) = await ResolvePollVoteUserIdAsync(poll, voteDto.UserId);
        if (denied != null) return denied;

        var result = await _pollService.AddVoteAsync(voteDto.PollId, voteDto.OptionId, userId);
        if (!result)
            return BadRequest(new { message = "Oy eklenemedi. Zaten oy kullanmış olabilirsiniz." });

        return Ok(new { message = "Oy eklendi" });
    }

    /// <summary>
    ///     Oy kaldırır
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [EnableRateLimiting("poll-vote")]
    [HttpDelete("{id}/vote")]
    public async Task<IActionResult> RemoveVote(int id, [FromBody] PollVoteDto voteDto)
    {
        if (voteDto.PollId != id)
            return BadRequest(new { message = "PollId uyuşmuyor" });

        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var (userId, denied) = await ResolvePollVoteUserIdAsync(poll, voteDto.UserId);
        if (denied != null) return denied;

        await _pollService.RemoveVoteAsync(voteDto.PollId, voteDto.OptionId, userId);
        return Ok(new { message = "Oy kaldırıldı" });
    }

    private async Task<(string UserId, IActionResult? Denied)> ResolvePollVoteUserIdAsync(PollDto poll, string requestedUserId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            if (!await _botGuildAuthorization.IsBotAuthorizedForGuildAsync(botClientId, poll.GuildId))
                return (string.Empty, Forbid());

            if (string.IsNullOrWhiteSpace(requestedUserId))
                return (string.Empty, BadRequest(new { message = "UserId zorunludur." }));

            return (requestedUserId.Trim(), null);
        }

        if (HttpContext.Items["DiscordUserInfo"] is DiscordUserInfo cachedVoteUser)
        {
            if (!_discordAuthService.HasGuildPermission(cachedVoteUser, poll.GuildId, false))
                return (string.Empty, Forbid());
            return (cachedVoteUser.UserId, null);
        }

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return (string.Empty, Unauthorized());
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return (string.Empty, Unauthorized());
        if (!_discordAuthService.HasGuildPermission(userInfo, poll.GuildId, false))
            return (string.Empty, Forbid());

        return (userInfo.UserId, null);
    }

    /// <summary>
    ///     Anket sonuçlarını getirir
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet("{id}/result")]
    public async Task<ActionResult<PollResultDto>> GetResult(int id)
    {
        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var denied = await EnsurePollReadAccessAsync(poll);
        if (denied != null) return denied;

        var result = await _pollService.GetPollResultAsync(id);
        if (result == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        return Ok(result);
    }

    /// <summary>
    ///     Kullanıcının bir anketteki oylarını getirir (kullanıcı yalnızca kendi; bot tüm kullanıcılar)
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet("{pollId}/user/{userId}/votes")]
    public async Task<ActionResult<List<int>>> GetUserVotes(int pollId, string userId)
    {
        var poll = await _pollService.GetPollByIdAsync(pollId);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {pollId})");

        var isBot = HttpContext.Items.ContainsKey("DiscordAuthIsBot") && HttpContext.Items["DiscordAuthIsBot"] is true;
        if (!isBot)
        {
            var callerId = HttpContext.Items["DiscordUserId"]?.ToString();
            if (string.IsNullOrEmpty(callerId) || callerId != userId)
                return Forbid();
        }

        var denied = await EnsurePollReadAccessAsync(poll);
        if (denied != null) return denied;

        var votes = await _pollService.GetUserVotesForPollAsync(pollId, userId);
        return Ok(votes);
    }

    /// <summary>
    ///     Anketi kanala gönderir (Bot'a HTTP isteği gönderir)
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [EnableRateLimiting("poll-send")]
    [HttpPost("{id}/send")]
    public async Task<IActionResult> SendToChannel(int id, CancellationToken cancellationToken = default)
    {
        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var authz = await EnsurePollSendAccessAsync(poll);
        if (authz != null) return authz;

        if (!string.IsNullOrWhiteSpace(poll.MessageId))
            return Conflict(new { message = "Bu anket zaten kanala gönderilmiş.", code = "already_sent" });

        var cooldownSeconds = Math.Clamp(_configuration.GetValue("Poll:SendCooldownSeconds", 45), 0, 600);
        var lockKey = $"poll:send:lock:{poll.GuildId}:{id}";
        var gotLock = await _redisCache.TryAcquireDistributedLockAsync(lockKey, TimeSpan.FromMinutes(3), cancellationToken);
        if (!gotLock)
            return StatusCode(StatusCodes.Status409Conflict,
                ApiErrorResponse.Problem("send_in_progress", "Bu anket için gönderim zaten sürüyor veya kilit alınamadı.",
                    HttpContext.TraceIdentifier));

        try
        {
            poll = await _pollService.GetPollByIdAsync(id);
            if (poll == null)
                return NotFound($"Anket bulunamadı (Id: {id})");

            if (!string.IsNullOrWhiteSpace(poll.MessageId))
                return Conflict(new { message = "Bu anket zaten kanala gönderilmiş.", code = "already_sent" });

            if (cooldownSeconds > 0)
            {
                var cooldownKey = $"poll:sendCooldown:{poll.GuildId}";
                try
                {
                    var state = await _redisCache.GetAsync<PollSendCooldownState>(cooldownKey, cancellationToken);
                    if (state != null && state.WaitUntilUtc > DateTime.UtcNow)
                    {
                        var retryAfter = (int)Math.Ceiling((state.WaitUntilUtc - DateTime.UtcNow).TotalSeconds);
                        retryAfter = Math.Max(1, retryAfter);
                        Response.Headers.Append("Retry-After", retryAfter.ToString());
                        return StatusCode(429,
                            new
                            {
                                message = $"Çok sık anket gönderiyorsunuz. {retryAfter} saniye sonra tekrar deneyin.",
                                retryAfterSeconds = retryAfter
                            });
                    }
                }
                catch
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable,
                        ApiErrorResponse.Problem("redis_unavailable", "Redis geçici olarak kullanılamıyor.", HttpContext.TraceIdentifier));
                }
            }

            var botClientId = HttpContext.Items["BotClientId"]?.ToString();
            var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");

            try
            {
                var botWebhookUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
                if (string.IsNullOrEmpty(botWebhookUrl))
                    return StatusCode(503,
                        ApiErrorResponse.Problem("bot_url_missing",
                            "Bot:HttpServerUrl yapılandırması bulunamadı.", HttpContext.TraceIdentifier));

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var request = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-poll/{id}");

                if (!string.IsNullOrEmpty(botToken)) request.Headers.Add("X-Bot-Token", botToken);
                if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

                var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
                BotHttpHmac.AddSignedHeaders(request, sharedSecret);

                var response = await httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (cooldownSeconds > 0)
                    {
                        var cooldownKey = $"poll:sendCooldown:{poll.GuildId}";
                        try
                        {
                            var waitUntil = DateTime.UtcNow.AddSeconds(cooldownSeconds);
                            await _redisCache.SetAsync(cooldownKey, new PollSendCooldownState { WaitUntilUtc = waitUntil },
                                TimeSpan.FromSeconds(cooldownSeconds + 120), cancellationToken);
                        }
                        catch
                        {
                            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                                ApiErrorResponse.Problem("redis_unavailable", "Redis yazılamadı.", HttpContext.TraceIdentifier));
                        }
                    }

                    return Ok(new { message = "Anket gönderildi", id, response = responseContent, cooldownSeconds });
                }

                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
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
        finally
        {
            await _redisCache.DeleteAsync(lockKey, cancellationToken);
        }
    }

    /// <summary>
    ///     Anket sonuç mesajını kanala gönderir (Bot'a HTTP isteği gönderir)
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [EnableRateLimiting("poll-send")]
    [HttpPost("{id}/send-result")]
    public async Task<IActionResult> SendResultToChannel(int id)
    {
        var poll = await _pollService.GetPollByIdAsync(id);
        if (poll == null)
            return NotFound($"Anket bulunamadı (Id: {id})");

        var authz = await EnsurePollSendAccessAsync(poll);
        if (authz != null) return authz;

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

            var request = new HttpRequestMessage(HttpMethod.Post, $"{botWebhookUrl}/api/bot/send-poll-result/{id}");

            if (!string.IsNullOrEmpty(botToken)) request.Headers.Add("X-Bot-Token", botToken);
            if (!string.IsNullOrEmpty(botClientId)) request.Headers.Add("X-Bot-ClientId", botClientId);

            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            BotHttpHmac.AddSignedHeaders(request, sharedSecret);

            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                return Ok(new { message = "Anket sonuç mesajı gönderildi", id, response = responseContent });
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
