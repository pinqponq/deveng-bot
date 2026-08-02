namespace Deveng.Discord.Api.DTOs;

/// <summary>Discord embed yapılandırması — panel/bot/API arasında ortak model.</summary>
public class EmbedPayloadDto
{
    public bool IsEmbed { get; set; } = true;
    public string? Message { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }
}
