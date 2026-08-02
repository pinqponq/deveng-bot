using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IMusicService
{
    Task<MusicSettingsDto> GetSettingsAsync(string guildId, CancellationToken ct = default);
    Task<MusicSettingsDto> UpdateSettingsAsync(string guildId, UpdateMusicSettingsDto dto, CancellationToken ct = default);
    Task<MusicStateDto> GetStateAsync(string guildId, string? botClientId = null, CancellationToken ct = default);
    Task<MusicSearchResponseDto> SearchAsync(string guildId, string query, string source, string? botClientId = null, CancellationToken ct = default);
    Task<MusicStateDto> PlayAsync(string guildId, MusicPlayRequestDto dto, string? botClientId = null, CancellationToken ct = default);
    Task<MusicStateDto> BulkPlayAsync(string guildId, MusicBulkPlayRequestDto dto, string? botClientId = null, CancellationToken ct = default);
    Task<MusicStateDto> ControlAsync(string guildId, MusicControlRequestDto dto, string? botClientId = null, CancellationToken ct = default);
    Task<MusicStateDto> QueueOperationAsync(string guildId, MusicQueueOperationDto dto, string? botClientId = null, CancellationToken ct = default);
    Task<MusicLyricsResponseDto> LyricsAsync(string guildId, string? query, string? botClientId = null, CancellationToken ct = default);
    Task<MusicFavoriteResponseDto> ToggleFavoriteAsync(string guildId, MusicFavoriteRequestDto dto, string? botClientId = null, CancellationToken ct = default);
    Task<MusicTrackListResponseDto> GetFavoritesAsync(string guildId, string userId, string? botClientId = null, CancellationToken ct = default);
    Task<MusicHistoryResponseDto> GetHistoryAsync(string guildId, string? userId, string? botClientId = null, CancellationToken ct = default);
    Task RecordHistoryAsync(string guildId, MusicHistoryRecordRequestDto dto, CancellationToken ct = default);
    Task<MusicPlaylistListResponseDto> GetPlaylistsAsync(string guildId, string? userId = null, CancellationToken ct = default);
    Task<MusicPlaylistDto?> GetPlaylistAsync(string guildId, int playlistId, CancellationToken ct = default);
    Task<MusicPlaylistImportJobDto> ImportPlaylistAsync(string guildId, MusicPlaylistImportRequestDto dto, CancellationToken ct = default);
    Task<MusicPlaylistPreviewDto> PreviewPlaylistAsync(string guildId, string url, string? discordUserId = null, CancellationToken ct = default);
    Task<MusicPlaylistImportJobDto?> GetImportJobAsync(string guildId, long jobId, CancellationToken ct = default);
    Task<MusicRadioStationsResponseDto> GetRadioStationsAsync(string guildId, string? query = null, CancellationToken ct = default);
    Task CleanupGuildAsync(string guildId, CancellationToken ct = default);

    Task<SpotifyConnectUrlDto> CreateSpotifyConnectUrlAsync(string discordUserId, string? guildId, string? returnPath, CancellationToken ct = default);
    Task<SpotifyLinkStatusDto> CompleteSpotifyOAuthAsync(string code, string state, CancellationToken ct = default);
    Task<SpotifyLinkStatusDto> GetSpotifyLinkStatusAsync(string discordUserId, CancellationToken ct = default);
    Task DisconnectSpotifyAsync(string discordUserId, CancellationToken ct = default);
    Task<SpotifyRemotePlaylistListDto> ListSpotifyPlaylistsAsync(string discordUserId, CancellationToken ct = default);
}
