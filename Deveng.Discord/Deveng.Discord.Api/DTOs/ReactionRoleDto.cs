namespace Deveng.Discord.Api.DTOs;

public class ReactionRoleDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? NormalMessage { get; set; }
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
    public string? MessageId { get; set; }
    public bool Enabled { get; set; }
    public bool EnableEmoji { get; set; }
    public bool EnableButton { get; set; }
    public bool EnableMenu { get; set; }
    public List<ReactionRoleEmojiDto> Emojis { get; set; } = new();
    public List<ReactionRoleButtonDto> Buttons { get; set; } = new();
    public List<ReactionRoleMenuDto> Menus { get; set; } = new();
}

public class ReactionRoleEmojiDto
{
    public int Id { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; }
}

public class ReactionRoleButtonDto
{
    public int Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int Style { get; set; }
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; }
}

public class ReactionRoleMenuDto
{
    public int Id { get; set; }
    public string? Placeholder { get; set; }
    public int MinValues { get; set; }
    public int MaxValues { get; set; }
    public bool Enabled { get; set; }
    public List<ReactionRoleMenuOptionDto> Options { get; set; } = new();
}

public class ReactionRoleMenuOptionDto
{
    public int Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; }
}

public class CreateReactionRoleDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string? NormalMessage { get; set; }
    public bool IsEmbed { get; set; } = true;
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
    public string? MessageId { get; set; }
    public bool Enabled { get; set; } = true;
    public bool EnableEmoji { get; set; } = true;
    public bool EnableButton { get; set; } = true;
    public bool EnableMenu { get; set; } = true;
    public List<CreateReactionRoleEmojiDto> Emojis { get; set; } = new();
    public List<CreateReactionRoleButtonDto> Buttons { get; set; } = new();
    public List<CreateReactionRoleMenuDto> Menus { get; set; } = new();
}

public class CreateReactionRoleEmojiDto
{
    public string Emoji { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
}

public class CreateReactionRoleButtonDto
{
    public string Label { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int Style { get; set; } = 1;
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
}

public class CreateReactionRoleMenuDto
{
    public string? Placeholder { get; set; }
    public int MinValues { get; set; } = 1;
    public int MaxValues { get; set; } = 1;
    public bool Enabled { get; set; } = true;
    public List<CreateReactionRoleMenuOptionDto> Options { get; set; } = new();
}

public class CreateReactionRoleMenuOptionDto
{
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; }
    public bool Enabled { get; set; } = true;
}