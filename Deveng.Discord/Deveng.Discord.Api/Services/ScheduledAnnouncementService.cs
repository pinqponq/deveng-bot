using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ScheduledAnnouncementService : IScheduledAnnouncementService
{
    private readonly DevengDbContext _db;

    public ScheduledAnnouncementService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<List<ScheduledAnnouncementDto>> GetByGuildIdAsync(string guildId)
    {
        var announcements = await _db.ScheduledAnnouncements.AsNoTracking()
            .Where(a => a.GuildId == guildId)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        return announcements.Select(MapAnnouncement).ToList();
    }

    public async Task<ScheduledAnnouncementDto> UpsertAsync(string guildId, string? createdByUserId, UpsertScheduledAnnouncementDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ChannelId)) throw new ArgumentException("Kanal zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(dto.EmbedJson))
            throw new ArgumentException("Icerik veya embed zorunludur.");

        var nextRun = dto.NextRunAtUtc ?? dto.SendAtUtc;
        ScheduledAnnouncement announcement;

        if (dto.Id is null or 0)
        {
            announcement = new ScheduledAnnouncement
            {
                GuildId = guildId,
                CreatedByUserId = createdByUserId
            };
            _db.ScheduledAnnouncements.Add(announcement);
        }
        else
        {
            announcement = await _db.ScheduledAnnouncements
                .FirstOrDefaultAsync(a => a.Id == dto.Id && a.GuildId == guildId)
                ?? throw new InvalidOperationException("Duyuru bulunamadi.");
        }

        announcement.ChannelId = dto.ChannelId;
        announcement.Title = dto.Title;
        announcement.Content = dto.Content;
        announcement.EmbedJson = dto.EmbedJson;
        announcement.MentionPolicy = dto.MentionPolicy;
        announcement.Timezone = dto.Timezone;
        announcement.ScheduleType = dto.ScheduleType;
        announcement.SendAtUtc = dto.SendAtUtc;
        announcement.RRuleJson = dto.RRuleJson;
        announcement.NextRunAtUtc = nextRun;
        announcement.Paused = dto.Paused;
        announcement.Enabled = dto.Enabled;

        await _db.SaveChangesAsync();
        return MapAnnouncement(announcement);
    }

    public async Task DeleteAsync(string guildId, long id)
    {
        var announcement = await _db.ScheduledAnnouncements
            .Include(a => a.Runs)
            .FirstOrDefaultAsync(a => a.GuildId == guildId && a.Id == id);

        if (announcement == null) return;

        _db.ScheduledAnnouncements.Remove(announcement);
        await _db.SaveChangesAsync();
    }

    public async Task<List<ScheduledAnnouncementDto>> GetPendingAsync(int batchSize)
    {
        var nowUtc = DateTime.UtcNow;
        var limit = Math.Clamp(batchSize, 1, 100);

        var announcements = await _db.ScheduledAnnouncements.AsNoTracking()
            .Where(a => a.Enabled && !a.Paused && a.NextRunAtUtc != null && a.NextRunAtUtc <= nowUtc)
            .OrderBy(a => a.NextRunAtUtc)
            .ThenBy(a => a.Id)
            .Take(limit)
            .ToListAsync();

        return announcements.Select(MapAnnouncement).ToList();
    }

    public async Task MarkRunAsync(long announcementId, MarkScheduledAnnouncementRunDto dto)
    {
        var run = await _db.ScheduledAnnouncementRuns
            .FirstOrDefaultAsync(r => r.AnnouncementId == announcementId && r.PlannedRunAtUtc == dto.PlannedRunAtUtc);

        if (run != null)
        {
            run.Status = dto.Status;
            run.SentMessageId = dto.SentMessageId;
            run.ErrorCode = dto.ErrorCode;
            run.AttemptCount++;
            if (dto.Status is "sent" or "failed")
                run.CompletedAt = DateTime.UtcNow;
        }
        else
        {
            _db.ScheduledAnnouncementRuns.Add(new ScheduledAnnouncementRun
            {
                AnnouncementId = announcementId,
                PlannedRunAtUtc = dto.PlannedRunAtUtc,
                Status = dto.Status,
                SentMessageId = dto.SentMessageId,
                ErrorCode = dto.ErrorCode,
                AttemptCount = 1,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = dto.Status is "sent" or "failed" ? DateTime.UtcNow : null
            });
        }

        var announcement = await _db.ScheduledAnnouncements.FindAsync(announcementId);
        if (announcement != null)
        {
            if (dto.Status == "sent")
                announcement.LastRunAtUtc = dto.PlannedRunAtUtc;
            announcement.NextRunAtUtc = dto.NextRunAtUtc;
            if (dto.NextRunAtUtc == null && announcement.ScheduleType == "once")
                announcement.Enabled = false;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<List<ScheduledAnnouncementRunDto>> GetRunsAsync(string guildId, int take)
    {
        var limit = Math.Clamp(take, 1, 200);
        return await _db.ScheduledAnnouncementRuns.AsNoTracking()
            .Where(r => r.Announcement.GuildId == guildId)
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Take(limit)
            .Select(r => new ScheduledAnnouncementRunDto
            {
                Id = r.Id,
                AnnouncementId = r.AnnouncementId,
                GuildId = r.Announcement.GuildId,
                Title = r.Announcement.Title,
                ChannelId = r.Announcement.ChannelId,
                PlannedRunAtUtc = r.PlannedRunAtUtc,
                Status = r.Status,
                SentMessageId = r.SentMessageId,
                ErrorCode = r.ErrorCode,
                AttemptCount = r.AttemptCount,
                CreatedAt = r.CreatedAt,
                CompletedAt = r.CompletedAt
            })
            .ToListAsync();
    }

    private static ScheduledAnnouncementDto MapAnnouncement(ScheduledAnnouncement a) =>
        new()
        {
            Id = a.Id,
            GuildId = a.GuildId,
            ChannelId = a.ChannelId,
            Title = a.Title,
            Content = a.Content,
            EmbedJson = a.EmbedJson,
            MentionPolicy = a.MentionPolicy,
            Timezone = a.Timezone,
            ScheduleType = a.ScheduleType,
            SendAtUtc = a.SendAtUtc,
            RRuleJson = a.RRuleJson,
            NextRunAtUtc = a.NextRunAtUtc,
            LastRunAtUtc = a.LastRunAtUtc,
            Paused = a.Paused,
            Enabled = a.Enabled,
            CreatedByUserId = a.CreatedByUserId,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };
}
