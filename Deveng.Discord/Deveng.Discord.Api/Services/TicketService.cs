using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class TicketService : ITicketService
{
    private readonly DevengDbContext _db;

    public TicketService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<int> CreateTicketRecordAsync(string guildId, CreateTicketRecordDto dto, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var ticket = new Ticket
        {
            TicketPanelId = dto.TicketPanelId,
            TicketTypeId = dto.TicketTypeId,
            GuildId = guildId,
            ChannelId = dto.ChannelId,
            UserId = dto.UserId,
            Status = 0,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync(cancellationToken);
        return ticket.Id;
    }

    public async Task UpdateTicketClaimedByChannelAsync(string guildId, string channelId, string claimedByUserId, CancellationToken cancellationToken = default)
    {
        var ticket = await _db.Tickets
            .FirstOrDefaultAsync(t => t.GuildId == guildId && t.ChannelId == channelId && t.Status == 0, cancellationToken);
        if (ticket == null) return;

        var now = DateTime.UtcNow;
        ticket.Status = 1;
        ticket.ClaimedBy = claimedByUserId;
        ticket.ClaimedAt = now;
        ticket.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateTicketClosedByChannelAsync(string guildId, string channelId, string closedByUserId, int? transcriptId, CancellationToken cancellationToken = default)
    {
        var ticket = await _db.Tickets
            .FirstOrDefaultAsync(t => t.GuildId == guildId && t.ChannelId == channelId && (t.Status == 0 || t.Status == 1), cancellationToken);
        if (ticket == null) return;

        var now = DateTime.UtcNow;
        ticket.Status = 2;
        ticket.ClosedBy = closedByUserId;
        ticket.ClosedAt = now;
        ticket.TranscriptId = transcriptId;
        ticket.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<TicketRowDto?> GetTicketByIdAsync(string guildId, int ticketId, CancellationToken cancellationToken = default)
    {
        var ticket = await _db.Tickets.AsNoTracking()
            .FirstOrDefaultAsync(t => t.GuildId == guildId && t.Id == ticketId, cancellationToken);
        return ticket == null ? null : MapTicketRow(ticket, includeUnread: false);
    }

    public async Task<List<TicketRowDto>> GetTicketsByGuildAsync(string guildId, string staffUserId, int? status, CancellationToken cancellationToken = default)
    {
        var rows = await (
            from t in _db.Tickets.AsNoTracking()
            where t.GuildId == guildId && (status == null || t.Status == status)
            join r in _db.TicketStaffReads.AsNoTracking().Where(sr => sr.StaffUserId == staffUserId)
                on t.Id equals r.TicketId into reads
            from r in reads.DefaultIfEmpty()
            orderby t.LastMessageAt descending, t.CreatedAt descending
            select new { Ticket = t, LastReadAt = r == null ? null : (DateTime?)r.LastReadAt }
        ).ToListAsync(cancellationToken);

        return rows.Select(x => MapTicketRow(x.Ticket, includeUnread: true, x.LastReadAt)).ToList();
    }

    public async Task UpsertTicketStaffReadAsync(int ticketId, string staffUserId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var read = await _db.TicketStaffReads
            .FirstOrDefaultAsync(r => r.TicketId == ticketId && r.StaffUserId == staffUserId, cancellationToken);

        if (read == null)
        {
            _db.TicketStaffReads.Add(new TicketStaffRead
            {
                TicketId = ticketId,
                StaffUserId = staffUserId,
                LastReadAt = now
            });
        }
        else
        {
            read.LastReadAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task TouchTicketStaffPanelMessageAsync(string guildId, string channelId, string staffUserId, DateTime occurredAtUtc, CancellationToken cancellationToken = default)
    {
        var at = occurredAtUtc.Kind == DateTimeKind.Utc ? occurredAtUtc : occurredAtUtc.ToUniversalTime();
        var tickets = await _db.Tickets
            .Where(t => t.GuildId == guildId && t.ChannelId == channelId && (t.Status == 0 || t.Status == 1))
            .ToListAsync(cancellationToken);

        if (tickets.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var ticket in tickets)
        {
            ticket.LastMessageAt = at;
            ticket.LastMessageAuthorId = staffUserId;
            ticket.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static TicketRowDto MapTicketRow(Ticket t, bool includeUnread, DateTime? staffLastReadAt = null)
    {
        var row = new TicketRowDto
        {
            Id = t.Id,
            TicketPanelId = t.TicketPanelId,
            TicketTypeId = t.TicketTypeId,
            GuildId = t.GuildId,
            ChannelId = t.ChannelId,
            UserId = t.UserId,
            Status = t.Status,
            ClaimedBy = t.ClaimedBy,
            ClaimedAt = t.ClaimedAt,
            ClosedBy = t.ClosedBy,
            ClosedAt = t.ClosedAt,
            TranscriptId = t.TranscriptId,
            LastMessageAt = t.LastMessageAt,
            LastMessageAuthorId = t.LastMessageAuthorId,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };

        if (includeUnread)
        {
            row.IsUnreadForStaff =
                t.LastMessageAuthorId != null
                && t.LastMessageAuthorId == t.UserId
                && t.LastMessageAt != null
                && (staffLastReadAt == null || t.LastMessageAt > staffLastReadAt)
                || t.LastMessageAuthorId == null
                && t.UserId != null
                && (staffLastReadAt == null || t.CreatedAt > staffLastReadAt);
        }

        return row;
    }
}
