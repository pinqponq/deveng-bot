namespace Deveng.Discord.Infrastructure.Abstractions;

/// <summary>Paylaşılan Discord embed alanları — Welcome/Goodbye/LogChannel vb. için owned type.</summary>
public class EmbedContent
{
    public bool IsEmbed { get; set; }
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
