using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IAutomationService
{
    Task<List<GuildAutomationDto>> GetByGuildIdAsync(string guildId);
    Task<GuildAutomationDto?> GetByIdAsync(int id);
    Task<GuildAutomationDto> CreateAsync(string guildId, CreateGuildAutomationDto dto);
    Task<GuildAutomationDto?> UpdateAsync(string guildId, int id, UpdateGuildAutomationDto dto);
    Task<bool> DeleteAsync(string guildId, int id);
}
