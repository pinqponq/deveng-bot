using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGuildAnalyticsService
{
    Task<GuildAnalyticsSummaryDto> GetSummaryAsync(string guildId, DateTime rangeFromUtc, DateTime rangeToUtc, string? staffUserIdForUnread, CancellationToken cancellationToken = default);
}

public interface IGuildAnalyticsIngestService
{
    Task RecordMemberEventAsync(string guildId, RecordGuildMemberEventDto dto, CancellationToken cancellationToken = default);

    Task MergeUserActivityDayAsync(string guildId, MergeGuildUserActivityDayDto dto, CancellationToken cancellationToken = default);

    Task TryUpdateTicketLastMessageAsync(string guildId, TryUpdateTicketLastMessageDto dto, CancellationToken cancellationToken = default);
}
