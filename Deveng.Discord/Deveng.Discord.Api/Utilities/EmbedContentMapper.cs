using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Utilities;

public static class EmbedContentMapper
{
    public static EmbedPayloadDto ToPayload(
        bool isEmbed,
        string? message,
        string? embedTitle,
        string? embedTitleUrl,
        string? embedDescription,
        string? embedColor,
        string? embedAuthorName,
        string? embedAuthorIcon,
        string? embedAuthorUrl,
        string? embedThumbnail,
        string? embedImage,
        string? embedFooter,
        string? embedFooterIcon,
        bool embedUseTimestamp,
        string? embedFieldsJson) =>
        new()
        {
            IsEmbed = isEmbed,
            Message = message,
            EmbedTitle = embedTitle,
            EmbedTitleUrl = embedTitleUrl,
            EmbedDescription = embedDescription,
            EmbedColor = embedColor,
            EmbedAuthorName = embedAuthorName,
            EmbedAuthorIcon = embedAuthorIcon,
            EmbedAuthorUrl = embedAuthorUrl,
            EmbedThumbnail = embedThumbnail,
            EmbedImage = embedImage,
            EmbedFooter = embedFooter,
            EmbedFooterIcon = embedFooterIcon,
            EmbedUseTimestamp = embedUseTimestamp,
            EmbedFieldsJson = embedFieldsJson,
        };

    public static void CopyPayloadTo(
        EmbedPayloadDto src,
        Action<bool> setIsEmbed,
        Action<string?> setMessage,
        Action<string?> setEmbedTitle,
        Action<string?> setEmbedTitleUrl,
        Action<string?> setEmbedDescription,
        Action<string?> setEmbedColor,
        Action<string?> setEmbedAuthorName,
        Action<string?> setEmbedAuthorIcon,
        Action<string?> setEmbedAuthorUrl,
        Action<string?> setEmbedThumbnail,
        Action<string?> setEmbedImage,
        Action<string?> setEmbedFooter,
        Action<string?> setEmbedFooterIcon,
        Action<bool> setEmbedUseTimestamp,
        Action<string?> setEmbedFieldsJson)
    {
        setIsEmbed(src.IsEmbed);
        setMessage(src.Message);
        setEmbedTitle(src.EmbedTitle);
        setEmbedTitleUrl(src.EmbedTitleUrl);
        setEmbedDescription(src.EmbedDescription);
        setEmbedColor(src.EmbedColor);
        setEmbedAuthorName(src.EmbedAuthorName);
        setEmbedAuthorIcon(src.EmbedAuthorIcon);
        setEmbedAuthorUrl(src.EmbedAuthorUrl);
        setEmbedThumbnail(src.EmbedThumbnail);
        setEmbedImage(src.EmbedImage);
        setEmbedFooter(src.EmbedFooter);
        setEmbedFooterIcon(src.EmbedFooterIcon);
        setEmbedUseTimestamp(src.EmbedUseTimestamp);
        setEmbedFieldsJson(src.EmbedFieldsJson);
    }
}
