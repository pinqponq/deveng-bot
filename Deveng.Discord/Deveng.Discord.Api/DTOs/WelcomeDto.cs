namespace Deveng.Discord.Api.DTOs;

public class WelcomeDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool Enabled { get; set; }
    public bool GiveRole { get; set; }
    public string? RoleId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

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

    public bool SendWelcomeCard { get; set; }
    public string? CardTitle { get; set; }
    public string? CardUsernameText { get; set; }
    public string? CardMemberText { get; set; }
    public string? CardBackgroundColor1 { get; set; }
    public string? CardBackgroundColor2 { get; set; }
    public string? CardTextColor { get; set; }
    public string? CardBorderColor { get; set; }

    public bool SendDM { get; set; }
    public string? DMMessage { get; set; }

    public bool IsDMEmbed { get; set; }
    public string? DMEmbedTitle { get; set; }
    public string? DMEmbedDescription { get; set; }
    public string? DMEmbedColor { get; set; }
    public string? DMEmbedThumbnail { get; set; }
    public string? DMEmbedImage { get; set; }
    public string? DMEmbedFooter { get; set; }
    public string? DMEmbedTitleUrl { get; set; }
    public string? DMEmbedAuthorName { get; set; }
    public string? DMEmbedAuthorIcon { get; set; }
    public string? DMEmbedAuthorUrl { get; set; }
    public string? DMEmbedFooterIcon { get; set; }
    public bool DMEmbedUseTimestamp { get; set; } = true;
    public string? DMEmbedFieldsJson { get; set; }

    public bool SendDMCard { get; set; }
    public string? DMCardTitle { get; set; }
    public string? DMCardUsernameText { get; set; }
    public string? DMCardMemberText { get; set; }
    public string? DMCardBackgroundColor1 { get; set; }
    public string? DMCardBackgroundColor2 { get; set; }
    public string? DMCardTextColor { get; set; }
    public string? DMCardBorderColor { get; set; }
}

public class WelcomeEmbedSettingsDto
{
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
}

public class WelcomeCardSettingsDto
{
    public bool SendWelcomeCard { get; set; }
    public string? CardTitle { get; set; }
    public string? CardUsernameText { get; set; }
    public string? CardMemberText { get; set; }
    public string? CardBackgroundColor1 { get; set; }
    public string? CardBackgroundColor2 { get; set; }
    public string? CardTextColor { get; set; }
    public string? CardBorderColor { get; set; }
}

public class WelcomeDMSettingsDto
{
    public bool SendDM { get; set; }
    public string? DMMessage { get; set; }
}

public class WelcomeDMEmbedSettingsDto
{
    public bool IsDMEmbed { get; set; }
    public string? DMEmbedTitle { get; set; }
    public string? DMEmbedDescription { get; set; }
    public string? DMEmbedColor { get; set; }
    public string? DMEmbedThumbnail { get; set; }
    public string? DMEmbedImage { get; set; }
    public string? DMEmbedFooter { get; set; }
    public string? DMEmbedTitleUrl { get; set; }
    public string? DMEmbedAuthorName { get; set; }
    public string? DMEmbedAuthorIcon { get; set; }
    public string? DMEmbedAuthorUrl { get; set; }
    public string? DMEmbedFooterIcon { get; set; }
    public bool DMEmbedUseTimestamp { get; set; } = true;
    public string? DMEmbedFieldsJson { get; set; }
}

public class WelcomeDMCardSettingsDto
{
    public bool SendDMCard { get; set; }
    public string? DMCardTitle { get; set; }
    public string? DMCardUsernameText { get; set; }
    public string? DMCardMemberText { get; set; }
    public string? DMCardBackgroundColor1 { get; set; }
    public string? DMCardBackgroundColor2 { get; set; }
    public string? DMCardTextColor { get; set; }
    public string? DMCardBorderColor { get; set; }
}

public class CreateWelcomeDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool Enabled { get; set; } = true;
    public bool GiveRole { get; set; }
    public string? RoleId { get; set; }
    public WelcomeEmbedSettingsDto? EmbedSettings { get; set; }
    public WelcomeCardSettingsDto? CardSettings { get; set; }
    public WelcomeDMSettingsDto? DMSettings { get; set; }
    public WelcomeDMEmbedSettingsDto? DMEmbedSettings { get; set; }
    public WelcomeDMCardSettingsDto? DMCardSettings { get; set; }
}

public class UpdateWelcomeDto
{
    public string? ChannelId { get; set; }
    public string? Message { get; set; }
    public string? Language { get; set; }
    public bool? Enabled { get; set; }
    public bool? GiveRole { get; set; }
    public string? RoleId { get; set; }
    public WelcomeEmbedSettingsDto? EmbedSettings { get; set; }
    public WelcomeCardSettingsDto? CardSettings { get; set; }
    public WelcomeDMSettingsDto? DMSettings { get; set; }
    public WelcomeDMEmbedSettingsDto? DMEmbedSettings { get; set; }
    public WelcomeDMCardSettingsDto? DMCardSettings { get; set; }
}