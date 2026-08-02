namespace Deveng.Discord.Api.DTOs;

public class GoodbyeDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool Enabled { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
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

public class GoodbyeEmbedSettingsDto
{
    public bool IsEmbed { get; set; }
    public string? EmbedTitle { get; set; }
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

public class CreateGoodbyeDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "tr";
    public bool Enabled { get; set; } = true;
    public GoodbyeEmbedSettingsDto? EmbedSettings { get; set; }
}

public class UpdateGoodbyeDto
{
    public string? ChannelId { get; set; }
    public string? Message { get; set; }
    public string? Language { get; set; }
    public bool? Enabled { get; set; }
    public GoodbyeEmbedSettingsDto? EmbedSettings { get; set; }
}