using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Deveng.Discord.Api.Services;

public class GuildFeatureService : IGuildFeatureService
{
    private static string FeaturesCacheKey(string guildId) => $"discord:guild:{guildId}:features";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly DevengDbContext _db;
    private readonly IRedisCacheService _cache;
    private readonly ILogger<GuildFeatureService> _logger;

    public GuildFeatureService(DevengDbContext db, IRedisCacheService cache, ILogger<GuildFeatureService> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<GuildFeatureStatusDto>> GetGuildFeaturesAsync(string guildId)
    {
        var key = FeaturesCacheKey(guildId);
        var cached = await _cache.GetAsync<List<GuildFeatureStatusDto>>(key);
        if (cached != null)
            return cached;

        var list = await _db.GuildFeatures.AsNoTracking()
            .Where(f => f.GuildId == guildId)
            .OrderBy(f => f.FeatureName)
            .Select(f => new GuildFeatureStatusDto
            {
                FeatureName = f.FeatureName,
                IsEnabled = f.IsEnabled
            })
            .ToListAsync();

        await _cache.SetAsync(key, list, CacheTtl);
        return list;
    }

    public async Task<GuildFeatureDto?> GetGuildFeatureAsync(string guildId, string featureName)
    {
        var feature = await _db.GuildFeatures.AsNoTracking()
            .FirstOrDefaultAsync(f => f.GuildId == guildId &&
                f.FeatureName.ToLower() == featureName.ToLower());
        return feature == null ? null : MapToDto(feature);
    }

    public async Task<GuildFeatureDto> EnableGuildFeatureAsync(string guildId, string featureName)
    {
        _logger.LogInformation("[GuildFeatureService] Enable GuildId={GuildId}, Feature={Feature}", guildId, featureName);
        await UpsertFeatureAsync(guildId, featureName, enabled: true);
        await InvalidateGuildFeaturesCacheAsync(guildId);
        return await GetGuildFeatureAsync(guildId, featureName)
               ?? throw new Exception("Feature kaydı oluşturulamadı");
    }

    public async Task<GuildFeatureDto> DisableGuildFeatureAsync(string guildId, string featureName)
    {
        _logger.LogInformation("[GuildFeatureService] Disable GuildId={GuildId}, Feature={Feature}", guildId, featureName);
        await UpsertFeatureAsync(guildId, featureName, enabled: false);
        await InvalidateGuildFeaturesCacheAsync(guildId);
        return await GetGuildFeatureAsync(guildId, featureName)
               ?? throw new Exception("Feature kaydı oluşturulamadı");
    }

    public async Task<List<string>> GetEnabledFeaturesForGuildAsync(string guildId)
    {
        var list = await GetGuildFeaturesAsync(guildId);
        return list.Where(x => x.IsEnabled).Select(x => x.FeatureName).ToList();
    }

    public async Task<bool> IsFeatureEnabledAsync(string guildId, string featureName)
    {
        var list = await GetGuildFeaturesAsync(guildId);
        var feature = list.FirstOrDefault(x =>
            string.Equals(x.FeatureName, featureName, StringComparison.OrdinalIgnoreCase));
        return feature?.IsEnabled ?? false;
    }

    public Task InvalidateGuildFeaturesCacheAsync(string guildId)
        => _cache.DeleteAsync(FeaturesCacheKey(guildId));

    private async Task UpsertFeatureAsync(string guildId, string featureName, bool enabled)
    {
        var normalized = featureName.Trim();
        var feature = await _db.GuildFeatures
            .FirstOrDefaultAsync(f => f.GuildId == guildId &&
                f.FeatureName.ToLower() == normalized.ToLower());

        if (feature == null)
        {
            feature = new GuildFeature
            {
                GuildId = guildId,
                FeatureName = normalized,
                IsEnabled = enabled
            };
            _db.GuildFeatures.Add(feature);
        }
        else
        {
            feature.IsEnabled = enabled;
        }

        await _db.SaveChangesAsync();
    }

    private static GuildFeatureDto MapToDto(GuildFeature f) => new()
    {
        Id = f.Id,
        GuildId = f.GuildId,
        FeatureName = f.FeatureName,
        IsEnabled = f.IsEnabled,
        CreatedAt = f.CreatedAt,
        UpdatedAt = f.UpdatedAt
    };
}
