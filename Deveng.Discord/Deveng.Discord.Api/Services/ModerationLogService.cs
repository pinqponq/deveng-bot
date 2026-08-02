using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ModerationLogService : IModerationLogService
{
    private readonly DevengDbContext _db;

    public ModerationLogService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<ModerationActionLogDto> CreateActionLogAsync(CreateModerationActionLogDto dto)
    {
        var entity = new ModerationActionLog
        {
            GuildId = dto.GuildId,
            Source = dto.Source,
            RuleType = dto.RuleType,
            UserIdHash = dto.UserIdHash,
            ChannelId = dto.ChannelId,
            MessageId = dto.MessageId,
            Action = dto.Action,
            ActionStatus = dto.ActionStatus,
            ReasonKey = dto.ReasonKey,
            ReasonParamsJson = dto.ReasonParamsJson,
            ScoreSnapshotJson = dto.ScoreSnapshotJson,
            ActorType = dto.ActorType,
            ActorUserId = dto.ActorUserId,
            ReviewId = dto.ReviewId,
            ErrorCode = dto.ErrorCode,
            CreatedAt = DateTime.UtcNow
        };

        _db.ModerationActionLogs.Add(entity);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(dto.GuildId, entity.Id)
               ?? new ModerationActionLogDto { Id = entity.Id, GuildId = dto.GuildId };
    }

    public async Task<ModerationUserNoticeDto> CreateUserNoticeAsync(CreateModerationUserNoticeDto dto)
    {
        var entity = new ModerationUserNotice
        {
            GuildId = dto.GuildId,
            UserIdHash = dto.UserIdHash,
            MessageId = dto.MessageId,
            ActionLogId = dto.ActionLogId,
            NoticeType = dto.NoticeType,
            NoticeTextKey = dto.NoticeTextKey,
            NoticeParamsJson = dto.NoticeParamsJson,
            DeliveryStatus = dto.DeliveryStatus,
            DiscordNoticeMessageId = dto.DiscordNoticeMessageId,
            CreatedAt = DateTime.UtcNow
        };

        _db.ModerationUserNotices.Add(entity);
        await _db.SaveChangesAsync();

        return new ModerationUserNoticeDto
        {
            Id = entity.Id,
            GuildId = entity.GuildId,
            UserIdHash = entity.UserIdHash,
            MessageId = entity.MessageId,
            ActionLogId = entity.ActionLogId,
            NoticeType = entity.NoticeType,
            NoticeTextKey = entity.NoticeTextKey,
            NoticeParamsJson = entity.NoticeParamsJson,
            DeliveryStatus = entity.DeliveryStatus,
            DiscordNoticeMessageId = entity.DiscordNoticeMessageId,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<ModerationActionLogDto>> QueryAsync(string guildId, ModerationLogQueryDto query)
    {
        var q = _db.ModerationActionLogs.AsNoTracking()
            .Where(l => l.GuildId == guildId);

        if (!string.IsNullOrWhiteSpace(query.Source))
            q = q.Where(l => l.Source == query.Source);
        if (!string.IsNullOrWhiteSpace(query.UserIdHash))
            q = q.Where(l => l.UserIdHash == query.UserIdHash);
        if (!string.IsNullOrWhiteSpace(query.ChannelId))
            q = q.Where(l => l.ChannelId == query.ChannelId);
        if (!string.IsNullOrWhiteSpace(query.Action))
            q = q.Where(l => l.Action == query.Action);
        if (!string.IsNullOrWhiteSpace(query.RuleType))
            q = q.Where(l => l.RuleType == query.RuleType);
        if (query.From.HasValue)
            q = q.Where(l => l.CreatedAt >= query.From.Value);
        if (query.To.HasValue)
            q = q.Where(l => l.CreatedAt < query.To.Value);

        var limit = Math.Clamp(query.Limit, 1, 500);
        var rows = await q.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id)
            .Take(limit)
            .ToListAsync();
        return rows.Select(MapActionLog).ToList();
    }

    public async Task<ModerationActionLogDto?> GetByIdAsync(string guildId, long id)
    {
        var row = await _db.ModerationActionLogs.AsNoTracking()
            .FirstOrDefaultAsync(l => l.GuildId == guildId && l.Id == id);
        return row == null ? null : MapActionLog(row);
    }

    private static ModerationActionLogDto MapActionLog(ModerationActionLog row) => new()
    {
        Id = row.Id,
        GuildId = row.GuildId,
        Source = row.Source,
        RuleType = row.RuleType,
        UserIdHash = row.UserIdHash,
        ChannelId = row.ChannelId,
        MessageId = row.MessageId,
        Action = row.Action,
        ActionStatus = row.ActionStatus,
        ReasonKey = row.ReasonKey,
        ReasonParamsJson = row.ReasonParamsJson,
        ScoreSnapshotJson = row.ScoreSnapshotJson,
        ActorType = row.ActorType,
        ActorUserId = row.ActorUserId,
        ReviewId = row.ReviewId,
        ErrorCode = row.ErrorCode,
        CreatedAt = row.CreatedAt
    };
}
