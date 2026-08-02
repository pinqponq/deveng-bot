namespace Deveng.Discord.Api.DTOs;

public class ReminderSettingsDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;

    public bool CreateMessageIsEmbed { get; set; } = false;
    public string? CreateMessage { get; set; }
    public string? CreateEmbedTitle { get; set; }
    public string? CreateEmbedDescription { get; set; }
    public string? CreateEmbedColor { get; set; }
    public string? CreateEmbedThumbnail { get; set; }
    public string? CreateEmbedImage { get; set; }
    public string? CreateEmbedFooter { get; set; }
    public string? CreateEmbedTitleUrl { get; set; }
    public string? CreateEmbedAuthorName { get; set; }
    public string? CreateEmbedAuthorIcon { get; set; }
    public string? CreateEmbedAuthorUrl { get; set; }
    public string? CreateEmbedFooterIcon { get; set; }
    public bool CreateEmbedUseTimestamp { get; set; } = true;
    public string? CreateEmbedFieldsJson { get; set; }

    public bool DefaultIsEmbed { get; set; } = false;

    public bool SendMessageIsEmbed { get; set; } = false;
    public string? SendMessage { get; set; }
    public string? SendEmbedTitle { get; set; }
    public string? SendEmbedDescription { get; set; }
    public string? SendEmbedColor { get; set; }
    public string? SendEmbedThumbnail { get; set; }
    public string? SendEmbedImage { get; set; }
    public string? SendEmbedFooter { get; set; }
    public string? SendEmbedTitleUrl { get; set; }
    public string? SendEmbedAuthorName { get; set; }
    public string? SendEmbedAuthorIcon { get; set; }
    public string? SendEmbedAuthorUrl { get; set; }
    public string? SendEmbedFooterIcon { get; set; }
    public bool SendEmbedUseTimestamp { get; set; } = true;
    public string? SendEmbedFieldsJson { get; set; }

    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateOrUpdateReminderSettingsDto
{
    public bool CreateMessageIsEmbed { get; set; } = false;
    public string? CreateMessage { get; set; }
    public string? CreateEmbedTitle { get; set; }
    public string? CreateEmbedDescription { get; set; }
    public string? CreateEmbedColor { get; set; }
    public string? CreateEmbedThumbnail { get; set; }
    public string? CreateEmbedImage { get; set; }
    public string? CreateEmbedFooter { get; set; }
    public string? CreateEmbedTitleUrl { get; set; }
    public string? CreateEmbedAuthorName { get; set; }
    public string? CreateEmbedAuthorIcon { get; set; }
    public string? CreateEmbedAuthorUrl { get; set; }
    public string? CreateEmbedFooterIcon { get; set; }
    public bool CreateEmbedUseTimestamp { get; set; } = true;
    public string? CreateEmbedFieldsJson { get; set; }
    public bool DefaultIsEmbed { get; set; } = false;
    public bool SendMessageIsEmbed { get; set; } = false;
    public string? SendMessage { get; set; }
    public string? SendEmbedTitle { get; set; }
    public string? SendEmbedDescription { get; set; }
    public string? SendEmbedColor { get; set; }
    public string? SendEmbedThumbnail { get; set; }
    public string? SendEmbedImage { get; set; }
    public string? SendEmbedFooter { get; set; }
    public string? SendEmbedTitleUrl { get; set; }
    public string? SendEmbedAuthorName { get; set; }
    public string? SendEmbedAuthorIcon { get; set; }
    public string? SendEmbedAuthorUrl { get; set; }
    public string? SendEmbedFooterIcon { get; set; }
    public bool SendEmbedUseTimestamp { get; set; } = true;
    public string? SendEmbedFieldsJson { get; set; }
}