using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ILevelService
{
    Task<LevelDto?> GetLevelByGuildIdAsync(string guildId);
    Task<LevelDto> CreateOrUpdateLevelAsync(string guildId, CreateLevelDto createDto);
    Task<LevelDto?> UpdateLevelAsync(string guildId, UpdateLevelDto updateDto);
    Task<bool> DeleteLevelAsync(string guildId);
    Task<List<UserLevelDto>> GetUserLevelsByGuildIdAsync(string guildId, int? limit = null);
    Task<UserLevelDto?> GetUserLevelAsync(string guildId, string userId);
    Task<UserLevelDto> AddXpToUserAsync(string guildId, string userId, int xp);
    Task<List<UserLevelDto>> GetLeaderboardAsync(string guildId, int limit = 10);
}
