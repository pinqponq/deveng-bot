using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("TemporaryVoiceChannelLobby")]
public class TemporaryVoiceChannelLobby
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [Required][MaxLength(100)] public string ChannelName { get; set; } = "Geçici Oda";

    public int? UserLimit { get; set; }

    public int? Bitrate { get; set; }

    public int? DeleteAfterMinutes { get; set; } // 0 = hemen, null = asla

    public int? OwnershipTimeoutMinutes { get; set; } // 0 = hemen, null = asla

    public bool SyncCategoryPermissions { get; set; } = false;

    public bool SyncChannelPermissions { get; set; } = false;

    public bool CreateTextChannel { get; set; } = false;

    public bool RestrictCommandsToTextChannel { get; set; } = false;

    public bool PinCommandUsage { get; set; } = false;

    public bool RestrictTextChannel { get; set; } = false;

    public bool OwnerCanManageChannel { get; set; } = true;

    public bool OwnerCanManagePermissions { get; set; } = true;

    public bool OwnerIsPrioritySpeaker { get; set; } = false;

    public bool OwnerCanMoveMembers { get; set; } = false;

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<TemporaryVoiceChannelRole> Roles { get; set; } = new List<TemporaryVoiceChannelRole>();
    public virtual ICollection<TemporaryVoiceChannel> Channels { get; set; } = new List<TemporaryVoiceChannel>();
}

[Table("TemporaryVoiceChannelRole")]
public class TemporaryVoiceChannelRole
{
    [Key] public int Id { get; set; }

    [Required] public int LobbyId { get; set; }

    [Required][MaxLength(50)] public string RoleId { get; set; } = string.Empty;

    [Required] public int RoleType { get; set; } // 0: Ignore, 1: Access, 2: Moderator

    public bool CanManageAccess { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("LobbyId")] public virtual TemporaryVoiceChannelLobby Lobby { get; set; } = null!;
}

[Table("TemporaryVoiceChannel")]
public class TemporaryVoiceChannel
{
    [Key] public int Id { get; set; }

    [Required] public int LobbyId { get; set; }

    [Required][MaxLength(50)] public string GuildId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ChannelId { get; set; } = string.Empty;

    [MaxLength(50)] public string? TextChannelId { get; set; }

    [Required][MaxLength(50)] public string OwnerId { get; set; } = string.Empty;

    [Required][MaxLength(100)] public string ChannelName { get; set; } = string.Empty;

    public bool IsLocked { get; set; } = false;

    public bool IsHidden { get; set; } = false;

    public int? UserLimit { get; set; }

    public int? Bitrate { get; set; }

    public string? BannedUserIds { get; set; } // JSON array of user IDs

    public DateTime LastActivityAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("LobbyId")] public virtual TemporaryVoiceChannelLobby Lobby { get; set; } = null!;
}