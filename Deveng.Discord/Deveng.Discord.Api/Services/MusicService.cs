using System.Text;
using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class BotMusicException : InvalidOperationException
{
    public BotMusicException(int statusCode, string message, string responseBody)
        : base(message)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }

    public int StatusCode { get; }
    public string ResponseBody { get; }
}

public class MusicSetupRequiredException : InvalidOperationException
{
    public MusicSetupRequiredException(MusicSettingsDto settings)
        : base("setup_required: Müzik özelliğini kullanmadan önce DJ rolü seçilmelidir.")
    {
        Settings = settings;
    }

    public MusicSettingsDto Settings { get; }
}

public class MusicService : IMusicService
{
    private const string FeatureName = "Music";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IRedisCacheService _cache;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly DevengDbContext _db;

    public MusicService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IRedisCacheService cache,
        IGuildFeatureService guildFeatureService,
        DevengDbContext db)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _cache = cache;
        _guildFeatureService = guildFeatureService;
        _db = db;
    }

    public async Task<MusicSettingsDto> GetSettingsAsync(string guildId, CancellationToken ct = default)
    {
        var settings = await ReadSettingsAsync(guildId, ct);
        settings.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        settings.SpotifyConfigured = HasSpotifyCredentials();
        return settings;
    }

    public async Task<MusicSettingsDto> UpdateSettingsAsync(string guildId, UpdateMusicSettingsDto dto, CancellationToken ct = default)
    {
        var settings = await GetSettingsAsync(guildId, ct);
        settings.DefaultVolume = Clamp(dto.DefaultVolume ?? settings.DefaultVolume, 0, 150);
        settings.MaxQueueSize = Clamp(dto.MaxQueueSize ?? settings.MaxQueueSize, 1, 500);
        settings.DjRoleId = NormalizeNullable(dto.DjRoleId, settings.DjRoleId);
        settings.RequireDjRole = dto.RequireDjRole ?? settings.RequireDjRole;
        settings.AllowEveryoneToPlay = dto.AllowEveryoneToPlay ?? settings.AllowEveryoneToPlay;
        settings.AllowedTextChannelId = NormalizeNullable(dto.AllowedTextChannelId, settings.AllowedTextChannelId);
        settings.AutoLeaveSeconds = Clamp(dto.AutoLeaveSeconds ?? settings.AutoLeaveSeconds, 30, 3600);
        settings.AnnounceNowPlaying = dto.AnnounceNowPlaying ?? settings.AnnounceNowPlaying;
        settings.Autoplay = true;
        settings.PreventDuplicates = dto.PreventDuplicates ?? settings.PreventDuplicates;
        settings.DjOnly = dto.DjOnly ?? settings.DjOnly;
        settings.DjPlaylists = dto.DjPlaylists ?? settings.DjPlaylists;
        settings.MaxUserSongs = Clamp(dto.MaxUserSongs ?? settings.MaxUserSongs, 1, 500);
        settings.PlaylistLimit = Clamp(dto.PlaylistLimit ?? settings.PlaylistLimit, 1, 50);
        settings.PlaylistTrackLimit = Clamp(dto.PlaylistTrackLimit ?? settings.PlaylistTrackLimit, 1, 500);
        settings.FavoriteLimit = Clamp(dto.FavoriteLimit ?? settings.FavoriteLimit, 1, 500);
        settings.ImportTrackLimit = Clamp(dto.ImportTrackLimit ?? settings.ImportTrackLimit, 1, 500);
        settings.RadioEnabled = true;
        if (dto.BlacklistedTextChannelIds != null)
            settings.BlacklistedTextChannelIds = dto.BlacklistedTextChannelIds;
        settings.SetupCompleted = dto.SetupCompleted ?? !string.IsNullOrWhiteSpace(settings.DjRoleId);
        if (settings.RequireDjRole && string.IsNullOrWhiteSpace(settings.DjRoleId))
            settings.SetupCompleted = false;
        await UpsertSettingsAsync(settings, ct);
        return settings;
    }

    public async Task<MusicStateDto> GetStateAsync(string guildId, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        return await SendBotAsync<MusicStateDto>(HttpMethod.Get, guildId, "state", null, botClientId, ct);
    }

    public async Task<MusicSearchResponseDto> SearchAsync(string guildId, string query, string source, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var q = (query ?? string.Empty).Trim();
        var isSpotifyUrl = q.Contains("open.spotify.com", StringComparison.OrdinalIgnoreCase)
            || q.StartsWith("spotify:", StringComparison.OrdinalIgnoreCase);
        if (isSpotifyUrl || string.Equals(source, "spotify", StringComparison.OrdinalIgnoreCase))
        {
            if (!HasSpotifyCredentials())
            {
                throw new InvalidOperationException(
                    "Spotify kimlik bilgileri eksik. Kök .env dosyasına SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET ekleyip api + lavalink’i yeniden başlatın (https://developer.spotify.com/dashboard).");
            }

            if (isSpotifyUrl && ExtractSpotifyId(q, "playlist") is not null)
            {
                throw new InvalidOperationException(
                    "Spotify playlist araması için Playlists sekmesinden içe aktarın. Önce Spotify hesabınızı bağlayın.");
            }

            if (isSpotifyUrl && ExtractSpotifyId(q, "track") is { } trackId)
            {
                using var trackDoc = await SpotifyGetAsync($"/v1/tracks/{Uri.EscapeDataString(trackId)}?market={SpotifyMarket}", null, ct);
                return new MusicSearchResponseDto { Tracks = [MapSpotifyTrack(trackDoc.RootElement)] };
            }

            if (string.Equals(source, "spotify", StringComparison.OrdinalIgnoreCase) && !isSpotifyUrl)
            {
                return new MusicSearchResponseDto { Tracks = await SearchSpotifyTracksAsync(q, ct) };
            }
        }

        var action = $"search?query={Uri.EscapeDataString(q)}&source={Uri.EscapeDataString(source)}";
        return await SendBotAsync<MusicSearchResponseDto>(HttpMethod.Get, guildId, action, null, botClientId, ct);
    }

    public async Task<MusicStateDto> PlayAsync(string guildId, MusicPlayRequestDto dto, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        if (string.IsNullOrWhiteSpace(dto.TextChannelId))
        {
            var settings = await ReadSettingsAsync(guildId, ct);
            dto.TextChannelId = settings.AllowedTextChannelId;
        }
        return await SendBotAsync<MusicStateDto>(HttpMethod.Post, guildId, "play", dto, botClientId, ct);
    }

    public async Task<MusicStateDto> BulkPlayAsync(string guildId, MusicBulkPlayRequestDto dto, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var settings = await ReadSettingsAsync(guildId, ct);
        if (dto.Tracks.Count == 0)
            throw new InvalidOperationException("Kuyruğa alınacak şarkı bulunamadı.");
        if (dto.Tracks.Count > settings.PlaylistTrackLimit)
            throw new InvalidOperationException($"Bu işlem en fazla {settings.PlaylistTrackLimit} şarkı için yapılabilir.");
        if (string.IsNullOrWhiteSpace(dto.TextChannelId))
            dto.TextChannelId = settings.AllowedTextChannelId;
        return await SendBotAsync<MusicStateDto>(HttpMethod.Post, guildId, "play/bulk", dto, botClientId, ct);
    }

    public async Task<MusicStateDto> ControlAsync(string guildId, MusicControlRequestDto dto, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        return await SendBotAsync<MusicStateDto>(HttpMethod.Post, guildId, "control", dto, botClientId, ct);
    }

    public async Task<MusicStateDto> QueueOperationAsync(string guildId, MusicQueueOperationDto dto, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        return await SendBotAsync<MusicStateDto>(HttpMethod.Post, guildId, "queue", dto, botClientId, ct);
    }

    public async Task<MusicLyricsResponseDto> LyricsAsync(string guildId, string? query, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var action = string.IsNullOrWhiteSpace(query)
            ? "lyrics"
            : $"lyrics?query={Uri.EscapeDataString(query)}";
        return await SendBotAsync<MusicLyricsResponseDto>(HttpMethod.Get, guildId, action, null, botClientId, ct);
    }

    public async Task<MusicFavoriteResponseDto> ToggleFavoriteAsync(string guildId, MusicFavoriteRequestDto dto, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var settings = await ReadSettingsAsync(guildId, ct);
        var selected = dto.Track;
        if (selected == null)
        {
            var state = await SendBotAsync<MusicStateDto>(HttpMethod.Get, guildId, "state", null, botClientId, ct);
            selected = state.NowPlaying;
        }
        if (selected == null)
            throw new InvalidOperationException("Beğenilecek aktif şarkı yok.");

        var trackId = NormalizeTrackId(selected);
        var existing = await _db.MusicFavorites
            .FirstOrDefaultAsync(f => f.GuildId == guildId && f.UserId == dto.UserId && f.TrackId == trackId);

        var liked = existing == null;
        if (existing != null)
        {
            _db.MusicFavorites.Remove(existing);
            await _db.SaveChangesAsync();
        }
        else
        {
            var favorite = new MusicFavorite
            {
                GuildId = guildId,
                UserId = dto.UserId,
                TrackId = trackId
            };
            ApplyTrackToFavorite(favorite, selected);
            _db.MusicFavorites.Add(favorite);
            await _db.SaveChangesAsync();
            await TrimMusicFavoritesAsync(guildId, dto.UserId, settings.FavoriteLimit, ct);
        }

        return new MusicFavoriteResponseDto
        {
            Liked = liked,
            Tracks = await ReadFavoritesAsync(guildId, dto.UserId, ct)
        };
    }

    public async Task<MusicTrackListResponseDto> GetFavoritesAsync(string guildId, string userId, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        return new MusicTrackListResponseDto { Tracks = await ReadFavoritesAsync(guildId, userId, ct) };
    }

    public async Task<MusicHistoryResponseDto> GetHistoryAsync(string guildId, string? userId, string? botClientId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var normalizedUserId = NormalizeNullable(userId, null);
        var query = _db.MusicHistories.AsNoTracking().Where(h => h.GuildId == guildId);
        if (!string.IsNullOrWhiteSpace(normalizedUserId))
            query = query.Where(h => h.UserId == normalizedUserId);

        var histories = await query
            .OrderByDescending(h => h.StartedAt)
            .ThenByDescending(h => h.Id)
            .ToListAsync(ct);
        var tracks = histories.Select(MapHistoryItem).ToList();
        return new MusicHistoryResponseDto { Tracks = tracks };
    }

    public async Task RecordHistoryAsync(string guildId, MusicHistoryRecordRequestDto dto, CancellationToken ct = default)
    {
        var track = dto.Track;
        var trackId = NormalizeTrackId(track);
        var historySource = string.IsNullOrWhiteSpace(dto.Source) ? "bot" : dto.Source;

        var session = new MusicSession
        {
            GuildId = guildId,
            Source = historySource,
            CoverTrackId = trackId,
            CoverTitle = track.Title,
            CoverThumbnailUrl = track.ThumbnailUrl,
            TrackCount = 1,
            StartedAt = DateTime.UtcNow
        };
        _db.MusicSessions.Add(session);
        await _db.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(dto.UserId))
        {
            var hasParticipant = await _db.MusicSessionParticipants
                .AnyAsync(p => p.SessionId == session.Id && p.UserId == dto.UserId, ct);
            if (!hasParticipant)
            {
                _db.MusicSessionParticipants.Add(new MusicSessionParticipant
                {
                    SessionId = session.Id,
                    UserId = dto.UserId!,
                    Username = dto.RequesterUsername,
                    CreatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync(ct);
            }
        }

        var history = new MusicHistory
        {
            GuildId = guildId,
            UserId = string.IsNullOrWhiteSpace(dto.UserId) ? null : dto.UserId,
            TrackId = trackId,
            SessionId = session.Id,
            RequesterUsername = dto.RequesterUsername,
            VoiceChannelId = dto.VoiceChannelId,
            TextChannelId = dto.TextChannelId,
            PositionMs = dto.PositionMs,
            StartedAt = DateTime.UtcNow
        };
        ApplyTrackToHistory(history, track);
        _db.MusicHistories.Add(history);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<MusicPlaylistListResponseDto> GetPlaylistsAsync(string guildId, string? userId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        return new MusicPlaylistListResponseDto { Playlists = await ReadPlaylistsAsync(guildId, userId, false, ct) };
    }

    public async Task<MusicPlaylistDto?> GetPlaylistAsync(string guildId, int playlistId, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var playlist = (await ReadPlaylistsAsync(guildId, null, false, ct)).FirstOrDefault(p => p.Id == playlistId);
        if (playlist == null) return null;
        playlist.Tracks = await ReadPlaylistItemsAsync(playlistId, ct);
        return playlist;
    }

    public async Task<MusicPlaylistImportJobDto> ImportPlaylistAsync(string guildId, MusicPlaylistImportRequestDto dto, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var settings = await ReadSettingsAsync(guildId, ct);
        var provider = NormalizeProvider(dto.Provider, dto.Url);
        var jobId = await CreateImportJobAsync(guildId, dto.OwnerUserId, provider, dto.Url, ct);
        try
        {
            var imported = provider == "spotify"
                ? await FetchSpotifyPlaylistAsync(dto.Url, settings.ImportTrackLimit, dto.OwnerUserId, ct)
                : await FetchYouTubePlaylistAsync(guildId, dto.Url, settings.ImportTrackLimit, ct);
            if (imported.Tracks.Count == 0)
                throw new InvalidOperationException($"{ProviderDisplay(provider)} playlist'e erişilemedi.");
            var playlistCount = await CountPlaylistsAsync(guildId, ct);
            if (playlistCount >= settings.PlaylistLimit)
                throw new InvalidOperationException($"Sunucu playlist limiti dolu ({settings.PlaylistLimit}).");
            var tracks = imported.Tracks.Take(Math.Min(settings.ImportTrackLimit, settings.PlaylistTrackLimit)).ToList();
            var playlistId = await CreatePlaylistAsync(guildId, dto, imported, tracks.Count, imported.FailedTracks, ct);
            for (var index = 0; index < tracks.Count; index++)
                await InsertPlaylistItemAsync(playlistId, tracks[index], index + 1, dto.OwnerUserId, "imported", null, ct);
            await CompleteImportJobAsync(jobId, playlistId, "completed", imported.TotalTracks, tracks.Count, imported.FailedTracks, null, ct);
            return await GetImportJobAsync(guildId, jobId, ct) ?? new MusicPlaylistImportJobDto { Id = jobId, GuildId = guildId, Provider = provider, SourceUrl = dto.Url, Status = "completed" };
        }
        catch (Exception ex)
        {
            var message = ex switch
            {
                InvalidOperationException ioe when !string.IsNullOrWhiteSpace(ioe.Message) => ioe.Message,
                KeyNotFoundException =>
                    $"{ProviderDisplay(provider)} yanıtında beklenen alan yok (Development Mode kısıtı olabilir).",
                _ when ex.Message.Contains("erişilemedi", StringComparison.OrdinalIgnoreCase) => ex.Message,
                _ when ex.Message.Contains("Development Mode", StringComparison.OrdinalIgnoreCase) => ex.Message,
                _ => $"{ProviderDisplay(provider)} playlist'e erişilemedi: {ex.Message}",
            };
            await CompleteImportJobAsync(jobId, null, "failed", 0, 0, 0, message, ct);
            return await GetImportJobAsync(guildId, jobId, ct) ?? new MusicPlaylistImportJobDto { Id = jobId, GuildId = guildId, Provider = provider, SourceUrl = dto.Url, Status = "failed", ErrorMessage = message };
        }
    }

    public async Task<MusicPlaylistImportJobDto?> GetImportJobAsync(string guildId, long jobId, CancellationToken ct = default)
    {
        var job = await _db.MusicPlaylistImportJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.GuildId == guildId && j.Id == jobId, ct);
        return job == null ? null : MapImportJob(job);
    }

    public async Task<MusicPlaylistPreviewDto> PreviewPlaylistAsync(string guildId, string url, string? discordUserId = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        var trimmed = (url ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("Playlist URL gerekli.");

        var provider = NormalizeProvider(string.Empty, trimmed);
        if (provider == "spotify")
        {
            if (!HasSpotifyCredentials())
            {
                throw new InvalidOperationException(
                    "Spotify kimlik bilgileri eksik. SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET tanımlayın.");
            }

            var playlistId = ExtractSpotifyId(trimmed, "playlist")
                ?? throw new InvalidOperationException("Spotify playlist'e erişilemedi: playlist id bulunamadı.");
            using var playlist = await SpotifyGetAsync(
                $"/v1/playlists/{Uri.EscapeDataString(playlistId)}?market={SpotifyMarket}",
                discordUserId,
                ct);
            var root = playlist.RootElement;
            var cover = root.TryGetProperty("images", out var images) && images.ValueKind == JsonValueKind.Array
                ? images.EnumerateArray().Select(img => JsonString(img, "url")).FirstOrDefault(u => !string.IsNullOrWhiteSpace(u))
                : null;
            var trackCount = ResolvePlaylistTotal(root);
            string? externalUrl = null;
            if (root.TryGetProperty("external_urls", out var ext))
                externalUrl = JsonString(ext, "spotify");
            return new MusicPlaylistPreviewDto
            {
                Provider = "spotify",
                Url = externalUrl ?? trimmed,
                Name = JsonString(root, "name") ?? "Spotify Playlist",
                Description = JsonString(root, "description"),
                CoverUrl = cover,
                TrackCount = trackCount,
            };
        }

        var apiKey = (_configuration["YouTube:ApiKey"] ?? Environment.GetEnvironmentVariable("YOUTUBE_API_KEY") ?? string.Empty).Trim();
        var ytPlaylistId = ExtractYouTubePlaylistId(trimmed);
        if (!string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(ytPlaylistId))
        {
            var client = _httpClientFactory.CreateClient();
            var metaUrl = $"https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id={Uri.EscapeDataString(ytPlaylistId)}&key={Uri.EscapeDataString(apiKey)}";
            using var metaDoc = await GetJsonAsync(client, metaUrl, "YouTube playlist'e erişilemedi.", ct);
            var items = metaDoc.RootElement.GetProperty("items").EnumerateArray().ToList();
            if (items.Count == 0) throw new InvalidOperationException("YouTube playlist'e erişilemedi.");
            var snippet = items[0].GetProperty("snippet");
            var details = items[0].TryGetProperty("contentDetails", out var cd) ? cd : default;
            return new MusicPlaylistPreviewDto
            {
                Provider = "youtube",
                Url = trimmed,
                Name = JsonString(snippet, "title") ?? "YouTube Playlist",
                Description = JsonString(snippet, "description"),
                CoverUrl = BestImage(snippet),
                TrackCount = details.ValueKind == JsonValueKind.Object ? JsonInt(details, "itemCount") : null,
            };
        }

        return new MusicPlaylistPreviewDto
        {
            Provider = provider,
            Url = trimmed,
            Name = string.Empty,
            TrackCount = null,
        };
    }

    public async Task<MusicRadioStationsResponseDto> GetRadioStationsAsync(string guildId, string? query = null, CancellationToken ct = default)
    {
        await EnsureMusicConfiguredAsync(guildId, ct);
        await SeedRadioStationsAsync(ct);
        var stations = await _db.MusicRadioStations.AsNoTracking()
            .Where(s => s.IsEnabled)
            .OrderBy(s => s.Name)
            .Select(s => new MusicRadioStationDto
            {
                Id = s.Id,
                Name = s.Name,
                StreamUrl = s.StreamUrl,
                Country = s.Country,
                Genre = s.Genre,
                ImageUrl = s.ImageUrl
            })
            .ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(query))
        {
            stations = stations
                .Where(s =>
                    TextSearchHelper.ContainsNormalized(s.Name, query) ||
                    TextSearchHelper.ContainsNormalized(s.Genre, query) ||
                    TextSearchHelper.ContainsNormalized(s.Country, query))
                .Take(80)
                .ToList();
        }
        else
        {
            stations = stations.Take(80).ToList();
        }

        return new MusicRadioStationsResponseDto { Stations = stations };
    }

    public async Task CleanupGuildAsync(string guildId, CancellationToken ct = default)
    {
        await _cache.DeleteAsync(SettingsKey(guildId), ct);
        try
        {
            await SendBotAsync<MusicStateDto>(HttpMethod.Post, guildId, "control", new MusicControlRequestDto { Action = "stop" }, null, ct);
        }
        catch
        {
        }
    }

    private async Task EnsureMusicConfiguredAsync(string guildId, CancellationToken ct)
    {
        var settings = await GetSettingsAsync(guildId, ct);
        if (settings.Enabled && settings.RequireDjRole && !settings.SetupCompleted)
            throw new MusicSetupRequiredException(settings);
    }

    private async Task<MusicSettingsDto> ReadSettingsAsync(string guildId, CancellationToken ct)
    {
        var settings = await _db.MusicSettings
            .Include(s => s.BlacklistedTextChannels)
            .FirstOrDefaultAsync(s => s.GuildId == guildId, ct);

        if (settings == null)
        {
            settings = new MusicSettings
            {
                GuildId = guildId,
                DefaultVolume = 1,
                MaxQueueSize = 500,
                MaxUserSongs = 500,
                RequireDjRole = true,
                SetupCompleted = false,
                PlaylistLimit = 50,
                PlaylistTrackLimit = 500,
                FavoriteLimit = 500,
                ImportTrackLimit = 500,
                Autoplay = true,
                RadioEnabled = true
            };
            _db.MusicSettings.Add(settings);
            await _db.SaveChangesAsync(ct);
        }

        return MapSettings(settings);
    }

    private async Task UpsertSettingsAsync(MusicSettingsDto settings, CancellationToken ct)
    {
        var row = await _db.MusicSettings
            .Include(s => s.BlacklistedTextChannels)
            .FirstOrDefaultAsync(s => s.GuildId == settings.GuildId, ct);

        if (row == null)
        {
            row = new MusicSettings { GuildId = settings.GuildId };
            _db.MusicSettings.Add(row);
        }

        row.DefaultVolume = settings.DefaultVolume;
        row.MaxQueueSize = settings.MaxQueueSize;
        row.DjRoleId = settings.DjRoleId;
        row.RequireDjRole = settings.RequireDjRole;
        row.SetupCompleted = settings.SetupCompleted;
        row.AllowEveryoneToPlay = settings.AllowEveryoneToPlay;
        row.AllowedTextChannelId = settings.AllowedTextChannelId;
        row.AutoLeaveSeconds = settings.AutoLeaveSeconds;
        row.AnnounceNowPlaying = settings.AnnounceNowPlaying;
        row.Autoplay = settings.Autoplay;
        row.PreventDuplicates = settings.PreventDuplicates;
        row.DjOnly = settings.DjOnly;
        row.DjPlaylists = settings.DjPlaylists;
        row.MaxUserSongs = settings.MaxUserSongs;
        row.PlaylistLimit = settings.PlaylistLimit;
        row.PlaylistTrackLimit = settings.PlaylistTrackLimit;
        row.FavoriteLimit = settings.FavoriteLimit;
        row.ImportTrackLimit = settings.ImportTrackLimit;
        row.RadioEnabled = settings.RadioEnabled;

        await SyncBlacklistedChannelsAsync(row, settings.BlacklistedTextChannelIds);
        await _db.SaveChangesAsync(ct);
    }

    private string SpotifyMarket => (_configuration["Spotify:Market"] ?? Environment.GetEnvironmentVariable("SPOTIFY_MARKET") ?? "US").Trim();

    private async Task<List<MusicPlaylistDto>> ReadPlaylistsAsync(string guildId, string? userId, bool includeTracks, CancellationToken ct)
    {
        var normalizedUserId = NormalizeNullable(userId, null);
        var query = _db.MusicPlaylists.AsNoTracking().Where(p => p.GuildId == guildId);
        if (!string.IsNullOrWhiteSpace(normalizedUserId))
            query = query.Where(p => p.OwnerUserId == null || p.OwnerUserId == normalizedUserId);

        var playlistRows = await query
            .OrderByDescending(p => p.UpdatedAt)
            .ThenByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .ToListAsync(ct);
        var playlists = playlistRows.Select(MapPlaylist).ToList();

        if (includeTracks)
        {
            foreach (var playlist in playlists)
                playlist.Tracks = await ReadPlaylistItemsAsync(playlist.Id, ct);
        }

        return playlists;
    }

    private async Task<List<MusicTrackDto>> ReadPlaylistItemsAsync(int playlistId, CancellationToken ct)
    {
        var items = await _db.MusicPlaylistItems.AsNoTracking()
            .Where(i => i.PlaylistId == playlistId)
            .OrderBy(i => i.Position)
            .ThenBy(i => i.Id)
            .ToListAsync(ct);
        return items.Select(MapTrackFromPlaylistItem).ToList();
    }

    private async Task<int> CountPlaylistsAsync(string guildId, CancellationToken ct)
    {
        return await _db.MusicPlaylists.CountAsync(p => p.GuildId == guildId, ct);
    }

    private async Task<long> CreateImportJobAsync(string guildId, string? userId, string provider, string sourceUrl, CancellationToken ct)
    {
        var job = new MusicPlaylistImportJob
        {
            GuildId = guildId,
            UserId = userId,
            Provider = provider,
            SourceUrl = sourceUrl,
            Status = "pending",
            StartedAt = DateTime.UtcNow
        };
        _db.MusicPlaylistImportJobs.Add(job);
        await _db.SaveChangesAsync(ct);
        return job.Id;
    }

    private async Task CompleteImportJobAsync(long jobId, int? playlistId, string status, int total, int imported, int failed, string? error, CancellationToken ct)
    {
        var job = await _db.MusicPlaylistImportJobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job == null) return;

        job.PlaylistId = playlistId;
        job.Status = status;
        job.TotalTracks = total;
        job.ProcessedTracks = total;
        job.ImportedTracks = imported;
        job.FailedTracks = failed;
        job.ErrorMessage = error;
        job.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<int> CreatePlaylistAsync(string guildId, MusicPlaylistImportRequestDto dto, ImportedPlaylist imported, int importedCount, int failedCount, CancellationToken ct)
    {
        var playlist = new MusicPlaylist
        {
            GuildId = guildId,
            OwnerUserId = dto.OwnerUserId,
            Name = NormalizeNullable(dto.Name, null) ?? imported.Name,
            Scope = string.IsNullOrWhiteSpace(dto.Scope) ? "guild" : dto.Scope,
            Description = imported.Description,
            ImportSource = imported.Provider,
            CoverUrl = imported.CoverUrl,
            ExternalProvider = imported.Provider,
            ExternalPlaylistId = imported.ExternalId,
            ExternalUrl = imported.ExternalUrl,
            TotalTracks = imported.TotalTracks,
            ImportedTracks = importedCount,
            FailedTracks = failedCount,
            LastImportStatus = "completed",
            LastImportedAt = DateTime.UtcNow
        };
        _db.MusicPlaylists.Add(playlist);
        await _db.SaveChangesAsync(ct);
        return playlist.Id;
    }

    private async Task InsertPlaylistItemAsync(int playlistId, MusicTrackDto track, int position, string? userId, string status, string? error, CancellationToken ct)
    {
        var trackId = NormalizeTrackId(track);
        var item = new MusicPlaylistItem
        {
            PlaylistId = playlistId,
            TrackId = trackId,
            Position = position,
            ExternalTrackId = track.SpotifyTrackId ?? track.Id,
            ImportStatus = status,
            ImportError = error,
            AddedByUserId = userId
        };
        ApplyTrackToPlaylistItem(item, track);
        _db.MusicPlaylistItems.Add(item);
        await _db.SaveChangesAsync(ct);
    }

    private async Task SeedRadioStationsAsync(CancellationToken ct)
    {
        var seeds = new (string Name, string StreamUrl, string Country, string Genre)[]
        {
            ("Classic Vinyl HD", "https://icecast.walmradio.com:8443/classic", "ABD", "Oldies"),
            ("Radio Paradise", "http://stream-uk1.radioparadise.com/aac-320", "ABD", "Eclectic"),
            ("101 Smooth Jazz", "http://jking.cdnstream1.com/b22139_128mp3", "ABD", "Jazz"),
            (".977 80s", "http://17573.live.streamtheworld.com/977_80_SC", "ABD", "80s"),
            ("Deep House Lounge", "http://198.15.94.34:8006/stream", "ABD", "House"),
            ("SWR3", "https://liveradio.swr.de/sw282p3/swr3/play.mp3", "Almanya", "Pop"),
            ("Deutschlandfunk", "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3?aggregator=web", "Almanya", "Haber"),
            ("1LIVE", "http://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3", "Almanya", "Pop"),
            ("WDR 5", "http://wdr-wdr5-live.icecast.wdr.de/wdr/wdr5/live/mp3/128/stream.mp3", "Almanya", "Haber"),
            ("Rock Antenne", "http://mp3channels.webradio.rockantenne.de/rockantenne", "Almanya", "Rock"),
            ("Radyo 7", "http://46.20.3.250/;stream", "Türkiye", "Türkçe"),
            ("Slow Türk", "https://radyo.duhnet.tv/ak_dtvh_slowturk", "Türkiye", "Slow"),
            ("Radyo 45lik", "https://stream.radyo45lik.com:4545/", "Türkiye", "Nostalji"),
            ("Power Pop", "https://listen.powerapp.com.tr/powerpop/128/chunks.m3u8", "Türkiye", "Pop"),
            ("Süper FM", "http://29023.live.streamtheworld.com:3690/SUPER_FMAAC_SC", "Türkiye", "Pop"),
            ("Radio Svetigora", "http://svetigoralive.com:8879/;", "Karadağ", "Kültür"),
            ("Antena M", "http://radioservis.me:8010/antenamlive", "Karadağ", "Haber"),
            ("Play Radio Montenegro", "https://stream.playradio.me:8443/play-me.mp3", "Karadağ", "Pop"),
            ("Bruškin", "https://player.radiobruskin.me/proxy/radiobruskin/stream", "Karadağ", "Pop Rock"),
            ("Radio D Plus", "https://radiodplus.radioca.st/xstream", "Karadağ", "Yerel"),
            ("bravo!", "http://c5.hostingcentar.com:8059/stream?4960", "Hırvatistan", "Pop"),
            ("Otvoreni Radio", "http://stream.otvoreni.hr/otvoreni", "Hırvatistan", "Pop"),
            ("Radio Dalmacija", "http://shoutcast.pondi.hr:8000/;", "Hırvatistan", "Pop"),
            ("Extra FM", "http://streams.extrafm.hr:8110/;", "Hırvatistan", "Folk"),
            ("Yammat FM", "https://stream.yammat.fm/radio/8000/yammat.mp3", "Hırvatistan", "Pop")
        };

        var existingByUrl = await _db.MusicRadioStations
            .ToDictionaryAsync(s => s.StreamUrl, StringComparer.OrdinalIgnoreCase, ct);
        var changed = false;

        foreach (var seed in seeds)
        {
            if (existingByUrl.TryGetValue(seed.StreamUrl, out var existing))
            {
                if (existing.Name != seed.Name || existing.Country != seed.Country || existing.Genre != seed.Genre)
                {
                    existing.Name = seed.Name;
                    existing.Country = seed.Country;
                    existing.Genre = seed.Genre;
                    changed = true;
                }

                continue;
            }

            _db.MusicRadioStations.Add(new MusicRadioStation
            {
                Name = seed.Name,
                StreamUrl = seed.StreamUrl,
                Country = seed.Country,
                Genre = seed.Genre,
                IsEnabled = true
            });
            changed = true;
        }

        if (changed)
            await _db.SaveChangesAsync(ct);
    }

    private async Task<ImportedPlaylist> FetchYouTubePlaylistAsync(string guildId, string url, int limit, CancellationToken ct)
    {
        var apiKey = (_configuration["YouTube:ApiKey"] ?? Environment.GetEnvironmentVariable("YOUTUBE_API_KEY") ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            return await FetchYouTubePlaylistViaBotAsync(guildId, url, limit, ct);
        var playlistId = ExtractYouTubePlaylistId(url) ?? throw new InvalidOperationException("YouTube playlist'e erişilemedi: playlist id bulunamadı.");
        var client = _httpClientFactory.CreateClient();
        var metaUrl = $"https://www.googleapis.com/youtube/v3/playlists?part=snippet&id={Uri.EscapeDataString(playlistId)}&key={Uri.EscapeDataString(apiKey)}";
        using var metaDoc = await GetJsonAsync(client, metaUrl, "YouTube playlist'e erişilemedi.", ct);
        var items = metaDoc.RootElement.GetProperty("items").EnumerateArray().ToList();
        if (items.Count == 0) throw new InvalidOperationException("YouTube playlist'e erişilemedi.");
        var snippet = items[0].GetProperty("snippet");
        var imported = new ImportedPlaylist(
            "youtube",
            playlistId,
            JsonString(snippet, "title") ?? "YouTube Playlist",
            JsonString(snippet, "description"),
            BestImage(snippet),
            url,
            0,
            0,
            []);
        var failedTracks = 0;
        var pageToken = string.Empty;
        do
        {
            var pageUrl = $"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId={Uri.EscapeDataString(playlistId)}&key={Uri.EscapeDataString(apiKey)}{(string.IsNullOrWhiteSpace(pageToken) ? string.Empty : $"&pageToken={Uri.EscapeDataString(pageToken)}")}";
            using var pageDoc = await GetJsonAsync(client, pageUrl, "YouTube playlist'e erişilemedi.", ct);
            foreach (var item in pageDoc.RootElement.GetProperty("items").EnumerateArray())
            {
                if (imported.Tracks.Count >= limit) break;
                var itemSnippet = item.GetProperty("snippet");
                var title = JsonString(itemSnippet, "title");
                var resource = itemSnippet.TryGetProperty("resourceId", out var res) ? res : default;
                var videoId = resource.ValueKind == JsonValueKind.Object ? JsonString(resource, "videoId") : null;
                if (string.IsNullOrWhiteSpace(videoId) || string.IsNullOrWhiteSpace(title) || title.Contains("Private video", StringComparison.OrdinalIgnoreCase) || title.Contains("Deleted video", StringComparison.OrdinalIgnoreCase) || title.Contains("Deleted", StringComparison.OrdinalIgnoreCase) || title.Contains("Private", StringComparison.OrdinalIgnoreCase))
                {
                    failedTracks += 1;
                    continue;
                }
                imported.Tracks.Add(new MusicTrackDto
                {
                    Id = $"youtube:{videoId}",
                    Title = title,
                    Author = JsonString(itemSnippet, "videoOwnerChannelTitle") ?? JsonString(itemSnippet, "channelTitle"),
                    Uri = $"https://www.youtube.com/watch?v={videoId}",
                    Source = "youtube",
                    ThumbnailUrl = BestImage(itemSnippet),
                    ExternalProvider = "youtube"
                });
            }
            pageToken = JsonString(pageDoc.RootElement, "nextPageToken") ?? string.Empty;
        } while (!string.IsNullOrWhiteSpace(pageToken) && imported.Tracks.Count < limit);
        imported = imported with { TotalTracks = imported.Tracks.Count + failedTracks, FailedTracks = failedTracks };
        if (imported.Tracks.Count == 0) throw new InvalidOperationException("YouTube playlist'e erişilemedi.");
        return imported;
    }

    private async Task<ImportedPlaylist> FetchYouTubePlaylistViaBotAsync(string guildId, string url, int limit, CancellationToken ct)
    {
        var tracks = await SendBotAsync<MusicSearchResponseDto>(
            HttpMethod.Get,
            guildId,
            $"search?query={Uri.EscapeDataString(url)}&source=auto&limit={Math.Min(500, Math.Max(1, limit))}",
            null,
            null,
            ct);
        if (tracks.Tracks.Count == 0)
            throw new InvalidOperationException("YouTube playlist'e erişilemedi.");
        return new ImportedPlaylist(
            "youtube",
            ExtractYouTubePlaylistId(url),
            "YouTube Playlist",
            "Lavalink public playlist fallback ile içe aktarıldı.",
            tracks.Tracks.FirstOrDefault()?.ThumbnailUrl,
            url,
            tracks.Tracks.Count,
            0,
            tracks.Tracks.Take(limit).Select(track =>
            {
                track.ExternalProvider = "youtube";
                return track;
            }).ToList());
    }

    private async Task<ImportedPlaylist> FetchSpotifyPlaylistAsync(string url, int limit, string? discordUserId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(discordUserId))
        {
            throw new InvalidOperationException(
                "Spotify playlist içe aktarmak için önce Spotify hesabınızı bağlayın (Premium gerekli).");
        }

        await EnsureSpotifyUserCanImportAsync(discordUserId, ct);

        var playlistId = ExtractSpotifyId(url, "playlist") ?? throw new InvalidOperationException("Spotify playlist'e erişilemedi: playlist id bulunamadı.");
        using var playlist = await SpotifyGetAsync($"/v1/playlists/{Uri.EscapeDataString(playlistId)}?market={SpotifyMarket}", discordUserId, ct);
        var root = playlist.RootElement;
        string? externalUrl = null;
        if (root.TryGetProperty("external_urls", out var extUrls) && extUrls.ValueKind == JsonValueKind.Object)
            externalUrl = JsonString(extUrls, "spotify");

        var paging = ResolvePlaylistPaging(root);
        var totalHint = paging.Total ?? 0;

        var imported = new ImportedPlaylist(
            "spotify",
            playlistId,
            JsonString(root, "name") ?? "Spotify Playlist",
            JsonString(root, "description"),
            BestImage(root),
            externalUrl ?? url,
            totalHint,
            0,
            []);

        var failedTracks = 0;
        if (paging.Items.ValueKind == JsonValueKind.Array)
            failedTracks += AddSpotifyPlaylistItems(imported.Tracks, paging.Items, limit);

        var next = paging.Next;
        var pageLimit = Math.Min(100, Math.Max(1, limit));

        if (imported.Tracks.Count == 0)
        {
            foreach (var path in new[]
                     {
                         $"/v1/playlists/{Uri.EscapeDataString(playlistId)}/items?market={SpotifyMarket}&limit={pageLimit}&additional_types=track",
                         $"/v1/playlists/{Uri.EscapeDataString(playlistId)}/tracks?market={SpotifyMarket}&limit={pageLimit}",
                     })
            {
                try
                {
                    using var tracksPage = await SpotifyGetAsync(path, discordUserId, ct);
                    if (tracksPage.RootElement.TryGetProperty("items", out var altItems) && altItems.ValueKind == JsonValueKind.Array)
                    {
                        failedTracks += AddSpotifyPlaylistItems(imported.Tracks, altItems, limit);
                        next = JsonString(tracksPage.RootElement, "next");
                        totalHint = JsonInt(tracksPage.RootElement, "total") ?? totalHint;
                        if (imported.Tracks.Count > 0) break;
                    }
                }
                catch (InvalidOperationException)
                {
                }
            }
        }

        var client = _httpClientFactory.CreateClient();
        while (!string.IsNullOrWhiteSpace(next) && imported.Tracks.Count < limit)
        {
            using var page = await SpotifyGetAbsoluteAsync(client, next, discordUserId, ct);
            if (page.RootElement.TryGetProperty("items", out var pageItems) && pageItems.ValueKind == JsonValueKind.Array)
                failedTracks += AddSpotifyPlaylistItems(imported.Tracks, pageItems, limit);
            next = JsonString(page.RootElement, "next");
        }

        imported = imported with
        {
            TotalTracks = Math.Max(totalHint, imported.Tracks.Count + failedTracks),
            FailedTracks = failedTracks,
        };

        if (imported.Tracks.Count == 0)
        {
            throw new InvalidOperationException(
                $"«{imported.Name}» playlist adı okundu fakat şarkılar boş döndü. " +
                "Spotify Development Mode’da parçalar yalnızca sahip olduğunuz veya collaborator olduğunuz listelerde gelir. " +
                "Bağlı Spotify hesabınızın bu listeye yetkisi olduğundan emin olun; Dashboard → User Management’ta hesabınız kayıtlı olmalı.");
        }
        return imported;
    }

    public async Task<SpotifyConnectUrlDto> CreateSpotifyConnectUrlAsync(string discordUserId, string? guildId, string? returnPath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(discordUserId))
            throw new InvalidOperationException("Discord oturumu gerekli.");
        if (!HasSpotifyCredentials())
            throw new InvalidOperationException("Spotify Client ID/Secret tanımlı değil.");

        var clientId = SpotifyClientId();
        var redirectUri = SpotifyRedirectUri();
        var state = Convert.ToHexString(Guid.NewGuid().ToByteArray()).ToLowerInvariant();
        var payload = JsonSerializer.Serialize(new SpotifyOAuthState(discordUserId, guildId, returnPath), JsonOptions);
        await _cache.SetAsync($"spotify:oauth:state:{state}", payload, TimeSpan.FromMinutes(10), ct);

        var scopes = Uri.EscapeDataString("playlist-read-private playlist-read-collaborative user-read-private");
        var authorizeUrl =
            "https://accounts.spotify.com/authorize" +
            $"?client_id={Uri.EscapeDataString(clientId)}" +
            "&response_type=code" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            $"&scope={scopes}" +
            $"&state={Uri.EscapeDataString(state)}" +
            "&show_dialog=true";

        return new SpotifyConnectUrlDto { AuthorizeUrl = authorizeUrl, State = state };
    }

    public async Task<SpotifyLinkStatusDto> CompleteSpotifyOAuthAsync(string code, string state, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            throw new InvalidOperationException("Spotify OAuth kodu veya state eksik.");

        var stateKey = $"spotify:oauth:state:{state.Trim()}";
        var stateJson = await _cache.GetAsync<string>(stateKey, ct);
        if (string.IsNullOrWhiteSpace(stateJson))
            throw new InvalidOperationException("Spotify OAuth oturumu süresi doldu. Tekrar bağlanmayı deneyin.");
        await _cache.DeleteAsync(stateKey, ct);

        var oauthState = JsonSerializer.Deserialize<SpotifyOAuthState>(stateJson, JsonOptions)
            ?? throw new InvalidOperationException("Spotify OAuth state geçersiz.");
        var discordUserId = oauthState.DiscordUserId;
        if (string.IsNullOrWhiteSpace(discordUserId))
            throw new InvalidOperationException("Spotify OAuth state geçersiz (Discord kullanıcısı yok).");

        using var tokenDoc = await ExchangeSpotifyAuthorizationCodeAsync(code.Trim(), ct);
        var accessToken = JsonString(tokenDoc.RootElement, "access_token")
            ?? throw new InvalidOperationException("Spotify access token alınamadı.");
        var refreshToken = JsonString(tokenDoc.RootElement, "refresh_token");
        var scope = JsonString(tokenDoc.RootElement, "scope");
        var expiresIn = Math.Max(60, (JsonInt(tokenDoc.RootElement, "expires_in") ?? 3600) - 60);

        using var meDoc = await SpotifyGetWithBearerAsync("/v1/me", accessToken, ct);
        var me = meDoc.RootElement;
        var spotifyUserId = JsonString(me, "id") ?? throw new InvalidOperationException("Spotify kullanıcı kimliği alınamadı.");
        var displayName = JsonString(me, "display_name") ?? spotifyUserId;
        var product = JsonString(me, "product");
        var premium = IsSpotifyPremiumProduct(product);

        if (product != null && !premium)
        {
            throw new InvalidOperationException(
                "Spotify Premium gerekli. Free hesaplarla playlist içe aktarma kullanılamaz. Premium’a geçip tekrar bağlanın.");
        }

        // Aynı Spotify hesabı başka bir Discord kullanıcısına bağlıysa paylaşımı engelle
        var linkedElsewhere = await _db.SpotifyUserLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.SpotifyUserId == spotifyUserId && x.DiscordUserId != discordUserId, ct);
        if (linkedElsewhere != null)
        {
            throw new InvalidOperationException(
                "Bu Spotify hesabı başka bir Discord kullanıcısına bağlı. Herkes kendi Spotify hesabıyla giriş yapmalıdır.");
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            var existing = await _db.SpotifyUserLinks.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
            refreshToken = existing?.RefreshToken;
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new InvalidOperationException("Spotify refresh token alınamadı. Spotify Dashboard’da izinleri kontrol edip tekrar deneyin.");

        var now = DateTime.UtcNow;
        var link = await _db.SpotifyUserLinks.FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        if (link == null)
        {
            link = new SpotifyUserLink { DiscordUserId = discordUserId, CreatedAt = now };
            _db.SpotifyUserLinks.Add(link);
        }

        link.SpotifyUserId = spotifyUserId;
        link.DisplayName = displayName;
        link.RefreshToken = refreshToken;
        link.Scope = scope;
        link.Product = product;
        link.IsPremium = premium || product == null;
        link.ConnectedAt = now;
        link.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        await _cache.SetAsync($"spotify:user:{discordUserId}:access", accessToken, TimeSpan.FromSeconds(expiresIn), ct);
        var status = MapSpotifyLinkStatus(link, true);
        status.GuildId = oauthState.GuildId;
        status.ReturnPath = oauthState.ReturnPath;
        return status;
    }

    public async Task<SpotifyLinkStatusDto> GetSpotifyLinkStatusAsync(string discordUserId, CancellationToken ct = default)
    {
        var appConfigured = HasSpotifyCredentials();
        if (string.IsNullOrWhiteSpace(discordUserId))
        {
            return new SpotifyLinkStatusDto
            {
                AppConfigured = appConfigured,
                Connected = false,
                PremiumRequired = true,
                Warning = "Spotify bağlamak için Discord oturumu gerekli.",
            };
        }

        var link = await _db.SpotifyUserLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        return MapSpotifyLinkStatus(link, appConfigured);
    }

    public async Task DisconnectSpotifyAsync(string discordUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(discordUserId)) return;
        var link = await _db.SpotifyUserLinks.FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        if (link != null)
        {
            _db.SpotifyUserLinks.Remove(link);
            await _db.SaveChangesAsync(ct);
        }
        await _cache.DeleteAsync($"spotify:user:{discordUserId}:access", ct);
    }

    public async Task<SpotifyRemotePlaylistListDto> ListSpotifyPlaylistsAsync(string discordUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(discordUserId))
            throw new InvalidOperationException("Discord oturumu gerekli.");
        if (!HasSpotifyCredentials())
            throw new InvalidOperationException("Spotify Client ID/Secret tanımlı değil.");

        await EnsureSpotifyUserCanImportAsync(discordUserId, ct);

        var link = await _db.SpotifyUserLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        var result = new List<SpotifyRemotePlaylistDto>();
        string? next = $"/v1/me/playlists?limit=50";

        while (!string.IsNullOrWhiteSpace(next) && result.Count < 100)
        {
            using var page = await SpotifyGetAsync(next, discordUserId, ct);
            var root = page.RootElement;
            if (root.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    if (result.Count >= 100) break;
                    if (item.ValueKind != JsonValueKind.Object) continue;
                    var id = JsonString(item, "id");
                    var name = JsonString(item, "name");
                    if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name)) continue;

                    string? externalUrl = null;
                    if (item.TryGetProperty("external_urls", out var ext) && ext.ValueKind == JsonValueKind.Object)
                        externalUrl = JsonString(ext, "spotify");

                    var trackCount = item.TryGetProperty("tracks", out var tracksEl) && tracksEl.ValueKind == JsonValueKind.Object
                        ? JsonInt(tracksEl, "total")
                        : item.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Object
                            ? JsonInt(itemsEl, "total")
                            : null;

                    var ownerId = item.TryGetProperty("owner", out var owner) && owner.ValueKind == JsonValueKind.Object
                        ? JsonString(owner, "id")
                        : null;

                    result.Add(new SpotifyRemotePlaylistDto
                    {
                        Id = id,
                        Name = name,
                        Description = JsonString(item, "description"),
                        CoverUrl = BestImage(item),
                        ExternalUrl = externalUrl ?? $"https://open.spotify.com/playlist/{id}",
                        TrackCount = trackCount,
                        Collaborative = item.TryGetProperty("collaborative", out var collab) &&
                                        collab.ValueKind == JsonValueKind.True,
                        OwnsPlaylist = !string.IsNullOrWhiteSpace(link?.SpotifyUserId) &&
                                       string.Equals(ownerId, link.SpotifyUserId, StringComparison.Ordinal),
                    });
                }
            }

            next = JsonString(root, "next");
            if (!string.IsNullOrWhiteSpace(next) && next.StartsWith("https://api.spotify.com", StringComparison.OrdinalIgnoreCase))
                next = next["https://api.spotify.com".Length..];
        }

        return new SpotifyRemotePlaylistListDto { Playlists = result };
    }


    private async Task<List<MusicTrackDto>> ReadFavoritesAsync(string guildId, string userId, CancellationToken ct)
    {
        var favoriteRows = await _db.MusicFavorites.AsNoTracking()
            .Where(f => f.GuildId == guildId && f.UserId == userId)
            .OrderByDescending(f => f.UpdatedAt)
            .ThenByDescending(f => f.CreatedAt)
            .ToListAsync(ct);
        return favoriteRows.Select(MapTrackFromFavorite).ToList();
    }

    private async Task TrimMusicFavoritesAsync(string guildId, string userId, int favoriteLimit, CancellationToken ct)
    {
        var overflow = await _db.MusicFavorites
            .Where(f => f.GuildId == guildId && f.UserId == userId)
            .OrderByDescending(f => f.UpdatedAt)
            .ThenByDescending(f => f.CreatedAt)
            .ThenByDescending(f => f.Id)
            .Skip(favoriteLimit)
            .ToListAsync(ct);
        if (overflow.Count == 0) return;
        _db.MusicFavorites.RemoveRange(overflow);
        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncBlacklistedChannelsAsync(MusicSettings settings, string? blacklistedJson)
    {
        _db.MusicBlacklistedTextChannels.RemoveRange(settings.BlacklistedTextChannels);
        settings.BlacklistedTextChannels.Clear();

        if (string.IsNullOrWhiteSpace(blacklistedJson)) return;

        try
        {
            var ids = JsonSerializer.Deserialize<List<string>>(blacklistedJson, JsonOptions);
            if (ids == null) return;

            foreach (var channelId in ids.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).Distinct())
            {
                settings.BlacklistedTextChannels.Add(new MusicBlacklistedTextChannel
                {
                    GuildId = settings.GuildId,
                    ChannelId = channelId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        catch (JsonException)
        {
        }
    }

    private static MusicSettingsDto MapSettings(MusicSettings settings)
    {
        var blacklisted = settings.BlacklistedTextChannels.Count > 0
            ? JsonSerializer.Serialize(settings.BlacklistedTextChannels.Select(c => c.ChannelId).ToList(), JsonOptions)
            : null;

        return new MusicSettingsDto
        {
            GuildId = settings.GuildId,
            DefaultVolume = settings.DefaultVolume,
            MaxQueueSize = settings.MaxQueueSize,
            DjRoleId = settings.DjRoleId,
            RequireDjRole = settings.RequireDjRole,
            SetupCompleted = settings.SetupCompleted,
            AllowEveryoneToPlay = settings.AllowEveryoneToPlay,
            AllowedTextChannelId = settings.AllowedTextChannelId,
            AutoLeaveSeconds = settings.AutoLeaveSeconds,
            AnnounceNowPlaying = settings.AnnounceNowPlaying,
            Autoplay = true,
            PreventDuplicates = settings.PreventDuplicates,
            DjOnly = settings.DjOnly,
            DjPlaylists = settings.DjPlaylists,
            MaxUserSongs = settings.MaxUserSongs,
            PlaylistLimit = settings.PlaylistLimit,
            PlaylistTrackLimit = settings.PlaylistTrackLimit,
            FavoriteLimit = settings.FavoriteLimit,
            ImportTrackLimit = settings.ImportTrackLimit,
            RadioEnabled = true,
            BlacklistedTextChannelIds = blacklisted
        };
    }

    private static MusicHistoryItemDto MapHistoryItem(MusicHistory history)
    {
        var track = MapTrackFromHistory(history);
        return new MusicHistoryItemDto
        {
            HistoryId = history.Id,
            Id = track.Id,
            EncodedTrack = track.EncodedTrack,
            Title = track.Title,
            Author = track.Author,
            DurationMs = track.DurationMs,
            Uri = track.Uri,
            Source = track.Source,
            ThumbnailUrl = track.ThumbnailUrl,
            ExternalProvider = track.ExternalProvider,
            SpotifyTrackId = track.SpotifyTrackId,
            SpotifyUrl = track.SpotifyUrl,
            Popularity = track.Popularity,
            Genres = track.Genres,
            ReleaseDate = track.ReleaseDate,
            GuildId = history.GuildId,
            UserId = history.UserId,
            RequesterUsername = history.RequesterUsername,
            VoiceChannelId = history.VoiceChannelId,
            TextChannelId = history.TextChannelId,
            PlayedAt = history.StartedAt.ToString("O")
        };
    }

    private static MusicTrackDto MapTrackFromHistory(MusicHistory row) => new()
    {
        Id = row.TrackId,
        EncodedTrack = row.EncodedTrack,
        Title = row.Title,
        Author = row.Author,
        DurationMs = row.DurationMs,
        Uri = row.Uri,
        Source = row.Source,
        ThumbnailUrl = row.ThumbnailUrl,
        ExternalProvider = row.ExternalProvider,
        SpotifyTrackId = row.SpotifyTrackId,
        SpotifyUrl = row.SpotifyUrl,
        Popularity = row.Popularity,
        Genres = ParseStringArray(row.Genres),
        ReleaseDate = row.ReleaseDate
    };

    private static MusicTrackDto MapTrackFromFavorite(MusicFavorite row) => new()
    {
        Id = row.TrackId,
        EncodedTrack = row.EncodedTrack,
        Title = row.Title,
        Author = row.Author,
        DurationMs = row.DurationMs,
        Uri = row.Uri,
        Source = row.Source,
        ThumbnailUrl = row.ThumbnailUrl,
        ExternalProvider = row.ExternalProvider,
        SpotifyTrackId = row.SpotifyTrackId,
        SpotifyUrl = row.SpotifyUrl,
        Popularity = row.Popularity,
        Genres = ParseStringArray(row.Genres),
        ReleaseDate = row.ReleaseDate
    };

    private static MusicTrackDto MapTrackFromPlaylistItem(MusicPlaylistItem row) => new()
    {
        Id = row.TrackId,
        EncodedTrack = row.EncodedTrack,
        Title = row.Title,
        Author = row.Author,
        DurationMs = row.DurationMs,
        Uri = row.Uri,
        Source = row.Source,
        ThumbnailUrl = row.ThumbnailUrl,
        ExternalProvider = row.ExternalProvider,
        SpotifyTrackId = row.SpotifyTrackId,
        SpotifyUrl = row.SpotifyUrl,
        Popularity = row.Popularity,
        Genres = ParseStringArray(row.Genres),
        ReleaseDate = row.ReleaseDate
    };

    private static void ApplyTrackToFavorite(MusicFavorite favorite, MusicTrackDto track)
    {
        favorite.EncodedTrack = track.EncodedTrack;
        favorite.Title = track.Title;
        favorite.Author = track.Author;
        favorite.DurationMs = track.DurationMs;
        favorite.Uri = track.Uri;
        favorite.Source = track.Source;
        favorite.ThumbnailUrl = track.ThumbnailUrl;
        favorite.ExternalProvider = track.ExternalProvider;
        favorite.SpotifyTrackId = track.SpotifyTrackId;
        favorite.SpotifyUrl = track.SpotifyUrl;
        favorite.Popularity = track.Popularity;
        favorite.Genres = SerializeStringArray(track.Genres);
        favorite.ReleaseDate = track.ReleaseDate;
    }

    private static void ApplyTrackToHistory(MusicHistory history, MusicTrackDto track)
    {
        history.EncodedTrack = track.EncodedTrack;
        history.Title = track.Title;
        history.Author = track.Author;
        history.DurationMs = track.DurationMs;
        history.Uri = track.Uri;
        history.Source = track.Source;
        history.ThumbnailUrl = track.ThumbnailUrl;
        history.ExternalProvider = track.ExternalProvider;
        history.SpotifyTrackId = track.SpotifyTrackId;
        history.SpotifyUrl = track.SpotifyUrl;
        history.Popularity = track.Popularity;
        history.Genres = SerializeStringArray(track.Genres);
        history.ReleaseDate = track.ReleaseDate;
    }

    private static void ApplyTrackToPlaylistItem(MusicPlaylistItem item, MusicTrackDto track)
    {
        item.EncodedTrack = track.EncodedTrack;
        item.Title = track.Title;
        item.Author = track.Author;
        item.DurationMs = track.DurationMs;
        item.Uri = track.Uri;
        item.Source = track.Source;
        item.ThumbnailUrl = track.ThumbnailUrl;
        item.ExternalProvider = track.ExternalProvider;
        item.SpotifyTrackId = track.SpotifyTrackId;
        item.SpotifyUrl = track.SpotifyUrl;
        item.Popularity = track.Popularity;
        item.Genres = SerializeStringArray(track.Genres);
        item.ReleaseDate = track.ReleaseDate;
    }

    private static string NormalizeTrackId(MusicTrackDto track)
    {
        var candidate = !string.IsNullOrWhiteSpace(track.SpotifyTrackId)
            ? $"spotify:{track.SpotifyTrackId}"
            : !string.IsNullOrWhiteSpace(track.Id)
                ? track.Id
                : track.Uri ?? $"{track.Source}:{track.Title}:{track.Author}";
        if (candidate.Length <= 80) return candidate;
        var bytes = System.Security.Cryptography.SHA1.HashData(Encoding.UTF8.GetBytes(candidate));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string? SerializeStringArray(string[]? values)
    {
        return values is { Length: > 0 } ? JsonSerializer.Serialize(values, JsonOptions) : null;
    }

    private static string[]? ParseStringArray(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        try
        {
            var parsed = JsonSerializer.Deserialize<string[]>(value, JsonOptions);
            return parsed is { Length: > 0 } ? parsed : null;
        }
        catch (JsonException)
        {
            var split = value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            return split.Length == 0 ? null : split;
        }
    }

    private sealed record ImportedPlaylist(
        string Provider,
        string? ExternalId,
        string Name,
        string? Description,
        string? CoverUrl,
        string ExternalUrl,
        int TotalTracks,
        int FailedTracks,
        List<MusicTrackDto> Tracks);

    private static MusicPlaylistDto MapPlaylist(MusicPlaylist row) => new()
    {
        Id = row.Id,
        GuildId = row.GuildId,
        OwnerUserId = row.OwnerUserId,
        Name = row.Name,
        Scope = row.Scope,
        Description = row.Description,
        CoverUrl = row.CoverUrl,
        ExternalProvider = row.ExternalProvider,
        ExternalPlaylistId = row.ExternalPlaylistId,
        ExternalUrl = row.ExternalUrl,
        TotalTracks = row.TotalTracks,
        ImportedTracks = row.ImportedTracks,
        FailedTracks = row.FailedTracks,
        LastImportStatus = row.LastImportStatus,
        LastImportError = row.LastImportError,
        LastImportedAt = row.LastImportedAt?.ToString("O")
    };

    private static MusicPlaylistImportJobDto MapImportJob(MusicPlaylistImportJob row) => new()
    {
        Id = row.Id,
        GuildId = row.GuildId,
        UserId = row.UserId,
        PlaylistId = row.PlaylistId,
        Provider = row.Provider,
        SourceUrl = row.SourceUrl,
        Status = row.Status,
        TotalTracks = row.TotalTracks,
        ProcessedTracks = row.ProcessedTracks,
        ImportedTracks = row.ImportedTracks,
        FailedTracks = row.FailedTracks,
        ErrorMessage = row.ErrorMessage,
        StartedAt = row.StartedAt.ToString("O"),
        CompletedAt = row.CompletedAt?.ToString("O")
    };

    private async Task<List<MusicTrackDto>> SearchSpotifyTracksAsync(string query, CancellationToken ct)
    {
        using var doc = await SpotifyGetAsync($"/v1/search?q={Uri.EscapeDataString(query)}&type=track&limit=20&market={SpotifyMarket}", null, ct);
        var root = doc.RootElement;
        return root.TryGetProperty("tracks", out var tracks) && tracks.TryGetProperty("items", out var trackItems)
            ? trackItems.EnumerateArray().Select(MapSpotifyTrack).ToList()
            : [];
    }

    private static MusicTrackDto MapSpotifyTrack(JsonElement track)
    {
        var artists = track.TryGetProperty("artists", out var artistItems) && artistItems.ValueKind == JsonValueKind.Array
            ? artistItems.EnumerateArray().Select(a => JsonString(a, "name")).Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v!).ToArray()
            : [];
        var album = track.TryGetProperty("album", out var albumElement) ? albumElement : default;
        var externalUrls = track.TryGetProperty("external_urls", out var urls) ? urls : default;
        var id = JsonString(track, "id") ?? JsonString(externalUrls, "spotify") ?? throw new InvalidOperationException("Spotify track yanıtı geçersiz.");
        return new MusicTrackDto
        {
            Id = $"spotify:{id}",
            Title = JsonString(track, "name") ?? "Spotify track",
            Author = artists.Length > 0 ? string.Join(", ", artists) : null,
            DurationMs = JsonLong(track, "duration_ms"),
            Uri = JsonString(externalUrls, "spotify"),
            Source = "spotify",
            ThumbnailUrl = album.ValueKind == JsonValueKind.Object ? BestImage(album) : null,
            ExternalProvider = "spotify",
            SpotifyTrackId = id,
            SpotifyUrl = JsonString(externalUrls, "spotify"),
            Popularity = JsonInt(track, "popularity"),
            ReleaseDate = album.ValueKind == JsonValueKind.Object ? JsonString(album, "release_date") : null,
        };
    }

    private int AddSpotifyPlaylistItems(List<MusicTrackDto> tracks, JsonElement items, int limit)
    {
        if (items.ValueKind != JsonValueKind.Array) return 0;
        var failed = 0;
        foreach (var item in items.EnumerateArray())
        {
            if (tracks.Count >= limit) return failed;
            if (item.ValueKind != JsonValueKind.Object)
            {
                failed += 1;
                continue;
            }

            JsonElement track = default;
            if (item.TryGetProperty("track", out var legacyTrack) && legacyTrack.ValueKind == JsonValueKind.Object)
                track = legacyTrack;
            else if (item.TryGetProperty("item", out var newItem) && newItem.ValueKind == JsonValueKind.Object)
                track = newItem;

            if (track.ValueKind != JsonValueKind.Object)
            {
                failed += 1;
                continue;
            }

            var type = JsonString(track, "type");
            if (!string.IsNullOrWhiteSpace(type) &&
                !string.Equals(type, "track", StringComparison.OrdinalIgnoreCase))
            {
                failed += 1;
                continue;
            }

            if (JsonString(track, "id") == null || JsonString(track, "name") == null)
            {
                failed += 1;
                continue;
            }
            try
            {
                tracks.Add(MapSpotifyTrack(track));
            }
            catch (InvalidOperationException)
            {
                failed += 1;
            }
        }
        return failed;
    }

    private async Task EnsureSpotifyUserCanImportAsync(string discordUserId, CancellationToken ct)
    {
        var link = await _db.SpotifyUserLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        if (link == null)
        {
            throw new InvalidOperationException(
                "Spotify hesabınız bağlı değil. Müzik ayarlarından Spotify’ı bağlayın (Premium gerekli).");
        }

        if (!link.IsPremium && string.Equals(link.Product, "free", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Spotify Premium gerekli. Free hesaplarla playlist içe aktarma kullanılamaz.");
        }
    }

    private async Task<JsonDocument> SpotifyGetAsync(string path, string? discordUserId, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var url = path.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? path : $"https://api.spotify.com{path}";
        return await SpotifyGetAbsoluteAsync(client, url, discordUserId, ct);
    }

    private async Task<JsonDocument> SpotifyGetAbsoluteAsync(HttpClient client, string url, string? discordUserId, CancellationToken ct)
    {
        var token = await ResolveSpotifyAccessTokenAsync(discordUserId, ct);
        return await SpotifyGetWithBearerAsync(url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? url : $"https://api.spotify.com{url}", token, ct, client);
    }

    private async Task<JsonDocument> SpotifyGetWithBearerAsync(string pathOrUrl, string accessToken, CancellationToken ct, HttpClient? client = null)
    {
        client ??= _httpClientFactory.CreateClient();
        var url = pathOrUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? pathOrUrl : $"https://api.spotify.com{pathOrUrl}";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await client.SendAsync(request, ct);
        if ((int)response.StatusCode == 429 && response.Headers.RetryAfter?.Delta is { } retryAfter)
        {
            await Task.Delay(retryAfter, ct);
            return await SpotifyGetWithBearerAsync(pathOrUrl, accessToken, ct, client);
        }
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(response.StatusCode is System.Net.HttpStatusCode.Forbidden or System.Net.HttpStatusCode.NotFound
                ? "Spotify içeriğine erişilemedi. Playlist’e sahip/collaborator olduğunuzdan ve Spotify hesabınızın bağlı olduğundan emin olun."
                : $"Spotify API hatası: {(int)response.StatusCode}");
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    private async Task<string> ResolveSpotifyAccessTokenAsync(string? discordUserId, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(discordUserId))
        {
            var userToken = await TryGetUserAccessTokenAsync(discordUserId, ct);
            if (!string.IsNullOrWhiteSpace(userToken))
                return userToken;
        }
        return await GetSpotifyClientCredentialsTokenAsync(ct);
    }

    private async Task<string?> TryGetUserAccessTokenAsync(string discordUserId, CancellationToken ct)
    {
        var cacheKey = $"spotify:user:{discordUserId}:access";
        var cached = await _cache.GetAsync<string>(cacheKey, ct);
        if (!string.IsNullOrWhiteSpace(cached)) return cached;

        var link = await _db.SpotifyUserLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
        if (link == null || string.IsNullOrWhiteSpace(link.RefreshToken))
            return null;

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{SpotifyClientId()}:{SpotifyClientSecret()}")));
        request.Content = new FormUrlEncodedContent([
            new KeyValuePair<string, string>("grant_type", "refresh_token"),
            new KeyValuePair<string, string>("refresh_token", link.RefreshToken),
        ]);
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            return null;

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var token = JsonString(doc.RootElement, "access_token");
        if (string.IsNullOrWhiteSpace(token)) return null;

        var newRefresh = JsonString(doc.RootElement, "refresh_token");
        if (!string.IsNullOrWhiteSpace(newRefresh) && !string.Equals(newRefresh, link.RefreshToken, StringComparison.Ordinal))
        {
            var tracked = await _db.SpotifyUserLinks.FirstOrDefaultAsync(x => x.DiscordUserId == discordUserId, ct);
            if (tracked != null)
            {
                tracked.RefreshToken = newRefresh;
                tracked.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
        }

        var expires = Math.Max(60, (JsonInt(doc.RootElement, "expires_in") ?? 3600) - 60);
        await _cache.SetAsync(cacheKey, token, TimeSpan.FromSeconds(expires), ct);
        return token;
    }

    private async Task<JsonDocument> ExchangeSpotifyAuthorizationCodeAsync(string code, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{SpotifyClientId()}:{SpotifyClientSecret()}")));
        request.Content = new FormUrlEncodedContent([
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("redirect_uri", SpotifyRedirectUri()),
        ]);
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(body)
                    ? "Spotify yetkilendirme kodu değiştirilemedi."
                    : $"Spotify yetkilendirme başarısız: {body}");
        }
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    private bool HasSpotifyCredentials()
    {
        return !string.IsNullOrWhiteSpace(SpotifyClientId()) && !string.IsNullOrWhiteSpace(SpotifyClientSecret());
    }

    private string SpotifyClientId() =>
        (_configuration["Spotify:ClientId"] ?? Environment.GetEnvironmentVariable("SPOTIFY_CLIENT_ID") ?? string.Empty).Trim();

    private string SpotifyClientSecret() =>
        (_configuration["Spotify:ClientSecret"] ?? Environment.GetEnvironmentVariable("SPOTIFY_CLIENT_SECRET") ?? string.Empty).Trim();

    private string SpotifyRedirectUri()
    {
        var configured = (_configuration["Spotify:RedirectUri"]
            ?? Environment.GetEnvironmentVariable("SPOTIFY_REDIRECT_URI")
            ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(configured)) return configured;
        return "http://127.0.0.1:3000/auth/spotify/callback";
    }

    private async Task<string> GetSpotifyClientCredentialsTokenAsync(CancellationToken ct)
    {
        var cached = await _cache.GetAsync<string>("spotify:client_credentials:token", ct);
        if (!string.IsNullOrWhiteSpace(cached)) return cached;
        var clientId = SpotifyClientId();
        var clientSecret = SpotifyClientSecret();
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new InvalidOperationException("Spotify credentials eksik.");
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}")));
        request.Content = new FormUrlEncodedContent([new KeyValuePair<string, string>("grant_type", "client_credentials")]);
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException("Spotify token alınamadı.");
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var token = JsonString(doc.RootElement, "access_token") ?? throw new InvalidOperationException("Spotify token yanıtı geçersiz.");
        var expires = Math.Max(60, (JsonInt(doc.RootElement, "expires_in") ?? 3600) - 60);
        await _cache.SetAsync("spotify:client_credentials:token", token, TimeSpan.FromSeconds(expires), ct);
        return token;
    }

    private static bool IsSpotifyPremiumProduct(string? product)
    {
        if (string.IsNullOrWhiteSpace(product)) return false;
        return product.StartsWith("premium", StringComparison.OrdinalIgnoreCase);
    }

    private static SpotifyLinkStatusDto MapSpotifyLinkStatus(SpotifyUserLink? link, bool appConfigured)
    {
        if (link == null)
        {
            return new SpotifyLinkStatusDto
            {
                AppConfigured = appConfigured,
                Connected = false,
                PremiumRequired = true,
                Warning = appConfigured
                    ? "Spotify playlist içe aktarmak için hesabınızı bağlayın. Spotify Premium zorunludur."
                    : "Spotify Client ID/Secret sunucuda tanımlı değil.",
            };
        }

        var freeKnown = string.Equals(link.Product, "free", StringComparison.OrdinalIgnoreCase);
        string? warning = null;
        if (freeKnown || !link.IsPremium)
        {
            warning = "Spotify Premium gerekli. Free hesaplarla playlist içe aktarma kullanılamaz.";
        }
        else if (string.IsNullOrWhiteSpace(link.Product))
        {
            warning = "Spotify Premium önerilir. Development Mode’da uygulama sahibi Premium olmalı; bağlı hesabın Premium olduğundan emin olun.";
        }

        return new SpotifyLinkStatusDto
        {
            AppConfigured = appConfigured,
            Connected = true,
            IsPremium = link.IsPremium,
            PremiumRequired = true,
            SpotifyUserId = link.SpotifyUserId,
            DisplayName = link.DisplayName,
            Product = link.Product,
            ConnectedAt = link.ConnectedAt.ToString("O"),
            Warning = warning,
        };
    }

    private static int? ResolvePlaylistTotal(JsonElement root)
    {
        if (root.TryGetProperty("tracks", out var tracks) && tracks.ValueKind == JsonValueKind.Object)
            return JsonInt(tracks, "total");
        if (root.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Object)
            return JsonInt(items, "total");
        return null;
    }

    private static (JsonElement Items, string? Next, int? Total) ResolvePlaylistPaging(JsonElement root)
    {
        if (root.TryGetProperty("tracks", out var tracks) && tracks.ValueKind == JsonValueKind.Object)
        {
            var items = tracks.TryGetProperty("items", out var tItems) ? tItems : default;
            return (items, JsonString(tracks, "next"), JsonInt(tracks, "total"));
        }

        if (root.TryGetProperty("items", out var itemsObj) && itemsObj.ValueKind == JsonValueKind.Object)
        {
            var items = itemsObj.TryGetProperty("items", out var nested) ? nested : default;
            return (items, JsonString(itemsObj, "next"), JsonInt(itemsObj, "total"));
        }

        return (default, null, null);
    }

    private sealed record SpotifyOAuthState(string DiscordUserId, string? GuildId, string? ReturnPath);

    private static async Task<JsonDocument> GetJsonAsync(HttpClient client, string url, string errorMessage, CancellationToken ct)
    {
        using var response = await client.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(errorMessage);
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    private static string NormalizeProvider(string provider, string url)
    {
        var p = provider.Trim().ToLowerInvariant();
        if (p is "youtube" or "spotify") return p;
        return url.Contains("spotify.com", StringComparison.OrdinalIgnoreCase) ? "spotify" : "youtube";
    }

    private static string ProviderDisplay(string provider) => provider.Equals("spotify", StringComparison.OrdinalIgnoreCase) ? "Spotify" : "YouTube";

    private static string? ExtractYouTubePlaylistId(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return null;
        var query = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
        foreach (var pair in query)
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2 && parts[0].Equals("list", StringComparison.OrdinalIgnoreCase))
                return Uri.UnescapeDataString(parts[1]);
        }
        return null;
    }

    private static string? ExtractSpotifyId(string url, string type)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return null;
        var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        for (var i = 0; i < parts.Length - 1; i++)
        {
            if (parts[i].Equals(type, StringComparison.OrdinalIgnoreCase))
                return parts[i + 1].Split('?')[0];
        }
        return null;
    }

    private static string? JsonString(JsonElement element, string property)
    {
        return element.ValueKind == JsonValueKind.Object &&
               element.TryGetProperty(property, out var value) &&
               value.ValueKind != JsonValueKind.Null
            ? value.GetString()
            : null;
    }

    private static int? JsonInt(JsonElement element, string property)
    {
        return element.ValueKind == JsonValueKind.Object &&
               element.TryGetProperty(property, out var value) &&
               value.ValueKind == JsonValueKind.Number &&
               value.TryGetInt32(out var parsed)
            ? parsed
            : null;
    }

    private static long? JsonLong(JsonElement element, string property)
    {
        return element.ValueKind == JsonValueKind.Object &&
               element.TryGetProperty(property, out var value) &&
               value.ValueKind == JsonValueKind.Number &&
               value.TryGetInt64(out var parsed)
            ? parsed
            : null;
    }

    private static string? BestImage(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object) return null;
        if (element.TryGetProperty("images", out var images) && images.ValueKind == JsonValueKind.Array)
            return images.EnumerateArray().Select(i => JsonString(i, "url")).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        if (element.TryGetProperty("thumbnails", out var thumbnails) && thumbnails.ValueKind == JsonValueKind.Object)
        {
            foreach (var key in new[] { "maxres", "standard", "high", "medium", "default" })
            {
                if (thumbnails.TryGetProperty(key, out var image))
                {
                    var url = JsonString(image, "url");
                    if (!string.IsNullOrWhiteSpace(url)) return url;
                }
            }
        }
        return null;
    }

    private async Task<T> SendBotAsync<T>(HttpMethod method, string guildId, string action, object? body, string? botClientId, CancellationToken ct)
    {
        var botBase = (_configuration["Bot:HttpServerUrl"] ?? string.Empty).Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(botBase))
            throw new InvalidOperationException("Bot HTTP adresi yapılandırılmamış (Bot:HttpServerUrl).");

        var jsonBody = body == null ? string.Empty : JsonSerializer.Serialize(body, JsonOptions);
        using var request = new HttpRequestMessage(method, $"{botBase}/api/bot/music/{guildId}/{action}");
        var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
        BotHttpHmac.AddSignedHeaders(request, sharedSecret, jsonBody);
        if (!string.IsNullOrWhiteSpace(botClientId))
            request.Headers.TryAddWithoutValidation("X-Bot-ClientId", botClientId);
        var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
        if (!string.IsNullOrWhiteSpace(botToken))
            request.Headers.TryAddWithoutValidation("X-Bot-Token", botToken);
        if (body != null)
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        var client = _httpClientFactory.CreateClient("BotClient");
        using var response = await client.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw CreateBotException((int)response.StatusCode, responseBody);
        return JsonSerializer.Deserialize<T>(responseBody, JsonOptions)
               ?? throw new InvalidOperationException("Bot music endpoint boş yanıt döndü.");
    }

    private static BotMusicException CreateBotException(int statusCode, string responseBody)
    {
        var message = $"Bot music endpoint hatası: {statusCode}";
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("error", out var error) && error.ValueKind == JsonValueKind.String)
                message = error.GetString() ?? message;
            else if (document.RootElement.TryGetProperty("message", out var responseMessage) && responseMessage.ValueKind == JsonValueKind.String)
                message = responseMessage.GetString() ?? message;
        }
        catch (JsonException)
        {
            if (!string.IsNullOrWhiteSpace(responseBody))
                message = responseBody;
        }

        return new BotMusicException(statusCode, message, responseBody);
    }

    private static string SettingsKey(string guildId) => $"music:settings:{guildId}";

    private static int Clamp(int value, int min, int max) => Math.Min(max, Math.Max(min, value));

    private static string? NormalizeNullable(string? incoming, string? current)
    {
        if (incoming == null) return current;
        var trimmed = incoming.Trim();
        return trimmed.Length == 0 ? null : trimmed;
    }

    private static string NormalizeChoice(string? incoming, string current, string[] allowed)
    {
        if (string.IsNullOrWhiteSpace(incoming)) return current;
        var normalized = incoming.Trim().ToLowerInvariant();
        return allowed.Contains(normalized) ? normalized : current;
    }
}
