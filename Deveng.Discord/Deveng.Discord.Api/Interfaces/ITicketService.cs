using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ITicketService
{
    Task<int> CreateTicketRecordAsync(string guildId, CreateTicketRecordDto dto, CancellationToken cancellationToken = default);

    Task UpdateTicketClaimedByChannelAsync(string guildId, string channelId, string claimedByUserId, CancellationToken cancellationToken = default);

    Task UpdateTicketClosedByChannelAsync(string guildId, string channelId, string closedByUserId, int? transcriptId, CancellationToken cancellationToken = default);

    Task<TicketRowDto?> GetTicketByIdAsync(string guildId, int ticketId, CancellationToken cancellationToken = default);

    Task<List<TicketRowDto>> GetTicketsByGuildAsync(string guildId, string staffUserId, int? status, CancellationToken cancellationToken = default);

    Task UpsertTicketStaffReadAsync(int ticketId, string staffUserId, CancellationToken cancellationToken = default);

    Task TouchTicketStaffPanelMessageAsync(string guildId, string channelId, string staffUserId, DateTime occurredAtUtc, CancellationToken cancellationToken = default);
}
