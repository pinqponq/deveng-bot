namespace Deveng.Discord.Api.DTOs;

public class PollDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string Question { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? EndAfterMinutes { get; set; }
    public int? EndAfterVotes { get; set; }
    public bool AllowMultipleVotes { get; set; }
    public int TotalVotes { get; set; }
    public string? PollEmbedTitle { get; set; }
    public string? PollEmbedDescription { get; set; }
    public string? PollEmbedColor { get; set; }
    public string? PollEmbedThumbnail { get; set; }
    public string? PollEmbedImage { get; set; }
    public string? PollEmbedFooter { get; set; }
    public string? PollEmbedTitleUrl { get; set; }
    public string? PollEmbedAuthorName { get; set; }
    public string? PollEmbedAuthorIcon { get; set; }
    public string? PollEmbedAuthorUrl { get; set; }
    public string? PollEmbedFooterIcon { get; set; }
    public bool PollEmbedUseTimestamp { get; set; } = true;
    public string? PollEmbedFieldsJson { get; set; }
    public string? ResultEmbedTitle { get; set; }
    public string? ResultEmbedDescription { get; set; }
    public string? ResultEmbedColor { get; set; }
    public string? ResultEmbedThumbnail { get; set; }
    public string? ResultEmbedImage { get; set; }
    public string? ResultEmbedFooter { get; set; }
    public string? ResultEmbedTitleUrl { get; set; }
    public string? ResultEmbedAuthorName { get; set; }
    public string? ResultEmbedAuthorIcon { get; set; }
    public string? ResultEmbedAuthorUrl { get; set; }
    public string? ResultEmbedFooterIcon { get; set; }
    public bool ResultEmbedUseTimestamp { get; set; } = true;
    public string? ResultEmbedFieldsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    /// <summary>Oluşturma kaynağı: panel, slash (veya null: eski kayıtlar).</summary>
    public string? CreatedVia { get; set; }
    public List<PollOptionDto> Options { get; set; } = new();
    public List<PollRolePermissionDto> RolePermissions { get; set; } = new();
}

public class PollOptionDto
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; }
    public int VoteCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PollRolePermissionDto
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public bool IsAllowed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePollDto
{
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public int? EndAfterMinutes { get; set; }
    public int? EndAfterVotes { get; set; }
    public bool AllowMultipleVotes { get; set; } = false;
    public string? PollEmbedTitle { get; set; }
    public string? PollEmbedDescription { get; set; }
    public string? PollEmbedColor { get; set; }
    public string? PollEmbedThumbnail { get; set; }
    public string? PollEmbedImage { get; set; }
    public string? PollEmbedFooter { get; set; }
    public string? PollEmbedTitleUrl { get; set; }
    public string? PollEmbedAuthorName { get; set; }
    public string? PollEmbedAuthorIcon { get; set; }
    public string? PollEmbedAuthorUrl { get; set; }
    public string? PollEmbedFooterIcon { get; set; }
    public bool PollEmbedUseTimestamp { get; set; } = true;
    public string? PollEmbedFieldsJson { get; set; }
    public string? ResultEmbedTitle { get; set; }
    public string? ResultEmbedDescription { get; set; }
    public string? ResultEmbedColor { get; set; }
    public string? ResultEmbedThumbnail { get; set; }
    public string? ResultEmbedImage { get; set; }
    public string? ResultEmbedFooter { get; set; }
    public string? ResultEmbedTitleUrl { get; set; }
    public string? ResultEmbedAuthorName { get; set; }
    public string? ResultEmbedAuthorIcon { get; set; }
    public string? ResultEmbedAuthorUrl { get; set; }
    public string? ResultEmbedFooterIcon { get; set; }
    public bool ResultEmbedUseTimestamp { get; set; } = true;
    public string? ResultEmbedFieldsJson { get; set; }
    public List<CreatePollOptionDto> Options { get; set; } = new();
    public List<CreatePollRolePermissionDto> RolePermissions { get; set; } = new();
    /// <summary>panel | slash — yoksa sunucu panel varsayar.</summary>
    public string? CreatedVia { get; set; }
}

public class CreatePollOptionDto
{
    public string OptionText { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int OrderIndex { get; set; } = 0;
}

public class CreatePollRolePermissionDto
{
    public string RoleId { get; set; } = string.Empty;
    public bool IsAllowed { get; set; } = true;
}

public class UpdatePollDto
{
    public string? ChannelId { get; set; }
    public string? Question { get; set; }
    public int? EndAfterMinutes { get; set; }
    public int? EndAfterVotes { get; set; }
    public bool? AllowMultipleVotes { get; set; }
    public string? PollEmbedTitle { get; set; }
    public string? PollEmbedDescription { get; set; }
    public string? PollEmbedColor { get; set; }
    public string? PollEmbedThumbnail { get; set; }
    public string? PollEmbedImage { get; set; }
    public string? PollEmbedFooter { get; set; }
    public string? PollEmbedTitleUrl { get; set; }
    public string? PollEmbedAuthorName { get; set; }
    public string? PollEmbedAuthorIcon { get; set; }
    public string? PollEmbedAuthorUrl { get; set; }
    public string? PollEmbedFooterIcon { get; set; }
    public bool? PollEmbedUseTimestamp { get; set; }
    public string? PollEmbedFieldsJson { get; set; }
    public string? ResultEmbedTitle { get; set; }
    public string? ResultEmbedDescription { get; set; }
    public string? ResultEmbedColor { get; set; }
    public string? ResultEmbedThumbnail { get; set; }
    public string? ResultEmbedImage { get; set; }
    public string? ResultEmbedFooter { get; set; }
    public string? ResultEmbedTitleUrl { get; set; }
    public string? ResultEmbedAuthorName { get; set; }
    public string? ResultEmbedAuthorIcon { get; set; }
    public string? ResultEmbedAuthorUrl { get; set; }
    public string? ResultEmbedFooterIcon { get; set; }
    public bool? ResultEmbedUseTimestamp { get; set; }
    public string? ResultEmbedFieldsJson { get; set; }
}

public class PollVoteDto
{
    public int PollId { get; set; }
    public int OptionId { get; set; }
    public string UserId { get; set; } = string.Empty;
}

public class PollResultDto
{
    public int PollId { get; set; }
    public string Question { get; set; } = string.Empty;
    public int TotalVotes { get; set; }
    public List<PollOptionResultDto> OptionResults { get; set; } = new();
    public DateTime? EndedAt { get; set; }
    public bool AllowMultipleVotes { get; set; }
}

public class PollOptionResultDto
{
    public int OptionId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public int VoteCount { get; set; }
    public double Percentage { get; set; }
}

/// <summary>
///     Redis'te sunucu bazlı anket gönderim bekleme süresi (UTC).
/// </summary>
public sealed class PollSendCooldownState
{
    public DateTime WaitUntilUtc { get; set; }
}