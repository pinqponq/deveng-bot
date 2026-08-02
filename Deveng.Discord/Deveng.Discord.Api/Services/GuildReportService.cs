using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class GuildReportService : IGuildReportService
{
    private readonly DevengDbContext _db;

    public GuildReportService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<GuildReportJobDto> CreateAsync(string guildId, string? createdByUserId, string reportRange)
    {
        var job = new GuildReportJob
        {
            GuildId = guildId,
            CreatedByUserId = createdByUserId,
            ReportRange = reportRange,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        _db.GuildReportJobs.Add(job);
        await _db.SaveChangesAsync();
        return Map(job);
    }

    public async Task<List<GuildReportJobDto>> GetByGuildIdAsync(string guildId, int take)
    {
        var limit = Math.Clamp(take, 1, 200);
        var jobs = await _db.GuildReportJobs.AsNoTracking()
            .Where(j => j.GuildId == guildId)
            .OrderByDescending(j => j.CreatedAt)
            .ThenByDescending(j => j.Id)
            .Take(limit)
            .ToListAsync();

        return jobs.Select(Map).ToList();
    }

    public async Task<List<GuildReportJobDto>> GetPendingAsync(int batchSize)
    {
        var limit = Math.Clamp(batchSize, 1, 100);
        var jobs = await _db.GuildReportJobs.AsNoTracking()
            .Where(j => j.Status == "pending")
            .OrderBy(j => j.CreatedAt)
            .ThenBy(j => j.Id)
            .Take(limit)
            .ToListAsync();

        return jobs.Select(Map).ToList();
    }

    public async Task CompleteAsync(long id, CompleteGuildReportJobDto dto)
    {
        var job = await _db.GuildReportJobs.FindAsync(id);
        if (job == null) return;

        job.Status = dto.Status;
        job.SummaryJson = dto.SummaryJson;
        job.FileRef = dto.FileRef;
        job.Error = dto.Error;
        job.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<GuildReportNotifyDto?> GetNotifyAsync(string guildId)
    {
        var notify = await _db.GuildReportNotifies.AsNoTracking()
            .FirstOrDefaultAsync(n => n.GuildId == guildId);
        return notify == null ? null : MapNotify(notify);
    }

    public async Task<GuildReportNotifyDto> UpsertNotifyAsync(string guildId, UpsertGuildReportNotifyDto dto)
    {
        var email = string.IsNullOrWhiteSpace(dto.NotifyEmail) ? null : dto.NotifyEmail.Trim();
        var notify = await _db.GuildReportNotifies.FirstOrDefaultAsync(n => n.GuildId == guildId);

        if (notify == null)
        {
            notify = new GuildReportNotify
            {
                GuildId = guildId,
                UpdatedAt = DateTime.UtcNow
            };
            _db.GuildReportNotifies.Add(notify);
        }

        notify.NotifyEmail = email;
        notify.SendOnComplete = dto.SendOnComplete;
        notify.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return MapNotify(notify);
    }

    public async Task<GuildReportJobDto?> GetByIdAsync(long id)
    {
        var job = await _db.GuildReportJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);
        return job == null ? null : Map(job);
    }

    public async Task<GuildReportJobDto?> GetByGuildAndIdAsync(string guildId, long id)
    {
        var job = await _db.GuildReportJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.GuildId == guildId && j.Id == id);
        return job == null ? null : Map(job);
    }

    public async Task UpdateEmailDeliveryAsync(long id, string? emailTo, DateTime sentAt, string status, string? error)
    {
        var job = await _db.GuildReportJobs.FindAsync(id);
        if (job == null) return;

        job.EmailTo = emailTo;
        job.EmailSentAt = sentAt;
        job.EmailStatus = status;
        job.EmailError = error;
        await _db.SaveChangesAsync();
    }

    private static GuildReportJobDto Map(GuildReportJob j) =>
        new()
        {
            Id = j.Id,
            GuildId = j.GuildId,
            CreatedByUserId = j.CreatedByUserId,
            ReportRange = j.ReportRange,
            Status = j.Status,
            SummaryJson = j.SummaryJson,
            FileRef = j.FileRef,
            Error = j.Error,
            CreatedAt = j.CreatedAt,
            CompletedAt = j.CompletedAt,
            ExpiresAt = j.ExpiresAt,
            EmailTo = j.EmailTo,
            EmailSentAt = j.EmailSentAt,
            EmailStatus = j.EmailStatus,
            EmailError = j.EmailError
        };

    private static GuildReportNotifyDto MapNotify(GuildReportNotify n) =>
        new()
        {
            GuildId = n.GuildId,
            NotifyEmail = n.NotifyEmail,
            SendOnComplete = n.SendOnComplete,
            UpdatedAt = n.UpdatedAt
        };
}
