using System.Text.Json;
using System.Threading.Channels;
using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Filters;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Services;
using Deveng.Shared.Redis.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(MusicExceptionFilter))]
public class MusicController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IMusicService _musicService;
    private readonly IRedisConnectionService _redis;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public MusicController(IMusicService musicService, IRedisConnectionService redis, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _musicService = musicService;
        _redis = redis;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/settings")]
    public Task<MusicSettingsDto> GetSettings(string guildId, CancellationToken ct)
    {
        return _musicService.GetSettingsAsync(guildId, ct);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/settings")]
    public Task<MusicSettingsDto> UpdateSettings(string guildId, [FromBody] UpdateMusicSettingsDto dto, CancellationToken ct)
    {
        return _musicService.UpdateSettingsAsync(guildId, dto, ct);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/state")]
    public async Task<ActionResult<MusicStateDto>> GetState(string guildId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.GetStateAsync(guildId, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-search")]
    [HttpGet("guild/{guildId}/search")]
    public async Task<ActionResult<MusicSearchResponseDto>> Search(string guildId, [FromQuery] string query, [FromQuery] string source = "auto", CancellationToken ct = default)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.SearchAsync(guildId, query, source, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/play")]
    public async Task<ActionResult<MusicStateDto>> Play(string guildId, [FromBody] MusicPlayRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.PlayAsync(guildId, dto, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/play/bulk")]
    public async Task<ActionResult<MusicStateDto>> BulkPlay(string guildId, [FromBody] MusicBulkPlayRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.BulkPlayAsync(guildId, dto, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/control")]
    public async Task<ActionResult<MusicStateDto>> Control(string guildId, [FromBody] MusicControlRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.ControlAsync(guildId, dto, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/queue")]
    public async Task<ActionResult<MusicStateDto>> QueueOperation(string guildId, [FromBody] MusicQueueOperationDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.QueueOperationAsync(guildId, dto, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/lyrics")]
    public async Task<ActionResult<MusicLyricsResponseDto>> Lyrics(string guildId, [FromQuery] string? query, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.LyricsAsync(guildId, query, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/favorite")]
    public async Task<ActionResult<MusicFavoriteResponseDto>> ToggleFavorite(string guildId, [FromBody] MusicFavoriteRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.ToggleFavoriteAsync(guildId, dto, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/favorites")]
    public async Task<ActionResult<MusicTrackListResponseDto>> Favorites(string guildId, [FromQuery] string userId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.GetFavoritesAsync(guildId, userId, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/history")]
    public async Task<ActionResult<MusicHistoryResponseDto>> History(string guildId, [FromQuery] string? userId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.GetHistoryAsync(guildId, userId, GetBotClientId(), ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/history")]
    public async Task<IActionResult> RecordHistory(string guildId, [FromBody] MusicHistoryRecordRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        await _musicService.RecordHistoryAsync(guildId, dto, ct);
        return NoContent();
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/playlists")]
    public async Task<ActionResult<MusicPlaylistListResponseDto>> Playlists(string guildId, [FromQuery] string? userId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.GetPlaylistsAsync(guildId, userId, ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/playlists/{playlistId:int}")]
    public async Task<ActionResult<MusicPlaylistDto>> Playlist(string guildId, int playlistId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        var playlist = await _musicService.GetPlaylistAsync(guildId, playlistId, ct);
        return playlist == null ? NotFound(new { message = "Playlist bulunamadı." }) : Ok(playlist);
    }

    [DiscordAuth]
    [EnableRateLimiting("music-search")]
    [HttpGet("guild/{guildId}/playlist-preview")]
    public async Task<ActionResult<MusicPlaylistPreviewDto>> PreviewPlaylist(string guildId, [FromQuery] string url, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        var userId = HttpContext.Items["DiscordUserId"]?.ToString();
        return Ok(await _musicService.PreviewPlaylistAsync(guildId, url, userId, ct));
    }

    [RequireDiscordUser]
    [HttpGet("spotify/status")]
    public Task<SpotifyLinkStatusDto> SpotifyStatus(CancellationToken ct)
    {
        var userId = RequireActorUserId();
        return _musicService.GetSpotifyLinkStatusAsync(userId, ct);
    }

    [RequireDiscordUser]
    [HttpGet("spotify/connect")]
    public Task<SpotifyConnectUrlDto> SpotifyConnect([FromQuery] string? guildId, [FromQuery] string? returnPath, CancellationToken ct)
    {
        return _musicService.CreateSpotifyConnectUrlAsync(RequireActorUserId(), guildId, returnPath, ct);
    }

    /// <summary>
    /// Spotify OAuth dönüşü: kimlik Redis state’teki DiscordUserId ile bağlanır (oturum cookie’si
    /// localhost↔127.0.0.1 / cross-site dönüşünde kaybolabilir). State tek kullanımlık + tahmin edilemez.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("spotify/callback")]
    [EnableRateLimiting("music-control")]
    public Task<SpotifyLinkStatusDto> SpotifyCallback([FromBody] SpotifyOAuthCallbackDto dto, CancellationToken ct)
    {
        return _musicService.CompleteSpotifyOAuthAsync(dto.Code, dto.State, ct);
    }

    [RequireDiscordUser]
    [HttpDelete("spotify/disconnect")]
    public async Task<IActionResult> SpotifyDisconnect(CancellationToken ct)
    {
        await _musicService.DisconnectSpotifyAsync(RequireActorUserId(), ct);
        return NoContent();
    }

    [RequireDiscordUser]
    [HttpGet("spotify/playlists")]
    public Task<SpotifyRemotePlaylistListDto> SpotifyPlaylists(CancellationToken ct)
    {
        return _musicService.ListSpotifyPlaylistsAsync(RequireActorUserId(), ct);
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpPost("guild/{guildId}/import")]
    public async Task<ActionResult<MusicPlaylistImportJobDto>> ImportPlaylist(string guildId, [FromBody] MusicPlaylistImportRequestDto dto, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            if (string.IsNullOrWhiteSpace(dto.OwnerUserId))
                throw new InvalidOperationException("Bot import için ownerUserId gerekli.");
        }
        else
        {
            dto.OwnerUserId = RequireActorUserId();
        }
        return Ok(await _musicService.ImportPlaylistAsync(guildId, dto, ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/import/{jobId:long}")]
    public async Task<ActionResult<MusicPlaylistImportJobDto>> ImportJob(string guildId, long jobId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        var job = await _musicService.GetImportJobAsync(guildId, jobId, ct);
        return job == null ? NotFound(new { message = "Import işi bulunamadı." }) : Ok(job);
    }

    [DiscordAuth]
    [EnableRateLimiting("music-control")]
    [HttpGet("guild/{guildId}/radio")]
    public async Task<ActionResult<MusicRadioStationsResponseDto>> Radio(string guildId, [FromQuery] string? query, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        return Ok(await _musicService.GetRadioStationsAsync(guildId, query, ct));
    }

    [DiscordAuth]
    [EnableRateLimiting("music-events")]
    [HttpGet("guild/{guildId}/events")]
    public async Task<IActionResult> Events(string guildId, CancellationToken ct)
    {
        var denied = await DenyIfNotDjAsync(guildId, ct);
        if (denied != null) return denied;
        var channelName = $"music:events:{guildId}";
        var redisChannel = StackExchange.Redis.RedisChannel.Literal(channelName);
        var messages = Channel.CreateUnbounded<string>();
        var subscriber = _redis.GetConnection().GetSubscriber();
        try
        {
            await subscriber.SubscribeAsync(redisChannel, (_, value) =>
            {
                if (!value.IsNullOrEmpty)
                    messages.Writer.TryWrite(value.ToString());
            });

            Response.Headers.CacheControl = "no-cache";
            Response.Headers.Connection = "keep-alive";
            Response.ContentType = "text/event-stream";

            await Response.WriteAsync("event: ready\n", ct);
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(new { guildId }, JsonOptions)}\n\n", ct);
            await Response.Body.FlushAsync(ct);

            try
            {
                using var heartbeat = new PeriodicTimer(TimeSpan.FromSeconds(25));
                var readTask = messages.Reader.WaitToReadAsync(ct).AsTask();
                var heartbeatTask = heartbeat.WaitForNextTickAsync(ct).AsTask();
                while (!ct.IsCancellationRequested)
                {
                    var completed = await Task.WhenAny(readTask, heartbeatTask);

                    if (completed == heartbeatTask)
                    {
                        if (!await heartbeatTask)
                            break;

                        await Response.WriteAsync("event: heartbeat\n", ct);
                        await Response.WriteAsync($"data: {JsonSerializer.Serialize(new { guildId, at = DateTimeOffset.UtcNow }, JsonOptions)}\n\n", ct);
                        await Response.Body.FlushAsync(ct);
                        heartbeatTask = heartbeat.WaitForNextTickAsync(ct).AsTask();
                        continue;
                    }

                    if (!await readTask)
                        break;

                    while (messages.Reader.TryRead(out var message))
                    {
                        await Response.WriteAsync("event: music\n", ct);
                        await Response.WriteAsync($"data: {message}\n\n", ct);
                        await Response.Body.FlushAsync(ct);
                    }

                    readTask = messages.Reader.WaitToReadAsync(ct).AsTask();
                }
            }
            finally
            {
                messages.Writer.TryComplete();
                await subscriber.UnsubscribeAsync(redisChannel);
            }
        }
        catch (OperationCanceledException)
        {
            return new EmptyResult();
        }
        catch (StackExchange.Redis.RedisServerException ex) when (ex.Message.Contains("NOPERM", StringComparison.OrdinalIgnoreCase))
        {
            messages.Writer.TryComplete();
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Müzik canlı olay akışı Redis kanal yetkisi nedeniyle açılamadı.",
                error = "Redis pub/sub channel ACL missing",
                channel = channelName
            });
        }
        catch (Exception ex) when (!Response.HasStarted)
        {
            messages.Writer.TryComplete();
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Müzik canlı olay akışı şu an açılamadı.",
                error = ex.Message
            });
        }

        return new EmptyResult();
    }

    private string? GetBotClientId()
    {
        return HttpContext.Items["BotClientId"]?.ToString()
               ?? Request.Headers["X-Bot-ClientId"].FirstOrDefault();
    }

    private string RequireActorUserId()
    {
        var userId = HttpContext.Items["DiscordUserId"]?.ToString();
        if (string.IsNullOrWhiteSpace(userId))
            throw new InvalidOperationException("Discord kullanıcı oturumu gerekli.");
        return userId;
    }

    private async Task<ActionResult?> DenyIfNotDjAsync(string guildId, CancellationToken ct)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true) return null;
        var settings = await _musicService.GetSettingsAsync(guildId, ct);
        if (!settings.Enabled || !settings.RequireDjRole) return null;
        if (!settings.SetupCompleted || string.IsNullOrWhiteSpace(settings.DjRoleId))
            throw new MusicSetupRequiredException(settings);
        var userId = HttpContext.Items["DiscordUserId"]?.ToString();
        if (string.IsNullOrWhiteSpace(userId))
            return StatusCode(StatusCodes.Status403Forbidden, new { code = "dj_role_required", message = "DJ rolün yok." });

        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        if (string.IsNullOrWhiteSpace(botToken))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "DJ rolü doğrulanamadı." });

        var cacheKey = $"music:dj-authz:{guildId}:{userId}:{settings.DjRoleId}";
        var cached = await _redis.GetConnection().GetDatabase().StringGetAsync(cacheKey);
        if (cached.HasValue) return cached.ToString() == "1" ? null : StatusCode(StatusCodes.Status403Forbidden, new { code = "dj_role_required", message = "DJ rolün yok." });

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://discord.com/api/v10/guilds/{guildId}/members/{userId}");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bot", botToken);
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            return StatusCode(StatusCodes.Status403Forbidden, new { code = "dj_role_required", message = "DJ rolün yok." });
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var allowed = document.RootElement.TryGetProperty("roles", out var roles) &&
                      roles.ValueKind == JsonValueKind.Array &&
                      roles.EnumerateArray().Any(role => string.Equals(role.GetString(), settings.DjRoleId, StringComparison.Ordinal));
        await _redis.GetConnection().GetDatabase().StringSetAsync(cacheKey, allowed ? "1" : "0",
            new StackExchange.Redis.Expiration(TimeSpan.FromMinutes(3)));
        return allowed ? null : StatusCode(StatusCodes.Status403Forbidden, new { code = "dj_role_required", message = "DJ rolün yok." });
    }
}
