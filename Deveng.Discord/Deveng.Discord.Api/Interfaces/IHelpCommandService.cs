using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IHelpCommandService
{
    Task<List<HelpCommandDto>> GetHelpCommandsAsync(string guildId);
    Task<HelpCommandDto?> GetHelpCommandByNameAsync(string guildId, string commandName);
    Task<HelpCommandDto?> GetHelpCommandByIdAsync(int id);
    Task<HelpCommandDto> CreateOrUpdateHelpCommandAsync(string guildId, CreateHelpCommandDto createDto);
    Task<HelpCommandDto?> UpdateHelpCommandAsync(int id, UpdateHelpCommandDto updateDto);
    Task<bool> DeleteHelpCommandAsync(int id);
}
