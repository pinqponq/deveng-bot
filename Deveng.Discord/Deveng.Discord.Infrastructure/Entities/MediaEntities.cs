using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class MusicSettings : IGuildScoped, IAuditableEntity
{
    public string GuildId { get; set; } = string.Empty;
    public int DefaultVolume { get; set; } = 1;
    public int MaxQueueSize { get; set; } = 500;
    public string? DjRoleId { get; set; }
    public bool AllowEveryoneToPlay { get; set; } = true;
    public string? AllowedTextChannelId { get; set; }
    public int AutoLeaveSeconds { get; set; } = 300;
    public bool AnnounceNowPlaying { get; set; } = true;
    public bool Mode247 { get; set; }
    public bool Autoplay { get; set; } = true;
    public bool PreventDuplicates { get; set; }
    public bool DjOnly { get; set; }
    public bool DjPlaylists { get; set; }
    public int MaxUserSongs { get; set; } = 500;
    public bool RequireDjRole { get; set; } = true;
    public bool SetupCompleted { get; set; }
    public int PlaylistLimit { get; set; } = 50;
    public int PlaylistTrackLimit { get; set; } = 500;
    public int FavoriteLimit { get; set; } = 500;
    public int ImportTrackLimit { get; set; } = 500;
    public bool RadioEnabled { get; set; } = true;
    public int CrossfadeSeconds { get; set; }
    public string Quality { get; set; } = "standard";
    public bool Bassboost { get; set; }
    public bool Nightcore { get; set; }
    public bool Slowed { get; set; }
    public decimal Speed { get; set; } = 1.00m;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<MusicBlacklistedTextChannel> BlacklistedTextChannels { get; set; } = [];
}

public class MusicBlacklistedTextChannel : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public MusicSettings Settings { get; set; } = null!;
}

public class MusicPlaylist : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? OwnerUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImportSource { get; set; }
    public string? CoverUrl { get; set; }
    public string? ExternalProvider { get; set; }
    public string? ExternalPlaylistId { get; set; }
    public string? ExternalUrl { get; set; }
    public int TotalTracks { get; set; }
    public int ImportedTracks { get; set; }
    public int FailedTracks { get; set; }
    public string? LastImportStatus { get; set; }
    public string? LastImportError { get; set; }
    public DateTime? LastImportedAt { get; set; }
    public bool IsAutoplaySource { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<MusicPlaylistItem> Items { get; set; } = [];
    public ICollection<MusicPlaylistImportJob> ImportJobs { get; set; } = [];
}

public class MusicPlaylistItem
{
    public int Id { get; set; }
    public int PlaylistId { get; set; }
    public string TrackId { get; set; } = string.Empty;
    public string? EncodedTrack { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    public long? DurationMs { get; set; }
    public string? Uri { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Album { get; set; }
    public string? Artists { get; set; }
    public string? ExternalProvider { get; set; }
    public string? ExternalTrackId { get; set; }
    public string? SpotifyTrackId { get; set; }
    public string? SpotifyArtistId { get; set; }
    public string? SpotifyAlbumId { get; set; }
    public string? SpotifyUrl { get; set; }
    public int? Popularity { get; set; }
    public string? Genres { get; set; }
    public string? ReleaseDate { get; set; }
    public string? AlbumImageUrl { get; set; }
    public string? ImportStatus { get; set; }
    public string? ImportError { get; set; }
    public string? AddedByUserId { get; set; }
    public int Position { get; set; }
    public DateTime CreatedAt { get; set; }

    public MusicPlaylist Playlist { get; set; } = null!;
}

public class MusicFavorite : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string TrackId { get; set; } = string.Empty;
    public string? EncodedTrack { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    public long? DurationMs { get; set; }
    public string? Uri { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Album { get; set; }
    public string? Artists { get; set; }
    public string? ExternalProvider { get; set; }
    public string? SpotifyTrackId { get; set; }
    public string? SpotifyArtistId { get; set; }
    public string? SpotifyAlbumId { get; set; }
    public string? SpotifyUrl { get; set; }
    public int? Popularity { get; set; }
    public string? Genres { get; set; }
    public string? ReleaseDate { get; set; }
    public string? AlbumImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MusicHistory : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string TrackId { get; set; } = string.Empty;
    public string? EncodedTrack { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    public long? DurationMs { get; set; }
    public string? Uri { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Album { get; set; }
    public string? Artists { get; set; }
    public long? SessionId { get; set; }
    public string? ExternalProvider { get; set; }
    public string? SpotifyTrackId { get; set; }
    public string? SpotifyArtistId { get; set; }
    public string? SpotifyAlbumId { get; set; }
    public string? SpotifyUrl { get; set; }
    public int? Popularity { get; set; }
    public string? Genres { get; set; }
    public string? ReleaseDate { get; set; }
    public string? AlbumImageUrl { get; set; }
    public string? RequesterUsername { get; set; }
    public string? VoiceChannelId { get; set; }
    public string? TextChannelId { get; set; }
    public long? PositionMs { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? EndReason { get; set; }

    public MusicSession? Session { get; set; }
}

public class MusicPlaylistImportJob : IGuildScoped, IAuditableEntity
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
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public MusicPlaylist? Playlist { get; set; }
}

public class MusicSession : IGuildScoped, IAuditableEntity
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? CoverTrackId { get; set; }
    public string? CoverTitle { get; set; }
    public string? CoverThumbnailUrl { get; set; }
    public int TrackCount { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<MusicSessionParticipant> Participants { get; set; } = [];
    public ICollection<MusicHistory> HistoryEntries { get; set; } = [];
}

public class MusicSessionParticipant
{
    public long Id { get; set; }
    public long SessionId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public MusicSession Session { get; set; } = null!;
}

public class MusicRadioStation : IAuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? Genre { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MusicLyricsCache : IAuditableEntity
{
    public long Id { get; set; }
    public string TrackId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    public string? Source { get; set; }
    public string? Provider { get; set; }
    public string Lyrics { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class TemporaryVoiceChannelLobby : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string ChannelName { get; set; } = "Geçici Oda";
    public int? UserLimit { get; set; }
    public int? Bitrate { get; set; }
    public int? DeleteAfterMinutes { get; set; }
    public int? OwnershipTimeoutMinutes { get; set; }
    public bool SyncCategoryPermissions { get; set; }
    public bool SyncChannelPermissions { get; set; }
    public bool CreateTextChannel { get; set; }
    public bool RestrictCommandsToTextChannel { get; set; }
    public bool PinCommandUsage { get; set; }
    public bool RestrictTextChannel { get; set; }
    public bool OwnerCanManageChannel { get; set; } = true;
    public bool OwnerCanManagePermissions { get; set; } = true;
    public bool OwnerIsPrioritySpeaker { get; set; }
    public bool OwnerCanMoveMembers { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool OwnerCanStream { get; set; } = true;

    public ICollection<TemporaryVoiceChannelRole> Roles { get; set; } = [];
    public ICollection<TemporaryVoiceChannelInstance> Instances { get; set; } = [];
}

public class TemporaryVoiceChannelRole
{
    public int Id { get; set; }
    public int LobbyId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int RoleType { get; set; }
    public bool CanManageAccess { get; set; }
    public DateTime CreatedAt { get; set; }

    public TemporaryVoiceChannelLobby Lobby { get; set; } = null!;
}

public class TemporaryVoiceChannelInstance : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public int LobbyId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? TextChannelId { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
    public bool IsHidden { get; set; }
    public int? UserLimit { get; set; }
    public int? Bitrate { get; set; }
    public string? BannedUserIds { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public TemporaryVoiceChannelLobby Lobby { get; set; } = null!;
}

/// <summary>Discord kullanıcısının Spotify OAuth bağlantısı (playlist import için).</summary>
public class SpotifyUserLink : IAuditableEntity
{
    public string DiscordUserId { get; set; } = string.Empty;
    public string SpotifyUserId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public string? Scope { get; set; }
    /// <summary>Spotify product: premium / free / null (API alanı yoksa).</summary>
    public string? Product { get; set; }
    public bool IsPremium { get; set; }
    public DateTime ConnectedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
