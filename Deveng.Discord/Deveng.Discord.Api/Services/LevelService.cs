using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Exceptions;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class LevelService : ILevelService
{
    private const string LevelFeatureName = "Level";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly ILogger<LevelService> _logger;

    public LevelService(DevengDbContext db, IGuildFeatureService guildFeatureService, ILogger<LevelService> logger)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _logger = logger;
    }

    public async Task<LevelDto?> GetLevelByGuildIdAsync(string guildId)
    {
        try
        {
            var level = await _db.Levels.AsNoTracking()
                .FirstOrDefaultAsync(l => l.GuildId == guildId);
            if (level == null) return null;

            var dto = await MapLevelToDtoAsync(level);
            dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, LevelFeatureName);
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[LevelService] GetLevelByGuildIdAsync failed GuildId={GuildId}", guildId);
            throw;
        }
    }

    public async Task<LevelDto> CreateOrUpdateLevelAsync(string guildId, CreateLevelDto createDto)
    {
        try
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var level = await _db.Levels.FirstOrDefaultAsync(l => l.GuildId == guildId);
            if (level == null)
            {
                level = new Level { GuildId = guildId };
                _db.Levels.Add(level);
            }

            ApplyCreateDto(level, createDto);
            await SyncLevelChildTablesAsync(guildId, createDto.IgnoredChannelIds, createDto.IgnoredRoleIds, createDto.RoleRewardsJson);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return await GetLevelByGuildIdAsync(guildId)
                   ?? throw new Exception("Level ayarları oluşturulamadı");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[LevelService] CreateOrUpdateLevelAsync failed GuildId={GuildId}", guildId);
            throw;
        }
    }

    public async Task<LevelDto?> UpdateLevelAsync(string guildId, UpdateLevelDto updateDto)
    {
        var existing = await GetLevelByGuildIdAsync(guildId);
        if (existing == null) return null;

        var level = await _db.Levels.FirstOrDefaultAsync(l => l.GuildId == guildId);
        if (level == null) return null;

        ApplyUpdateDto(level, updateDto);

        if (updateDto.IgnoredChannelIds != null || updateDto.IgnoredRoleIds != null || updateDto.RoleRewardsJson != null)
        {
            await SyncLevelChildTablesAsync(
                guildId,
                updateDto.IgnoredChannelIds ?? existing.IgnoredChannelIds,
                updateDto.IgnoredRoleIds ?? existing.IgnoredRoleIds,
                updateDto.RoleRewardsJson ?? existing.RoleRewardsJson);
        }

        await _db.SaveChangesAsync();
        return await GetLevelByGuildIdAsync(guildId);
    }

    public async Task<bool> DeleteLevelAsync(string guildId)
    {
        var existing = await GetLevelByGuildIdAsync(guildId);
        if (existing == null) return false;

        await using var tx = await _db.Database.BeginTransactionAsync();

        var ignoredChannels = await _db.LevelIgnoredChannels.Where(c => c.GuildId == guildId).ToListAsync();
        var ignoredRoles = await _db.LevelIgnoredRoles.Where(r => r.GuildId == guildId).ToListAsync();
        var roleRewards = await _db.LevelRoleRewards.Where(r => r.GuildId == guildId).ToListAsync();
        var userLevels = await _db.UserLevels.Where(u => u.GuildId == guildId).ToListAsync();
        var level = await _db.Levels.FirstOrDefaultAsync(l => l.GuildId == guildId);

        _db.LevelIgnoredChannels.RemoveRange(ignoredChannels);
        _db.LevelIgnoredRoles.RemoveRange(ignoredRoles);
        _db.LevelRoleRewards.RemoveRange(roleRewards);
        _db.UserLevels.RemoveRange(userLevels);
        if (level != null)
            _db.Levels.Remove(level);

        var rows = await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => (await GetLevelByGuildIdAsync(guildId)) != null);
    }

    public async Task<List<UserLevelDto>> GetUserLevelsByGuildIdAsync(string guildId, int? limit = null)
    {
        await EnsureLevelFeatureEnabledAsync(guildId);
        IQueryable<UserLevel> query = _db.UserLevels.AsNoTracking()
            .Where(u => u.GuildId == guildId)
            .OrderByDescending(u => u.TotalXp)
            .ThenByDescending(u => u.Level);

        if (limit.HasValue)
            query = query.Take(limit.Value);

        var rows = await query.ToListAsync();
        return rows.Select(MapUserLevelToDto).ToList();
    }

    public async Task<UserLevelDto?> GetUserLevelAsync(string guildId, string userId)
    {
        await EnsureLevelFeatureEnabledAsync(guildId);
        var row = await _db.UserLevels.AsNoTracking()
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == userId);
        return row == null ? null : MapUserLevelToDto(row);
    }

    public async Task<UserLevelDto> AddXpToUserAsync(string guildId, string userId, int xp)
    {
        await EnsureLevelFeatureEnabledAsync(guildId);

        await using var tx = await _db.Database.BeginTransactionAsync();

        var levelSettings = await _db.Levels.AsNoTracking()
            .FirstOrDefaultAsync(l => l.GuildId == guildId);
        var baseXpRequired = levelSettings?.BaseXpRequired ?? 100;
        var xpMultiplier = levelSettings?.XpMultiplier ?? 1.50m;

        var userLevel = await _db.UserLevels
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == userId);

        if (userLevel == null)
        {
            userLevel = new UserLevel
            {
                GuildId = guildId,
                UserId = userId,
                Level = 1,
                TotalXp = 0,
                CurrentXp = 0,
                XpForNextLevel = baseXpRequired,
                LastMessageAt = DateTime.UtcNow
            };
            _db.UserLevels.Add(userLevel);
        }

        var newTotalXp = userLevel.TotalXp + xp;
        var newCurrentXp = userLevel.CurrentXp + xp;
        var newLevel = userLevel.Level;
        var newXpForNextLevel = userLevel.XpForNextLevel;

        while (newCurrentXp >= newXpForNextLevel && newLevel < 1000)
        {
            newCurrentXp -= newXpForNextLevel;
            newLevel++;
            newXpForNextLevel = (long)(baseXpRequired * Math.Pow((double)xpMultiplier, newLevel - 1));
        }

        userLevel.TotalXp = newTotalXp;
        userLevel.CurrentXp = newCurrentXp;
        userLevel.Level = newLevel;
        userLevel.XpForNextLevel = newXpForNextLevel;
        userLevel.LastMessageAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return MapUserLevelToDto(userLevel);
    }

    public async Task<List<UserLevelDto>> GetLeaderboardAsync(string guildId, int limit = 10)
    {
        await EnsureLevelFeatureEnabledAsync(guildId);
        var rows = await _db.UserLevels.AsNoTracking()
            .Where(u => u.GuildId == guildId)
            .OrderByDescending(u => u.TotalXp)
            .ThenByDescending(u => u.Level)
            .Take(limit)
            .ToListAsync();
        return rows.Select(MapUserLevelToDto).ToList();
    }

    private async Task EnsureLevelFeatureEnabledAsync(string guildId)
    {
        var enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, LevelFeatureName);
        if (!enabled)
            throw new FeatureDisabledException("Level özelliği bu sunucuda kapalı.");
    }

    private async Task<LevelDto> MapLevelToDtoAsync(Level level)
    {
        var ignoredChannelIds = string.Join(",",
            await _db.LevelIgnoredChannels.AsNoTracking()
                .Where(c => c.GuildId == level.GuildId)
                .OrderBy(c => c.ChannelId)
                .Select(c => c.ChannelId)
                .ToListAsync());

        var ignoredRoleIds = string.Join(",",
            await _db.LevelIgnoredRoles.AsNoTracking()
                .Where(r => r.GuildId == level.GuildId)
                .OrderBy(r => r.RoleId)
                .Select(r => r.RoleId)
                .ToListAsync());

        var rewards = await _db.LevelRoleRewards.AsNoTracking()
            .Where(r => r.GuildId == level.GuildId)
            .OrderBy(r => r.Level)
            .ThenBy(r => r.RoleId)
            .Select(r => new { level = r.Level, roleId = r.RoleId, removePreviousRole = r.RemovePreviousRole })
            .ToListAsync();

        return new LevelDto
        {
            Id = level.Id,
            GuildId = level.GuildId,
            Enabled = false,
            XpPerMessage = level.XpPerMessage,
            XpPerMessageMin = level.XpPerMessageMin,
            XpPerMessageMax = level.XpPerMessageMax,
            UseRandomXp = level.UseRandomXp,
            CooldownSeconds = level.CooldownSeconds,
            BaseXpRequired = level.BaseXpRequired,
            XpMultiplier = (double)level.XpMultiplier,
            NotifyOnLevelUp = level.NotifyOnLevelUp,
            NotificationChannelId = level.NotificationChannelId,
            UseEmbedForNotification = level.UseEmbedForNotification,
            NotificationMessage = level.NotificationMessage,
            NotificationEmbedTitle = level.NotificationEmbedTitle,
            NotificationEmbedDescription = level.NotificationEmbedDescription,
            NotificationEmbedColor = level.NotificationEmbedColor,
            NotificationEmbedThumbnail = level.NotificationEmbedThumbnail,
            NotificationEmbedImage = level.NotificationEmbedImage,
            NotificationEmbedFooter = level.NotificationEmbedFooter,
            NotificationEmbedTitleUrl = level.NotificationEmbedTitleUrl,
            NotificationEmbedAuthorName = level.NotificationEmbedAuthorName,
            NotificationEmbedAuthorIcon = level.NotificationEmbedAuthorIcon,
            NotificationEmbedAuthorUrl = level.NotificationEmbedAuthorUrl,
            NotificationEmbedFooterIcon = level.NotificationEmbedFooterIcon,
            NotificationEmbedUseTimestamp = level.NotificationEmbedUseTimestamp,
            NotificationEmbedFieldsJson = level.NotificationEmbedFieldsJson,
            UseEmbedForXpGain = level.UseEmbedForXpGain,
            XpGainMessage = level.XpGainMessage,
            XpGainEmbedColor = level.XpGainEmbedColor,
            IgnoredChannelIds = string.IsNullOrEmpty(ignoredChannelIds) ? null : ignoredChannelIds,
            IgnoredRoleIds = string.IsNullOrEmpty(ignoredRoleIds) ? null : ignoredRoleIds,
            EnableRoleRewards = level.EnableRoleRewards,
            RoleRewardsJson = rewards.Count > 0 ? JsonSerializer.Serialize(rewards, JsonOptions) : null,
            CreatedAt = level.CreatedAt,
            UpdatedAt = level.UpdatedAt
        };
    }

    private static UserLevelDto MapUserLevelToDto(UserLevel row) => new()
    {
        Id = row.Id,
        GuildId = row.GuildId,
        UserId = row.UserId,
        Level = row.Level,
        TotalXp = row.TotalXp,
        CurrentXp = row.CurrentXp,
        XpForNextLevel = row.XpForNextLevel,
        LastMessageAt = row.LastMessageAt,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt
    };

    private static void ApplyCreateDto(Level level, CreateLevelDto dto)
    {
        level.XpPerMessage = dto.XpPerMessage;
        level.XpPerMessageMin = dto.XpPerMessageMin;
        level.XpPerMessageMax = dto.XpPerMessageMax;
        level.UseRandomXp = dto.UseRandomXp;
        level.CooldownSeconds = dto.CooldownSeconds;
        level.BaseXpRequired = dto.BaseXpRequired;
        level.XpMultiplier = (decimal)dto.XpMultiplier;
        level.NotifyOnLevelUp = dto.NotifyOnLevelUp;
        level.NotificationChannelId = dto.NotificationChannelId;
        level.UseEmbedForNotification = dto.UseEmbedForNotification;
        level.NotificationMessage = dto.NotificationMessage;
        level.NotificationEmbedTitle = dto.NotificationEmbedTitle;
        level.NotificationEmbedDescription = dto.NotificationEmbedDescription;
        level.NotificationEmbedColor = dto.NotificationEmbedColor;
        level.NotificationEmbedThumbnail = dto.NotificationEmbedThumbnail;
        level.NotificationEmbedImage = dto.NotificationEmbedImage;
        level.NotificationEmbedFooter = dto.NotificationEmbedFooter;
        level.NotificationEmbedTitleUrl = dto.NotificationEmbedTitleUrl;
        level.NotificationEmbedAuthorName = dto.NotificationEmbedAuthorName;
        level.NotificationEmbedAuthorIcon = dto.NotificationEmbedAuthorIcon;
        level.NotificationEmbedAuthorUrl = dto.NotificationEmbedAuthorUrl;
        level.NotificationEmbedFooterIcon = dto.NotificationEmbedFooterIcon;
        level.NotificationEmbedUseTimestamp = dto.NotificationEmbedUseTimestamp;
        level.NotificationEmbedFieldsJson = dto.NotificationEmbedFieldsJson;
        level.UseEmbedForXpGain = dto.UseEmbedForXpGain;
        level.XpGainMessage = dto.XpGainMessage;
        level.XpGainEmbedColor = dto.XpGainEmbedColor;
        level.EnableRoleRewards = dto.EnableRoleRewards;
    }

    private static void ApplyUpdateDto(Level level, UpdateLevelDto dto)
    {
        if (dto.XpPerMessage.HasValue) level.XpPerMessage = dto.XpPerMessage.Value;
        if (dto.XpPerMessageMin.HasValue) level.XpPerMessageMin = dto.XpPerMessageMin.Value;
        if (dto.XpPerMessageMax.HasValue) level.XpPerMessageMax = dto.XpPerMessageMax.Value;
        if (dto.UseRandomXp.HasValue) level.UseRandomXp = dto.UseRandomXp.Value;
        if (dto.CooldownSeconds.HasValue) level.CooldownSeconds = dto.CooldownSeconds.Value;
        if (dto.BaseXpRequired.HasValue) level.BaseXpRequired = dto.BaseXpRequired.Value;
        if (dto.XpMultiplier.HasValue) level.XpMultiplier = (decimal)dto.XpMultiplier.Value;
        if (dto.NotifyOnLevelUp.HasValue) level.NotifyOnLevelUp = dto.NotifyOnLevelUp.Value;
        level.NotificationChannelId = dto.NotificationChannelId;
        if (dto.UseEmbedForNotification.HasValue) level.UseEmbedForNotification = dto.UseEmbedForNotification.Value;
        level.NotificationMessage = dto.NotificationMessage;
        level.NotificationEmbedTitle = dto.NotificationEmbedTitle;
        level.NotificationEmbedDescription = dto.NotificationEmbedDescription;
        level.NotificationEmbedColor = dto.NotificationEmbedColor;
        level.NotificationEmbedThumbnail = dto.NotificationEmbedThumbnail;
        level.NotificationEmbedImage = dto.NotificationEmbedImage;
        level.NotificationEmbedFooter = dto.NotificationEmbedFooter;
        level.NotificationEmbedTitleUrl = dto.NotificationEmbedTitleUrl;
        level.NotificationEmbedAuthorName = dto.NotificationEmbedAuthorName;
        level.NotificationEmbedAuthorIcon = dto.NotificationEmbedAuthorIcon;
        level.NotificationEmbedAuthorUrl = dto.NotificationEmbedAuthorUrl;
        level.NotificationEmbedFooterIcon = dto.NotificationEmbedFooterIcon;
        if (dto.NotificationEmbedUseTimestamp.HasValue) level.NotificationEmbedUseTimestamp = dto.NotificationEmbedUseTimestamp.Value;
        level.NotificationEmbedFieldsJson = dto.NotificationEmbedFieldsJson;
        if (dto.UseEmbedForXpGain.HasValue) level.UseEmbedForXpGain = dto.UseEmbedForXpGain.Value;
        level.XpGainMessage = dto.XpGainMessage;
        level.XpGainEmbedColor = dto.XpGainEmbedColor;
        if (dto.EnableRoleRewards.HasValue) level.EnableRoleRewards = dto.EnableRoleRewards.Value;
    }

    private async Task SyncLevelChildTablesAsync(string guildId, string? ignoredChannelIds, string? ignoredRoleIds,
        string? roleRewardsJson)
    {
        var existingChannels = await _db.LevelIgnoredChannels.Where(c => c.GuildId == guildId).ToListAsync();
        _db.LevelIgnoredChannels.RemoveRange(existingChannels);
        foreach (var channelId in ParseCommaSeparatedIds(ignoredChannelIds))
        {
            _db.LevelIgnoredChannels.Add(new LevelIgnoredChannel
            {
                GuildId = guildId,
                ChannelId = channelId,
                CreatedAt = DateTime.UtcNow
            });
        }

        var existingRoles = await _db.LevelIgnoredRoles.Where(r => r.GuildId == guildId).ToListAsync();
        _db.LevelIgnoredRoles.RemoveRange(existingRoles);
        foreach (var roleId in ParseCommaSeparatedIds(ignoredRoleIds))
        {
            _db.LevelIgnoredRoles.Add(new LevelIgnoredRole
            {
                GuildId = guildId,
                RoleId = roleId,
                CreatedAt = DateTime.UtcNow
            });
        }

        var existingRewards = await _db.LevelRoleRewards.Where(r => r.GuildId == guildId).ToListAsync();
        _db.LevelRoleRewards.RemoveRange(existingRewards);
        if (!string.IsNullOrWhiteSpace(roleRewardsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(roleRewardsJson);
                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    if (!item.TryGetProperty("roleId", out var roleIdProp)) continue;
                    var roleId = roleIdProp.GetString();
                    if (string.IsNullOrWhiteSpace(roleId)) continue;

                    var levelValue = item.TryGetProperty("level", out var levelProp) ? levelProp.GetInt32() : 0;
                    if (levelValue < 1) continue;

                    var removePrevious = item.TryGetProperty("removePreviousRole", out var removeProp) && removeProp.GetBoolean();
                    _db.LevelRoleRewards.Add(new LevelRoleReward
                    {
                        GuildId = guildId,
                        Level = levelValue,
                        RoleId = roleId,
                        RemovePreviousRole = removePrevious,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            catch (JsonException)
            {
            }
        }
    }

    private static IEnumerable<string> ParseCommaSeparatedIds(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) yield break;
        foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!string.IsNullOrWhiteSpace(part))
                yield return part;
        }
    }
}
