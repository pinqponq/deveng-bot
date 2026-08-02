namespace Deveng.Discord.Api.DTOs;

public class TicketPanelDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string? PanelMessage { get; set; }
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
    public string? WelcomeMessage { get; set; }
    public bool IsWelcomeEmbed { get; set; }
    public string? WelcomeEmbedTitle { get; set; }
    public string? WelcomeEmbedDescription { get; set; }
    public string? WelcomeEmbedColor { get; set; }
    public string? WelcomeEmbedThumbnail { get; set; }
    public string? WelcomeEmbedImage { get; set; }
    public string? WelcomeEmbedFooter { get; set; }
    public string? WelcomeEmbedTitleUrl { get; set; }
    public string? WelcomeEmbedAuthorName { get; set; }
    public string? WelcomeEmbedAuthorIcon { get; set; }
    public string? WelcomeEmbedAuthorUrl { get; set; }
    public string? WelcomeEmbedFooterIcon { get; set; }
    public bool WelcomeEmbedUseTimestamp { get; set; } = true;
    public string? WelcomeEmbedFieldsJson { get; set; }
    public string? TranscriptChannelId { get; set; }
    public bool SendTranscriptToUser { get; set; }
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public bool Enabled { get; set; }
    public List<string> RoleIds { get; set; } = new();
    public List<TicketTypeDto> TicketTypes { get; set; } = new();
}

public class TicketTypeDto
{
    public int Id { get; set; }
    public int Type { get; set; } // 0: Buton, 1: Açılır Menü
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int Style { get; set; }
    public string? Placeholder { get; set; }
    public int OrderIndex { get; set; }
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public bool Enabled { get; set; }
}

public class CreateTicketPanelDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? PanelMessage { get; set; }
    public bool IsEmbed { get; set; } = false;
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
    public string? WelcomeMessage { get; set; }
    public bool IsWelcomeEmbed { get; set; } = false;
    public string? WelcomeEmbedTitle { get; set; }
    public string? WelcomeEmbedDescription { get; set; }
    public string? WelcomeEmbedColor { get; set; }
    public string? WelcomeEmbedThumbnail { get; set; }
    public string? WelcomeEmbedImage { get; set; }
    public string? WelcomeEmbedFooter { get; set; }
    public string? WelcomeEmbedTitleUrl { get; set; }
    public string? WelcomeEmbedAuthorName { get; set; }
    public string? WelcomeEmbedAuthorIcon { get; set; }
    public string? WelcomeEmbedAuthorUrl { get; set; }
    public string? WelcomeEmbedFooterIcon { get; set; }
    public bool WelcomeEmbedUseTimestamp { get; set; } = true;
    public string? WelcomeEmbedFieldsJson { get; set; }
    public string? TranscriptChannelId { get; set; }
    public bool SendTranscriptToUser { get; set; } = true;
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public bool Enabled { get; set; } = true;
    public List<string> RoleIds { get; set; } = new();
    public List<CreateTicketTypeDto> TicketTypes { get; set; } = new();
}

public class CreateTicketTypeDto
{
    public int Type { get; set; } = 0; // 0: Buton, 1: Açılır Menü
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int Style { get; set; } = 1;
    public string? Placeholder { get; set; }
    public int OrderIndex { get; set; } = 0;
    public string? OpenCategoryId { get; set; }
    public string? OpenCategoryName { get; set; }
    public string? ClaimedCategoryId { get; set; }
    public string? ClaimedCategoryName { get; set; }
    public string? ClosedCategoryId { get; set; }
    public string? ClosedCategoryName { get; set; }
    public bool Enabled { get; set; } = true;
}