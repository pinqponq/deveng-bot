namespace Deveng.Discord.Api.DTOs;

public class CreateTicketRecordDto
{
    public int TicketPanelId { get; set; }

    public int? TicketTypeId { get; set; }

    public string ChannelId { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;
}

public class TicketRowDto
{
    public int Id { get; set; }

    public int TicketPanelId { get; set; }

    public int? TicketTypeId { get; set; }

    public string GuildId { get; set; } = string.Empty;

    public string ChannelId { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public int Status { get; set; }

    public string? ClaimedBy { get; set; }

    public DateTime? ClaimedAt { get; set; }

    public string? ClosedBy { get; set; }

    public DateTime? ClosedAt { get; set; }

    public int? TranscriptId { get; set; }

    public DateTime? LastMessageAt { get; set; }

    public string? LastMessageAuthorId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsUnreadForStaff { get; set; }
}

public class TicketStaffMessageDto
{
    public string Content { get; set; } = string.Empty;

    public bool IsEmbed { get; set; }

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

public class TicketActorDto
{
    public string UserId { get; set; } = string.Empty;
}

public class TicketCloseDto
{
    public string ClosedByUserId { get; set; } = string.Empty;

    public int? TranscriptId { get; set; }
}

public class TicketStaffTouchDto
{
    public string StaffUserId { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
