namespace Deveng.Discord.Api.DTOs;

/// <summary>Redis önbelleği için Discord with_counts yanıtı (DiscordController ile aynı anahtar).</summary>
public class DiscordApproximateCountsDto
{
    public int MemberCount { get; set; }

    public int PresenceCount { get; set; }
}

public class GuildAnalyticsSummaryDto
{
    public string GuildId { get; set; } = string.Empty;

    public DateTime RangeFromUtc { get; set; }

    public DateTime RangeToUtc { get; set; }

    public int? ApproximateMemberCount { get; set; }

    public int? ApproximatePresenceCount { get; set; }

    public int JoinCount { get; set; }

    public int LeaveCount { get; set; }

    public int NetMemberDeltaInRange => JoinCount - LeaveCount;

    public int InviteJoinsInRange { get; set; }

    public int ModerationActionsInRange { get; set; }

    public long MessagesInRange { get; set; }

    public int DistinctActiveUsersInRange { get; set; }

    public int DauToday { get; set; }

    public int Wau7 { get; set; }

    public int Mau30 { get; set; }

    public int OpenTickets { get; set; }

    public int PendingStaffReplyTickets { get; set; }

    public int UnreadTicketsForStaff { get; set; }
}

public class RecordGuildMemberEventDto
{
    public string UserId { get; set; } = string.Empty;

    /// <summary>0 = join, 1 = leave</summary>
    public byte EventType { get; set; }

    public string? MetadataJson { get; set; }
}

public class MergeGuildUserActivityDayDto
{
    public string UserId { get; set; } = string.Empty;

    public DateTime ActivityDate { get; set; }

    public int DeltaMessages { get; set; }

    public int DeltaVoiceSeconds { get; set; }

    public int DeltaReactions { get; set; }
}

public class TryUpdateTicketLastMessageDto
{
    public string ChannelId { get; set; } = string.Empty;

    public string AuthorId { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }
}
