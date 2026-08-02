namespace Deveng.Discord.Api.DTOs;

public class HelpCommandDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Enabled { get; set; }
    public int CooldownType { get; set; } // 0: Hiçbiri, 1: Sunucu, 2: Kullanıcı
    public int? CooldownSeconds { get; set; }
    public bool SendAsDM { get; set; }
    public bool DeleteAfterUse { get; set; }
    public bool DisableReply { get; set; }

    public int
        RolePermissionType
    {
        get;
        set;
    } // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver

    public int
        ChannelPermissionType
    {
        get;
        set;
    } // 0: Bu kanallar hariç diğer tüm kanallarda izin verme, 1: Bu kanallar hariç tüm kanallara izin ver

    public bool IsEmbed { get; set; }
    public string? Message { get; set; }
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
    public List<string> RoleIds { get; set; } = new();
    public List<string> ChannelIds { get; set; } = new();
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateHelpCommandDto
{
    public string CommandName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Enabled { get; set; } = true;
    public int CooldownType { get; set; } = 0;
    public int? CooldownSeconds { get; set; }
    public bool SendAsDM { get; set; } = false;
    public bool DeleteAfterUse { get; set; } = false;
    public bool DisableReply { get; set; } = false;
    public int RolePermissionType { get; set; } = 1;
    public int ChannelPermissionType { get; set; } = 1;
    public bool IsEmbed { get; set; } = false;
    public string? Message { get; set; }
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
    public List<string> RoleIds { get; set; } = new();
    public List<string> ChannelIds { get; set; } = new();
}

public class UpdateHelpCommandDto
{
    public string? Description { get; set; }
    public bool? Enabled { get; set; }
    public int? CooldownType { get; set; }
    public int? CooldownSeconds { get; set; }
    public bool? SendAsDM { get; set; }
    public bool? DeleteAfterUse { get; set; }
    public bool? DisableReply { get; set; }
    public int? RolePermissionType { get; set; }
    public int? ChannelPermissionType { get; set; }
    public bool? IsEmbed { get; set; }
    public string? Message { get; set; }
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
    public List<string>? RoleIds { get; set; }
    public List<string>? ChannelIds { get; set; }
}