using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Deveng.Discord.Api.Services;

public class AIModerationService : IAIModerationService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly DevengDbContext _db;
    private readonly ILogger<AIModerationService> _logger;

    public AIModerationService(DevengDbContext db, ILogger<AIModerationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<AIModerationSettingDto?> GetSettingsAsync(string guildId)
    {
        var setting = await _db.AIModerationSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null) return null;

        var excludedIds = await _db.AIModerationExcludedChannels.AsNoTracking()
            .Where(c => c.GuildId == guildId)
            .Select(c => c.ChannelId)
            .ToListAsync();

        return MapSetting(setting, excludedIds);
    }

    public async Task<AIModerationSettingDto> UpsertSettingsAsync(string guildId, UpsertAIModerationSettingDto dto)
    {
        ValidateSettings(dto);

        await using var tx = await _db.Database.BeginTransactionAsync();

        var setting = await _db.AIModerationSettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null)
        {
            setting = new AIModerationSetting { GuildId = guildId };
            _db.AIModerationSettings.Add(setting);
        }

        setting.Enabled = dto.Enabled;
        setting.Mode = dto.Mode;
        setting.ThresholdLog = dto.ThresholdLog;
        setting.ThresholdDelete = dto.ThresholdDelete;
        setting.ThresholdTimeout = dto.ThresholdTimeout;
        setting.RetentionDays = dto.RetentionDays;
        setting.SampleRate = dto.SampleRate;

        await SyncExcludedChannelsAsync(guildId, dto.ExcludedChannelIdsJson);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetSettingsAsync(guildId) ?? throw new InvalidOperationException("AI moderasyon ayarı oluşturulamadı.");
    }

    public async Task<List<AIModerationPolicyDto>> GetPoliciesAsync(string guildId)
    {
        return await _db.AIModerationPolicies.AsNoTracking()
            .Where(p => p.GuildId == guildId)
            .OrderBy(p => p.Category)
            .Select(p => new AIModerationPolicyDto
            {
                Id = p.Id,
                GuildId = p.GuildId,
                Category = p.Category,
                LogThreshold = p.LogThreshold,
                DeleteThreshold = p.DeleteThreshold,
                TimeoutThreshold = p.TimeoutThreshold,
                Action = p.Action,
                Enabled = p.Enabled
            })
            .ToListAsync();
    }

    public async Task<AIModerationPolicyDto> UpsertPolicyAsync(string guildId, UpsertAIModerationPolicyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Category)) throw new ArgumentException("Kategori zorunludur.");
        ValidateThresholds(dto.LogThreshold, dto.DeleteThreshold, dto.TimeoutThreshold);

        var category = dto.Category.Trim();
        var policy = await _db.AIModerationPolicies
            .FirstOrDefaultAsync(p => p.GuildId == guildId &&
                p.Category.ToLower() == category.ToLower());

        if (policy == null)
        {
            policy = new AIModerationPolicy { GuildId = guildId, Category = category };
            _db.AIModerationPolicies.Add(policy);
        }

        policy.LogThreshold = dto.LogThreshold;
        policy.DeleteThreshold = dto.DeleteThreshold;
        policy.TimeoutThreshold = dto.TimeoutThreshold;
        policy.Action = dto.Action;
        policy.Enabled = dto.Enabled;

        await _db.SaveChangesAsync();

        var policies = await GetPoliciesAsync(guildId);
        return policies.First(p => string.Equals(p.Category, category, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<long> EnqueueAsync(CreateAIModerationQueueDto dto)
    {
        var item = new AIModerationQueue
        {
            GuildId = dto.GuildId,
            ChannelId = dto.ChannelId,
            MessageId = dto.MessageId,
            UserIdHash = dto.UserIdHash,
            ContentHash = dto.ContentHash,
            ContentPreviewRedacted = dto.ContentPreviewRedacted,
            Status = "pending",
            AttemptCount = 0,
            CreatedAt = DateTime.UtcNow
        };
        _db.AIModerationQueues.Add(item);
        await _db.SaveChangesAsync();
        return item.Id;
    }

    public async Task<List<AIModerationReviewDto>> GetReviewsAsync(string guildId, int limit = 100)
    {
        var take = Math.Clamp(limit, 1, 500);
        var rows = await _db.AIModerationReviews.AsNoTracking()
            .Where(r => r.GuildId == guildId)
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Take(take)
            .ToListAsync();
        return rows.Select(MapReview).ToList();
    }

    public async Task<bool> SetReviewDecisionAsync(string guildId, long reviewId, string decision)
    {
        var review = await _db.AIModerationReviews
            .FirstOrDefaultAsync(r => r.GuildId == guildId && r.Id == reviewId);
        if (review == null) return false;

        review.ModeratorDecision = decision;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<AIModerationQueueItemDto>> GetPendingQueueAsync(int batchSize)
    {
        var now = DateTime.UtcNow;
        var take = Math.Clamp(batchSize, 1, 100);
        return await _db.AIModerationQueues.AsNoTracking()
            .Where(q => q.Status == "pending" && (q.NextAttemptAt == null || q.NextAttemptAt <= now))
            .OrderBy(q => q.Id)
            .Take(take)
            .Select(q => new AIModerationQueueItemDto
            {
                Id = q.Id,
                GuildId = q.GuildId,
                ChannelId = q.ChannelId,
                MessageId = q.MessageId,
                UserIdHash = q.UserIdHash,
                ContentHash = q.ContentHash,
                ContentPreviewRedacted = q.ContentPreviewRedacted,
                Status = q.Status,
                AttemptCount = q.AttemptCount,
                NextAttemptAt = q.NextAttemptAt,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync();
    }

    public async Task CompleteQueueWithReviewAsync(long queueId, CompleteAIModerationQueueWorkerDto dto)
    {
        var status = dto.QueueFinalStatus.Trim();
        if (!string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(status, "failed", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("QueueFinalStatus completed veya failed olmalıdır.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var queue = await _db.AIModerationQueues
            .FirstOrDefaultAsync(q => q.Id == queueId && q.Status == "pending");
        if (queue == null)
        {
            await tx.RollbackAsync();
            _logger.LogInformation(
                "CompleteAIModerationQueueWithReview: kuyruk {QueueId} islenmedi (pending degil veya baska worker tamamladi).",
                queueId);
            return;
        }

        _db.AIModerationReviews.Add(new AIModerationReview
        {
            QueueId = queueId,
            GuildId = queue.GuildId,
            MessageId = queue.MessageId,
            LabelsJson = dto.LabelsJson,
            MatchedCategory = dto.MatchedCategory,
            Score = dto.Score,
            ThresholdSnapshotJson = dto.ThresholdSnapshotJson,
            Provider = dto.Provider,
            ModelName = dto.ModelName,
            RecommendedAction = dto.RecommendedAction,
            AppliedAction = dto.AppliedAction,
            DecisionReasonKey = dto.DecisionReasonKey,
            DecisionReasonParamsJson = dto.DecisionReasonParamsJson,
            ExpiresAt = dto.ExpiresAt,
            CreatedAt = DateTime.UtcNow
        });

        queue.Status = status;
        queue.ProcessedAt = DateTime.UtcNow;
        queue.ErrorCode = dto.QueueErrorCode;

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    public async Task FailQueueItemAsync(long queueId, string errorCode)
    {
        var trimmed = string.IsNullOrWhiteSpace(errorCode) ? "unknown" : errorCode.Trim();
        var code = trimmed.Length > 128 ? trimmed[..128] : trimmed;

        var queue = await _db.AIModerationQueues
            .FirstOrDefaultAsync(q => q.Id == queueId && q.Status == "pending");
        if (queue == null)
        {
            _logger.LogInformation(
                "FailAIModerationQueueItem: kuyruk {QueueId} guncellenmedi (pending degil veya zaten sonuclanmis).",
                queueId);
            return;
        }

        queue.Status = "failed";
        queue.ProcessedAt = DateTime.UtcNow;
        queue.ErrorCode = code;
        await _db.SaveChangesAsync();
    }

    private async Task SyncExcludedChannelsAsync(string guildId, string? excludedChannelIdsJson)
    {
        var existing = await _db.AIModerationExcludedChannels
            .Where(c => c.GuildId == guildId)
            .ToListAsync();
        _db.AIModerationExcludedChannels.RemoveRange(existing);

        if (string.IsNullOrWhiteSpace(excludedChannelIdsJson))
            return;

        try
        {
            var ids = JsonSerializer.Deserialize<List<string>>(excludedChannelIdsJson, JsonOptions);
            if (ids == null) return;

            foreach (var channelId in ids.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).Distinct())
            {
                _db.AIModerationExcludedChannels.Add(new AIModerationExcludedChannel
                {
                    GuildId = guildId,
                    ChannelId = channelId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        catch (JsonException)
        {
        }
    }

    private static AIModerationSettingDto MapSetting(AIModerationSetting setting, IReadOnlyList<string> excludedIds) => new()
    {
        GuildId = setting.GuildId,
        Enabled = setting.Enabled,
        Mode = setting.Mode,
        ThresholdLog = setting.ThresholdLog,
        ThresholdDelete = setting.ThresholdDelete,
        ThresholdTimeout = setting.ThresholdTimeout,
        ExcludedChannelIdsJson = excludedIds.Count > 0 ? JsonSerializer.Serialize(excludedIds, JsonOptions) : null,
        RetentionDays = setting.RetentionDays,
        SampleRate = setting.SampleRate,
        CreatedAt = setting.CreatedAt,
        UpdatedAt = setting.UpdatedAt
    };

    private static AIModerationReviewDto MapReview(AIModerationReview review) => new()
    {
        Id = review.Id,
        QueueId = review.QueueId,
        GuildId = review.GuildId,
        MessageId = review.MessageId,
        LabelsJson = review.LabelsJson,
        MatchedCategory = review.MatchedCategory,
        Score = review.Score,
        ThresholdSnapshotJson = review.ThresholdSnapshotJson,
        Provider = review.Provider,
        ModelName = review.ModelName,
        RecommendedAction = review.RecommendedAction,
        AppliedAction = review.AppliedAction,
        DecisionReasonKey = review.DecisionReasonKey,
        DecisionReasonParamsJson = review.DecisionReasonParamsJson,
        ModeratorDecision = review.ModeratorDecision,
        CreatedAt = review.CreatedAt,
        ExpiresAt = review.ExpiresAt
    };

    private static void ValidateSettings(UpsertAIModerationSettingDto dto)
    {
        var allowedModes = new[] { "log_only", "delete_high_confidence", "delete_and_timeout" };
        if (!allowedModes.Contains(dto.Mode, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException("Geçersiz AI moderasyon modu.");
        ValidateThresholds(dto.ThresholdLog, dto.ThresholdDelete, dto.ThresholdTimeout);
        if (dto.RetentionDays is < 1 or > 365) throw new ArgumentException("Retention 1-365 gün aralığında olmalıdır.");
        if (dto.SampleRate is < 0 or > 1) throw new ArgumentException("SampleRate 0-1 aralığında olmalıdır.");
    }

    private static void ValidateThresholds(decimal log, decimal delete, decimal timeout)
    {
        if (log is < 0 or > 1 || delete is < 0 or > 1 || timeout is < 0 or > 1)
            throw new ArgumentException("Eşikler 0-1 aralığında olmalıdır.");
        if (log > delete || delete > timeout)
            throw new ArgumentException("Eşik sırası log <= delete <= timeout olmalıdır.");
    }
}
