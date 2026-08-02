using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGuildFeatureService
{
    Task<List<GuildFeatureStatusDto>> GetGuildFeaturesAsync(string guildId);
    Task<GuildFeatureDto?> GetGuildFeatureAsync(string guildId, string featureName);
    Task<GuildFeatureDto> EnableGuildFeatureAsync(string guildId, string featureName);
    Task<GuildFeatureDto> DisableGuildFeatureAsync(string guildId, string featureName);
    Task<List<string>> GetEnabledFeaturesForGuildAsync(string guildId);
    Task<bool> IsFeatureEnabledAsync(string guildId, string featureName);

    /// <summary>Sunucu silindiğinde veya tenant kalktığında Redis özellik önbelleğini temizler.</summary>
    Task InvalidateGuildFeaturesCacheAsync(string guildId);
}
