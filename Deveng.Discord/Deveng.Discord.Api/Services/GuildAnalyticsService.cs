using System.Net.Http.Headers;
using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class GuildAnalyticsService : IGuildAnalyticsService, IGuildAnalyticsIngestService
{
    private const string DiscordApiBase = "https://discord.com/api";
    private static readonly TimeSpan CacheCountTtl = TimeSpan.FromMinutes(3);

    private readonly DevengDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly IRedisCacheService _cache;
    private readonly ILogger<GuildAnalyticsService> _logger;

    public GuildAnalyticsService(
        DevengDbContext db,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IRedisCacheService cache,
        ILogger<GuildAnalyticsService> logger)
    {
        _db = db;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
        _cache = cache;
        _logger = logger;
    }

    public async Task<GuildAnalyticsSummaryDto> GetSummaryAsync(string guildId, DateTime rangeFromUtc, DateTime rangeToUtc,
        string? staffUserIdForUnread, CancellationToken cancellationToken = default)
    {
        if (rangeToUtc <= rangeFromUtc)
            rangeToUtc = rangeFromUtc.AddDays(1);

        var todayUtc = DateOnly.FromDateTime(DateTime.UtcNow);
        var wauFrom = todayUtc.AddDays(-6);
        var mauFrom = todayUtc.AddDays(-29);
        var rangeFromDate = DateOnly.FromDateTime(rangeFromUtc);
        var rangeToDate = DateOnly.FromDateTime(rangeToUtc);

        var joinCount = await _db.GuildMemberEvents.AsNoTracking()
            .CountAsync(e => e.GuildId == guildId && e.EventType == 0 &&
                e.OccurredAt >= rangeFromUtc && e.OccurredAt < rangeToUtc, cancellationToken);

        var leaveCount = await _db.GuildMemberEvents.AsNoTracking()
            .CountAsync(e => e.GuildId == guildId && e.EventType == 1 &&
                e.OccurredAt >= rangeFromUtc && e.OccurredAt < rangeToUtc, cancellationToken);

        var inviteJoinsInRange = await _db.GuildInviteContributions.AsNoTracking()
            .CountAsync(c => c.GuildId == guildId &&
                c.JoinedAt >= rangeFromUtc && c.JoinedAt < rangeToUtc, cancellationToken);

        var moderationActionsInRange = await _db.ModerationActionLogs.AsNoTracking()
            .CountAsync(l => l.GuildId == guildId &&
                l.CreatedAt >= rangeFromUtc && l.CreatedAt < rangeToUtc, cancellationToken);

        var activityInRange = _db.GuildUserActivityDays.AsNoTracking()
            .Where(u => u.GuildId == guildId &&
                u.ActivityDate >= rangeFromDate && u.ActivityDate <= rangeToDate);

        var messagesInRange = await activityInRange.SumAsync(u => (long)u.MessageCount, cancellationToken);
        var distinctActiveInRange = await activityInRange
            .Where(u => u.MessageCount > 0 || u.VoiceSeconds > 0 || u.ReactionCount > 0)
            .Select(u => u.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var activeFilter = _db.GuildUserActivityDays.AsNoTracking()
            .Where(u => u.GuildId == guildId && (u.MessageCount > 0 || u.VoiceSeconds > 0 || u.ReactionCount > 0));

        var dauToday = await activeFilter
            .Where(u => u.ActivityDate == todayUtc)
            .Select(u => u.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var wau7 = await activeFilter
            .Where(u => u.ActivityDate >= wauFrom && u.ActivityDate <= todayUtc)
            .Select(u => u.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var mau30 = await activeFilter
            .Where(u => u.ActivityDate >= mauFrom && u.ActivityDate <= todayUtc)
            .Select(u => u.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var openTickets = await _db.Tickets.AsNoTracking()
            .CountAsync(t => t.GuildId == guildId && (t.Status == 0 || t.Status == 1), cancellationToken);

        var pendingStaffReplyTickets = await _db.Tickets.AsNoTracking()
            .CountAsync(t => t.GuildId == guildId && (t.Status == 0 || t.Status == 1) &&
                (t.LastMessageAuthorId == null || t.LastMessageAuthorId == t.UserId), cancellationToken);

        var unreadTicketsForStaff = 0;
        if (!string.IsNullOrWhiteSpace(staffUserIdForUnread))
        {
            unreadTicketsForStaff = await _db.Tickets.AsNoTracking()
                .Where(t => t.GuildId == guildId && (t.Status == 0 || t.Status == 1))
                .Where(t =>
                    (t.LastMessageAuthorId != null && t.LastMessageAuthorId == t.UserId && t.LastMessageAt != null &&
                     !_db.TicketStaffReads.Any(r => r.TicketId == t.Id && r.StaffUserId == staffUserIdForUnread &&
                         r.LastReadAt >= t.LastMessageAt)) ||
                    (t.LastMessageAuthorId == null &&
                     !_db.TicketStaffReads.Any(r => r.TicketId == t.Id && r.StaffUserId == staffUserIdForUnread &&
                         r.LastReadAt >= t.CreatedAt)))
                .CountAsync(cancellationToken);
        }

        var dto = new GuildAnalyticsSummaryDto
        {
            GuildId = guildId,
            RangeFromUtc = rangeFromUtc,
            RangeToUtc = rangeToUtc,
            JoinCount = joinCount,
            LeaveCount = leaveCount,
            InviteJoinsInRange = inviteJoinsInRange,
            ModerationActionsInRange = moderationActionsInRange,
            MessagesInRange = messagesInRange,
            DistinctActiveUsersInRange = distinctActiveInRange,
            DauToday = dauToday,
            Wau7 = wau7,
            Mau30 = mau30,
            OpenTickets = openTickets,
            PendingStaffReplyTickets = pendingStaffReplyTickets,
            UnreadTicketsForStaff = unreadTicketsForStaff
        };

        var counts = await GetDiscordMemberCountCachedAsync(guildId, cancellationToken);
        dto.ApproximateMemberCount = counts?.MemberCount;
        dto.ApproximatePresenceCount = counts?.PresenceCount;
        return dto;
    }

    private async Task<DiscordApproximateCountsDto?> GetDiscordMemberCountCachedAsync(string guildId, CancellationToken cancellationToken)
    {
        var cacheKey = $"discord:guild:{guildId}:count";
        var cached = await _cache.GetAsync<DiscordApproximateCountsDto>(cacheKey);
        if (cached != null)
            return cached;

        var botToken = _configuration["BotToken"] ?? string.Empty;
        if (string.IsNullOrEmpty(botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış — analitik özetinde üye sayısı atlanıyor.");
            return null;
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}?with_counts=true");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bot", botToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Discord guild with_counts başarısız: {Status}", response.StatusCode);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var memberCount = 0;
        var presenceCount = 0;
        if (root.TryGetProperty("approximate_member_count", out var mc))
            memberCount = mc.GetInt32();
        if (root.TryGetProperty("approximate_presence_count", out var pc))
            presenceCount = pc.GetInt32();

        var result = new DiscordApproximateCountsDto { MemberCount = memberCount, PresenceCount = presenceCount };
        await _cache.SetAsync(cacheKey, result, CacheCountTtl);
        return result;
    }

    public async Task RecordMemberEventAsync(string guildId, RecordGuildMemberEventDto dto, CancellationToken cancellationToken = default)
    {
        _db.GuildMemberEvents.Add(new GuildMemberEvent
        {
            GuildId = guildId,
            UserId = dto.UserId,
            EventType = dto.EventType,
            OccurredAt = DateTime.UtcNow,
            MetadataJson = dto.MetadataJson
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task MergeUserActivityDayAsync(string guildId, MergeGuildUserActivityDayDto dto, CancellationToken cancellationToken = default)
    {
        var activityDate = DateOnly.FromDateTime(dto.ActivityDate.Date);
        var row = await _db.GuildUserActivityDays
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == dto.UserId && u.ActivityDate == activityDate,
                cancellationToken);

        if (row == null)
        {
            row = new GuildUserActivityDay
            {
                GuildId = guildId,
                UserId = dto.UserId,
                ActivityDate = activityDate,
                MessageCount = Math.Max(0, dto.DeltaMessages),
                VoiceSeconds = Math.Max(0, dto.DeltaVoiceSeconds),
                ReactionCount = Math.Max(0, dto.DeltaReactions),
                UpdatedAt = DateTime.UtcNow
            };
            _db.GuildUserActivityDays.Add(row);
        }
        else
        {
            row.MessageCount += dto.DeltaMessages;
            row.VoiceSeconds += dto.DeltaVoiceSeconds;
            row.ReactionCount += dto.DeltaReactions;
            row.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task TryUpdateTicketLastMessageAsync(string guildId, TryUpdateTicketLastMessageDto dto, CancellationToken cancellationToken = default)
    {
        var occurredAt = dto.OccurredAtUtc.Kind == DateTimeKind.Utc ? dto.OccurredAtUtc : dto.OccurredAtUtc.ToUniversalTime();
        var tickets = await _db.Tickets
            .Where(t => t.GuildId == guildId && t.ChannelId == dto.ChannelId && (t.Status == 0 || t.Status == 1))
            .ToListAsync(cancellationToken);

        foreach (var ticket in tickets)
        {
            ticket.LastMessageAt = occurredAt;
            ticket.LastMessageAuthorId = dto.AuthorId;
        }

        if (tickets.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);
    }
}
