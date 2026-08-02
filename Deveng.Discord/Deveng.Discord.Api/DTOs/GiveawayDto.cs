namespace Deveng.Discord.Api.DTOs;

public class GiveawayDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Prize { get; set; } = string.Empty;
    public int WinnerCount { get; set; } = 1;
    public DateTime EndDate { get; set; }
    public string? TimeZone { get; set; } = "Europe/Istanbul";
    public bool IsActive { get; set; }
    public bool IsEnded { get; set; }

    public int
        RolePermissionType
    {
        get;
        set;
    } // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver

    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<GiveawayRoleDto> Roles { get; set; } = new();
    public List<GiveawayAllowedRoleDto> AllowedRoles { get; set; } = new();
    public int ParticipantCount { get; set; }
    public List<GiveawayWinnerDto> Winners { get; set; } = new();
}

public class GiveawayRoleDto
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public decimal WinChanceMultiplier { get; set; } = 1.00m;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class GiveawayAllowedRoleDto
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class GiveawayParticipantDto
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

public class GiveawayWinnerDto
{
    public int Id { get; set; }
    public int GiveawayId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime WonAt { get; set; }
}

public class CreateGiveawayDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Prize { get; set; } = string.Empty;
    public int WinnerCount { get; set; } = 1;
    public DateTime EndDate { get; set; }
    public string? TimeZone { get; set; } = "Europe/Istanbul";

    public int RolePermissionType { get; set; } =
        0; // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver

    public bool IsEmbed { get; set; } = true;
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
    public List<CreateGiveawayRoleDto> Roles { get; set; } = new();
    public List<string> AllowedRoleIds { get; set; } = new();
}

public class CreateGiveawayRoleDto
{
    public string RoleId { get; set; } = string.Empty;
    public decimal WinChanceMultiplier { get; set; } = 1.00m;
}

public class UpdateGiveawayDto
{
    public string? ChannelId { get; set; }
    public string? MessageId { get; set; }
    public string? Name { get; set; }
    public string? Prize { get; set; }
    public int? WinnerCount { get; set; }
    public DateTime? EndDate { get; set; }
    public string? TimeZone { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsEnded { get; set; }
    public int? RolePermissionType { get; set; }
    public bool? IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool? EmbedUseTimestamp { get; set; }
    public string? EmbedFieldsJson { get; set; }
    public List<CreateGiveawayRoleDto>? Roles { get; set; }
    public List<string>? AllowedRoleIds { get; set; }
}

public class GiveawayEmbedSettingsDto
{
    public bool IsEmbed { get; set; } = true;
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
}