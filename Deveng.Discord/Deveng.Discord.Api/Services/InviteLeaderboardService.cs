using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class InviteLeaderboardService : IInviteLeaderboardService
{
    private readonly DevengDbContext _db;

    public InviteLeaderboardService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<List<GuildInviteSnapshotDto>> GetSnapshotsAsync(string guildId)
    {
        return await _db.GuildInviteSnapshots.AsNoTracking()
            .Where(s => s.GuildId == guildId)
            .OrderByDescending(s => s.LastSeenAt)
            .Select(s => new GuildInviteSnapshotDto
            {
                GuildId = s.GuildId,
                InviteCode = s.InviteCode,
                InviterId = s.InviterId,
                Uses = s.Uses,
                ChannelId = s.ChannelId,
                ExpiresAt = s.ExpiresAt,
                LastSeenAt = s.LastSeenAt
            })
            .ToListAsync();
    }

    public async Task UpsertSnapshotAsync(string guildId, UpsertGuildInviteSnapshotDto dto)
    {
        var snapshot = await _db.GuildInviteSnapshots
            .FirstOrDefaultAsync(s => s.GuildId == guildId && s.InviteCode == dto.InviteCode);

        if (snapshot == null)
        {
            snapshot = new GuildInviteSnapshot
            {
                GuildId = guildId,
                InviteCode = dto.InviteCode,
                InviterId = dto.InviterId,
                Uses = dto.Uses,
                ChannelId = dto.ChannelId,
                ExpiresAt = dto.ExpiresAt,
                LastSeenAt = DateTime.UtcNow
            };
            _db.GuildInviteSnapshots.Add(snapshot);
        }
        else
        {
            snapshot.InviterId = dto.InviterId;
            snapshot.Uses = dto.Uses;
            snapshot.ChannelId = dto.ChannelId;
            snapshot.ExpiresAt = dto.ExpiresAt;
            snapshot.LastSeenAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    public async Task RecordContributionAsync(string guildId, RecordGuildInviteContributionDto dto)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var exists = await _db.GuildInviteContributions.AnyAsync(c =>
            c.GuildId == guildId && c.JoinedUserId == dto.JoinedUserId);
        if (exists)
        {
            await tx.CommitAsync();
            return;
        }

        _db.GuildInviteContributions.Add(new GuildInviteContribution
        {
            GuildId = guildId,
            JoinedUserId = dto.JoinedUserId,
            InviterUserId = dto.InviterUserId,
            InviteCode = dto.InviteCode,
            JoinedAt = DateTime.UtcNow,
            SourceType = dto.SourceType
        });
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(dto.InviterUserId))
        {
            var monthKey = DateTime.UtcNow.ToString("yyyy-MM");
            const string allKey = "all";
            foreach (var periodKey in new[] { monthKey, allKey })
            {
                var stat = await _db.GuildInviteStats
                    .FirstOrDefaultAsync(s => s.GuildId == guildId &&
                        s.UserId == dto.InviterUserId && s.PeriodKey == periodKey);
                if (stat == null)
                {
                    _db.GuildInviteStats.Add(new GuildInviteStats
                    {
                        GuildId = guildId,
                        UserId = dto.InviterUserId!,
                        PeriodKey = periodKey,
                        Count = 1,
                        LastContributedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    stat.Count++;
                    stat.LastContributedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();
    }

    public async Task<List<GuildInviteLeaderboardEntryDto>> GetLeaderboardAsync(string guildId, string periodKey, int limit)
    {
        var take = Math.Clamp(limit, 1, 100);
        return await _db.GuildInviteStats.AsNoTracking()
            .Where(s => s.GuildId == guildId && s.PeriodKey == periodKey)
            .OrderByDescending(s => s.Count)
            .ThenByDescending(s => s.LastContributedAt)
            .Take(take)
            .Select(s => new GuildInviteLeaderboardEntryDto
            {
                GuildId = s.GuildId,
                UserId = s.UserId,
                PeriodKey = s.PeriodKey,
                Count = s.Count,
                LastContributedAt = s.LastContributedAt
            })
            .ToListAsync();
    }

    public async Task<List<GuildInviteContributionDto>> GetContributionsAsync(string guildId, int limit)
    {
        var take = Math.Clamp(limit, 1, 200);
        return await _db.GuildInviteContributions.AsNoTracking()
            .Where(c => c.GuildId == guildId)
            .OrderByDescending(c => c.JoinedAt)
            .Take(take)
            .Select(c => new GuildInviteContributionDto
            {
                Id = c.Id,
                GuildId = c.GuildId,
                JoinedUserId = c.JoinedUserId,
                InviterUserId = c.InviterUserId,
                InviteCode = c.InviteCode,
                JoinedAt = c.JoinedAt,
                SourceType = c.SourceType
            })
            .ToListAsync();
    }
}
