namespace Deveng.Discord.Api.DTOs;

public class TemporaryVoiceChannelLobbyDto
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
    public bool OwnerCanManageChannel { get; set; }
    public bool OwnerCanManagePermissions { get; set; }
    public bool OwnerIsPrioritySpeaker { get; set; }
    public bool OwnerCanMoveMembers { get; set; }
    public bool Enabled { get; set; }
    public List<TemporaryVoiceChannelRoleDto> Roles { get; set; } = new();
}

public class TemporaryVoiceChannelRoleDto
{
    public int Id { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int RoleType { get; set; } // 0: Ignore, 1: Access, 2: Moderator
    public bool CanManageAccess { get; set; }
}

public class TemporaryVoiceChannelDto
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
    public List<string> BannedUserIds { get; set; } = new();
    public DateTime LastActivityAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateTemporaryVoiceChannelLobbyDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string ChannelName { get; set; } = "Geçici Oda";
    public int? UserLimit { get; set; }
    public int? Bitrate { get; set; }
    public int? DeleteAfterMinutes { get; set; }
    public int? OwnershipTimeoutMinutes { get; set; }
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
    public List<CreateTemporaryVoiceChannelRoleDto> Roles { get; set; } = new();
}

public class CreateTemporaryVoiceChannelRoleDto
{
    public string RoleId { get; set; } = string.Empty;
    public int RoleType { get; set; } // 0: Ignore, 1: Access, 2: Moderator
    public bool CanManageAccess { get; set; } = false;
}

public class CreateTemporaryVoiceChannelDto
{
    public int LobbyId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? TextChannelId { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public int? UserLimit { get; set; }
    public int? Bitrate { get; set; }
}

public class UpdateTemporaryVoiceChannelOwnerDto
{
    public string OwnerId { get; set; } = string.Empty;
}