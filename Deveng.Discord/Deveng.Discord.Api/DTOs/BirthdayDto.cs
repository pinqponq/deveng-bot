namespace Deveng.Discord.Api.DTOs;

public class BirthdaySettingsDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? RoleId { get; set; }
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
    public bool Enabled { get; set; }
    public int CheckHour { get; set; }
    public bool CreateMessageIsEmbed { get; set; }
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
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class BirthdayUserDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateBirthdaySettingsDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? RoleId { get; set; }
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
    public bool Enabled { get; set; } = true;
    public int CheckHour { get; set; } = 0;
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
}

public class UpdateBirthdaySettingsDto
{
    public string? ChannelId { get; set; }
    public string? RoleId { get; set; }
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
    public bool? Enabled { get; set; }
    public int? CheckHour { get; set; }
    public bool? CreateMessageIsEmbed { get; set; }
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
    public bool? CreateEmbedUseTimestamp { get; set; }
    public string? CreateEmbedFieldsJson { get; set; }
}

public class CreateBirthdayUserDto
{
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
}

public class UpdateBirthdayUserDto
{
    public DateTime BirthDate { get; set; }
}