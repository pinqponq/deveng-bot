using System.Text.Json;
using System.Text.Json.Serialization;

namespace Deveng.Discord.Api.DTOs;

public class SafeNullableInt64Converter : JsonConverter<long?>
{
    private const long MaxDurationMs = 24L * 60 * 60 * 1000;

    private static long? NormalizeDuration(long value)
    {
        return value is > 0 and < MaxDurationMs ? value : null;
    }

    public override long? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType == JsonTokenType.Number)
        {
            if (reader.TryGetInt64(out var longValue))
                return NormalizeDuration(longValue);

            if (reader.TryGetDouble(out var doubleValue) &&
                double.IsFinite(doubleValue) &&
                doubleValue > 0 &&
                doubleValue < MaxDurationMs)
            {
                return Convert.ToInt64(Math.Round(doubleValue));
            }

            return null;
        }

        if (reader.TokenType == JsonTokenType.String &&
            long.TryParse(reader.GetString(), out var stringValue))
        {
            return NormalizeDuration(stringValue);
        }

        return null;
    }

    public override void Write(Utf8JsonWriter writer, long? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteNumberValue(value.Value);
        else
            writer.WriteNullValue();
    }
}

public class MusicSettingsDto
{
    public string GuildId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int DefaultVolume { get; set; } = 1;
    public int MaxQueueSize { get; set; } = 500;
    public string? DjRoleId { get; set; }
    public bool RequireDjRole { get; set; } = true;
    public bool SetupCompleted { get; set; }
    public bool AllowEveryoneToPlay { get; set; } = true;
    public string? AllowedTextChannelId { get; set; }
    public int AutoLeaveSeconds { get; set; } = 300;
    public bool AnnounceNowPlaying { get; set; } = true;
    public bool Autoplay { get; set; } = true;
    public bool PreventDuplicates { get; set; }
    public bool DjOnly { get; set; }
    public bool DjPlaylists { get; set; }
    public int MaxUserSongs { get; set; } = 500;
    public int PlaylistLimit { get; set; } = 50;
    public int PlaylistTrackLimit { get; set; } = 500;
    public int FavoriteLimit { get; set; } = 500;
    public int ImportTrackLimit { get; set; } = 500;
    public bool RadioEnabled { get; set; } = true;
    /// <summary>Kara listeli metin kanalları (JSON dizi; SP child tablodan uretir).</summary>
    public string? BlacklistedTextChannelIds { get; set; }
    /// <summary>SPOTIFY_CLIENT_ID / SECRET yapılandırılmış mı (panel uyarısı için).</summary>
    public bool SpotifyConfigured { get; set; }
}

public class SpotifyConnectUrlDto
{
    public string AuthorizeUrl { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
}

public class SpotifyOAuthCallbackDto
{
    public string Code { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
}

public class SpotifyLinkStatusDto
{
    public bool AppConfigured { get; set; }
    public bool Connected { get; set; }
    public bool IsPremium { get; set; }
    public bool PremiumRequired { get; set; } = true;
    public string? SpotifyUserId { get; set; }
    public string? DisplayName { get; set; }
    public string? Product { get; set; }
    public string? ConnectedAt { get; set; }
    /// <summary>Bağlı değil / free hesap için panel uyarısı.</summary>
    public string? Warning { get; set; }
    /// <summary>OAuth state’ten; callback sonrası müzik sayfasına dönüş.</summary>
    public string? GuildId { get; set; }
    public string? ReturnPath { get; set; }
}

public class SpotifyRemotePlaylistDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public string? ExternalUrl { get; set; }
    public int? TrackCount { get; set; }
    public bool Collaborative { get; set; }
    public bool OwnsPlaylist { get; set; }
}

public class SpotifyRemotePlaylistListDto
{
    public List<SpotifyRemotePlaylistDto> Playlists { get; set; } = [];
}

public class MusicPlaylistPreviewDto
{
    public string Provider { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? TrackCount { get; set; }
}

public class UpdateMusicSettingsDto
{
    public int? DefaultVolume { get; set; }
    public int? MaxQueueSize { get; set; }
    public string? DjRoleId { get; set; }
    public bool? RequireDjRole { get; set; }
    public bool? SetupCompleted { get; set; }
    public bool? AllowEveryoneToPlay { get; set; }
    public string? AllowedTextChannelId { get; set; }
    public int? AutoLeaveSeconds { get; set; }
    public bool? AnnounceNowPlaying { get; set; }
    public bool? Autoplay { get; set; }
    public bool? PreventDuplicates { get; set; }
    public bool? DjOnly { get; set; }
    public bool? DjPlaylists { get; set; }
    public int? MaxUserSongs { get; set; }
    public int? PlaylistLimit { get; set; }
    public int? PlaylistTrackLimit { get; set; }
    public int? FavoriteLimit { get; set; }
    public int? ImportTrackLimit { get; set; }
    public bool? RadioEnabled { get; set; }
    public string? BlacklistedTextChannelIds { get; set; }
}

public class MusicRequesterDto
{
    public string Id { get; set; } = string.Empty;
    public string? Username { get; set; }
}

public class MusicTrackDto
{
    public string Id { get; set; } = string.Empty;
    public string? EncodedTrack { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    [JsonConverter(typeof(SafeNullableInt64Converter))]
    public long? DurationMs { get; set; }
    public bool? IsStream { get; set; }
    public string? Uri { get; set; }
    public string Source { get; set; } = "unknown";
    public string? ThumbnailUrl { get; set; }
    public string? ExternalProvider { get; set; }
    public string? SpotifyTrackId { get; set; }
    public string? SpotifyUrl { get; set; }
    public int? Popularity { get; set; }
    public string[]? Genres { get; set; }
    public string? ReleaseDate { get; set; }
    public MusicRequesterDto? Requester { get; set; }
    public double? Confidence { get; set; }
}

public class MusicQueueItemDto : MusicTrackDto
{
    public string QueueItemId { get; set; } = string.Empty;
    public int Position { get; set; }
    public string AddedAt { get; set; } = string.Empty;
}

public class MusicStateDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? ClientId { get; set; }
    public string Status { get; set; } = "idle";
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
    public MusicQueueItemDto? NowPlaying { get; set; }
    public List<MusicQueueItemDto> Queue { get; set; } = [];
    public int Volume { get; set; } = 1;
    public string LoopMode { get; set; } = "off";
    public bool Paused { get; set; }
    public long PositionMs { get; set; }
    public bool Autoplay { get; set; }
    public string UpdatedAt { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

public class MusicSearchResponseDto
{
    public List<MusicTrackDto> Tracks { get; set; } = [];
}

public class MusicPlayRequestDto
{
    public string Query { get; set; } = string.Empty;
    public string Source { get; set; } = "auto";
    public MusicTrackDto? Track { get; set; }
    public MusicRequesterDto? Requester { get; set; }
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
    public bool PlayNext { get; set; }
}

public class MusicBulkPlayRequestDto
{
    public string Mode { get; set; } = "enqueue";
    public List<MusicTrackDto> Tracks { get; set; } = [];
    public MusicRequesterDto? Requester { get; set; }
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
}

public class MusicControlRequestDto
{
    public string Action { get; set; } = string.Empty;
    public int? Volume { get; set; }
    public long? SeekMs { get; set; }
    public long? DeltaMs { get; set; }
    public int? Position { get; set; }
}

public class MusicQueueOperationDto
{
    public string Operation { get; set; } = string.Empty;
    public string QueueItemId { get; set; } = string.Empty;
    public int? Position { get; set; }
}

public class MusicLyricsResponseDto
{
    public MusicTrackDto? Track { get; set; }
    public string? Lyrics { get; set; }
    public string? Source { get; set; }
    public string? Provider { get; set; }
}

public class MusicFavoriteRequestDto
{
    public string UserId { get; set; } = string.Empty;
    public MusicTrackDto? Track { get; set; }
}

public class MusicFavoriteResponseDto
{
    public bool Liked { get; set; }
    public List<MusicTrackDto> Tracks { get; set; } = [];
}

public class MusicHistoryItemDto : MusicTrackDto
{
    public long HistoryId { get; set; }
    public string PlayedAt { get; set; } = string.Empty;
    public string GuildId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? RequesterUsername { get; set; }
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
}

public class MusicTrackListResponseDto
{
    public List<MusicTrackDto> Tracks { get; set; } = [];
}

public class MusicHistoryResponseDto
{
    public List<MusicHistoryItemDto> Tracks { get; set; } = [];
}

public class MusicHistoryRecordRequestDto
{
    public MusicTrackDto Track { get; set; } = new();
    public string? UserId { get; set; }
    public string? RequesterUsername { get; set; }
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
    public long? PositionMs { get; set; }
    public string Source { get; set; } = "bot";
}

public class MusicPlaylistDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? OwnerUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Scope { get; set; } = "guild";
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public string? ExternalProvider { get; set; }
    public string? ExternalPlaylistId { get; set; }
    public string? ExternalUrl { get; set; }
    public int TotalTracks { get; set; }
    public int ImportedTracks { get; set; }
    public int FailedTracks { get; set; }
    public string? LastImportStatus { get; set; }
    public string? LastImportError { get; set; }
    public string? LastImportedAt { get; set; }
    public List<MusicTrackDto> Tracks { get; set; } = [];
}

public class MusicPlaylistListResponseDto
{
    public List<MusicPlaylistDto> Playlists { get; set; } = [];
}

public class MusicPlaylistImportRequestDto
{
    public string Url { get; set; } = string.Empty;
    public string Provider { get; set; } = "youtube";
    public string? Name { get; set; }
    public string Scope { get; set; } = "guild";
    public string? OwnerUserId { get; set; }
    public bool ReplaceExisting { get; set; }
}

public class MusicPlaylistImportJobDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public int? PlaylistId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public int TotalTracks { get; set; }
    public int ProcessedTracks { get; set; }
    public int ImportedTracks { get; set; }
    public int FailedTracks { get; set; }
    public string? ErrorMessage { get; set; }
    public string StartedAt { get; set; } = string.Empty;
    public string? CompletedAt { get; set; }
}

public class MusicRadioStationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? Genre { get; set; }
    public string? ImageUrl { get; set; }
}

public class MusicRadioStationsResponseDto
{
    public List<MusicRadioStationDto> Stations { get; set; } = [];
}

