using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class MusicSettingsConfiguration : IEntityTypeConfiguration<MusicSettings>
{
    public void Configure(EntityTypeBuilder<MusicSettings> builder)
    {
        builder.ToTable("music_settings");
        builder.HasKey(x => x.GuildId);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.DjRoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.AllowedTextChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Quality).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Speed).HasPrecision(4, 2);
    }
}

internal sealed class MusicBlacklistedTextChannelConfiguration : IEntityTypeConfiguration<MusicBlacklistedTextChannel>
{
    public void Configure(EntityTypeBuilder<MusicBlacklistedTextChannel> builder)
    {
        builder.ToTable("music_blacklisted_text_channel");
        builder.HasKey(x => new { x.GuildId, x.ChannelId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.Settings).WithMany(x => x.BlacklistedTextChannels).HasForeignKey(x => x.GuildId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MusicPlaylistConfiguration : IEntityTypeConfiguration<MusicPlaylist>
{
    public void Configure(EntityTypeBuilder<MusicPlaylist> builder)
    {
        builder.ToTable("music_playlists");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.OwnerUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Scope).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.ImportSource).HasMaxLength(50);
        builder.Property(x => x.CoverUrl).HasMaxLength(1000);
        builder.Property(x => x.ExternalProvider).HasMaxLength(32);
        builder.Property(x => x.ExternalPlaylistId).HasMaxLength(128);
        builder.Property(x => x.ExternalUrl).HasMaxLength(2048);
        builder.Property(x => x.LastImportStatus).HasMaxLength(32);
        builder.HasIndex(x => new { x.GuildId, x.OwnerUserId });
        builder.HasIndex(x => new { x.GuildId, x.ExternalProvider, x.ExternalPlaylistId });
    }
}

internal sealed class MusicPlaylistItemConfiguration : IEntityTypeConfiguration<MusicPlaylistItem>
{
    public void Configure(EntityTypeBuilder<MusicPlaylistItem> builder)
    {
        builder.ToTable("music_playlist_items");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TrackId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(512).IsRequired();
        builder.Property(x => x.Author).HasMaxLength(256);
        builder.Property(x => x.Uri).HasMaxLength(2048);
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ThumbnailUrl).HasMaxLength(2048);
        builder.Property(x => x.Album).HasMaxLength(256);
        builder.Property(x => x.Artists).HasMaxLength(512);
        builder.Property(x => x.ExternalProvider).HasMaxLength(32);
        builder.Property(x => x.ExternalTrackId).HasMaxLength(128);
        builder.Property(x => x.SpotifyTrackId).HasMaxLength(64);
        builder.Property(x => x.SpotifyArtistId).HasMaxLength(64);
        builder.Property(x => x.SpotifyAlbumId).HasMaxLength(64);
        builder.Property(x => x.SpotifyUrl).HasMaxLength(2048);
        builder.Property(x => x.Genres).HasMaxLength(512);
        builder.Property(x => x.ReleaseDate).HasMaxLength(32);
        builder.Property(x => x.AlbumImageUrl).HasMaxLength(2048);
        builder.Property(x => x.ImportStatus).HasMaxLength(32);
        builder.Property(x => x.AddedByUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasOne(x => x.Playlist).WithMany(x => x.Items).HasForeignKey(x => x.PlaylistId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MusicFavoriteConfiguration : IEntityTypeConfiguration<MusicFavorite>
{
    public void Configure(EntityTypeBuilder<MusicFavorite> builder)
    {
        builder.ToTable("music_favorites");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.TrackId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(512).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.UserId, x.TrackId }).IsUnique();
    }
}

internal sealed class MusicHistoryConfiguration : IEntityTypeConfiguration<MusicHistory>
{
    public void Configure(EntityTypeBuilder<MusicHistory> builder)
    {
        builder.ToTable("music_history");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.TrackId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(512).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.Property(x => x.VoiceChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.TextChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.EndReason).HasMaxLength(64);
        builder.HasIndex(x => new { x.GuildId, x.StartedAt }).IsDescending(false, true);
        builder.HasOne(x => x.Session).WithMany(x => x.HistoryEntries).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class MusicPlaylistImportJobConfiguration : IEntityTypeConfiguration<MusicPlaylistImportJob>
{
    public void Configure(EntityTypeBuilder<MusicPlaylistImportJob> builder)
    {
        builder.ToTable("music_playlist_import_jobs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Provider).HasMaxLength(32).IsRequired();
        builder.Property(x => x.SourceUrl).HasMaxLength(2048).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.HasOne(x => x.Playlist).WithMany(x => x.ImportJobs).HasForeignKey(x => x.PlaylistId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class MusicSessionConfiguration : IEntityTypeConfiguration<MusicSession>
{
    public void Configure(EntityTypeBuilder<MusicSession> builder)
    {
        builder.ToTable("music_sessions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.Property(x => x.CoverTrackId).HasMaxLength(256);
        builder.Property(x => x.CoverTitle).HasMaxLength(512);
        builder.Property(x => x.CoverThumbnailUrl).HasMaxLength(2048);
    }
}

internal sealed class MusicSessionParticipantConfiguration : IEntityTypeConfiguration<MusicSessionParticipant>
{
    public void Configure(EntityTypeBuilder<MusicSessionParticipant> builder)
    {
        builder.ToTable("music_session_participants");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Username).HasMaxLength(256);
        builder.Property(x => x.AvatarUrl).HasMaxLength(2048);
        builder.HasIndex(x => new { x.SessionId, x.UserId }).IsUnique();
        builder.HasOne(x => x.Session).WithMany(x => x.Participants).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MusicRadioStationConfiguration : IEntityTypeConfiguration<MusicRadioStation>
{
    public void Configure(EntityTypeBuilder<MusicRadioStation> builder)
    {
        builder.ToTable("music_radio_stations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.StreamUrl).HasMaxLength(2048).IsRequired();
        builder.Property(x => x.Country).HasMaxLength(64);
        builder.Property(x => x.Genre).HasMaxLength(128);
        builder.Property(x => x.ImageUrl).HasMaxLength(2048);
    }
}

internal sealed class MusicLyricsCacheConfiguration : IEntityTypeConfiguration<MusicLyricsCache>
{
    public void Configure(EntityTypeBuilder<MusicLyricsCache> builder)
    {
        builder.ToTable("music_lyrics_cache");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TrackId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(512).IsRequired();
        builder.Property(x => x.Author).HasMaxLength(256);
        builder.Property(x => x.Source).HasMaxLength(32);
        builder.Property(x => x.Provider).HasMaxLength(64);
    }
}

internal sealed class TemporaryVoiceChannelLobbyConfiguration : IEntityTypeConfiguration<TemporaryVoiceChannelLobby>
{
    public void Configure(EntityTypeBuilder<TemporaryVoiceChannelLobby> builder)
    {
        builder.ToTable("temporary_voice_channel_lobby");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelName).HasMaxLength(100).IsRequired();
    }
}

internal sealed class TemporaryVoiceChannelRoleConfiguration : IEntityTypeConfiguration<TemporaryVoiceChannelRole>
{
    public void Configure(EntityTypeBuilder<TemporaryVoiceChannelRole> builder)
    {
        builder.ToTable("temporary_voice_channel_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.Lobby).WithMany(x => x.Roles).HasForeignKey(x => x.LobbyId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TemporaryVoiceChannelInstanceConfiguration : IEntityTypeConfiguration<TemporaryVoiceChannelInstance>
{
    public void Configure(EntityTypeBuilder<TemporaryVoiceChannelInstance> builder)
    {
        builder.ToTable("temporary_voice_channel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.TextChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.OwnerId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelName).HasMaxLength(100).IsRequired();
        builder.HasOne(x => x.Lobby).WithMany(x => x.Instances).HasForeignKey(x => x.LobbyId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class SpotifyUserLinkConfiguration : IEntityTypeConfiguration<SpotifyUserLink>
{
    public void Configure(EntityTypeBuilder<SpotifyUserLink> builder)
    {
        builder.ToTable("spotify_user_links");
        builder.HasKey(x => x.DiscordUserId);
        builder.Property(x => x.DiscordUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.SpotifyUserId).HasMaxLength(64).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(256);
        builder.Property(x => x.RefreshToken).HasMaxLength(2048).IsRequired();
        builder.Property(x => x.Scope).HasMaxLength(512);
        builder.Property(x => x.Product).HasMaxLength(64);
        builder.HasIndex(x => x.SpotifyUserId);
    }
}
