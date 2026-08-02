namespace Deveng.Discord.Api.DTOs;

public class LogChannelDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
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
}

public class LogChannelTypeDto
{
    public int Id { get; set; }
    public int LogChannelId { get; set; }
    public string LogType { get; set; } = string.Empty;
    public string? ChannelId { get; set; } // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)

    public bool Enabled { get; set; }

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
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class LogChannelEmbedSettingsDto
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

public class CreateLogChannelDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public LogChannelEmbedSettingsDto? EmbedSettings { get; set; }
}

public class UpdateLogChannelDto
{
    public string? ChannelId { get; set; }
    public bool? Enabled { get; set; }
    public LogChannelEmbedSettingsDto? EmbedSettings { get; set; }
}

public class CreateLogChannelTypeDto
{
    public string GuildId { get; set; } = string.Empty;
    public string LogType { get; set; } = string.Empty;
    public string? ChannelId { get; set; } // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)
    public bool Enabled { get; set; } = true;
    public LogChannelEmbedSettingsDto? EmbedSettings { get; set; }
}

public class UpdateLogChannelTypeDto
{
    public string? ChannelId { get; set; }
    public bool? Enabled { get; set; }
    public LogChannelEmbedSettingsDto? EmbedSettings { get; set; }
}