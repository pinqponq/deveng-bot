using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IModeratorService
{
    Task<ModeratorDto?> GetModeratorByGuildIdAsync(string guildId);
    Task<ModeratorDto> CreateOrUpdateModeratorAsync(string guildId, CreateModeratorDto createDto);
    Task<ModeratorDto?> UpdateModeratorAsync(string guildId, UpdateModeratorDto updateDto);
    Task<bool> DeleteModeratorAsync(string guildId);
    Task<List<ModeratorDto>> GetAllModeratorsAsync();
    Task<ModeratorRuleDto?> UpdateModeratorRuleAsync(string guildId, string ruleType, UpdateModeratorRuleDto updateDto);
    Task<ForbiddenWordDto> AddForbiddenWordAsync(string guildId, AddForbiddenWordDto addDto);
    Task<bool> DeleteForbiddenWordAsync(int wordId);
    Task<List<ForbiddenWordDto>> GetForbiddenWordsAsync(string guildId);
}
