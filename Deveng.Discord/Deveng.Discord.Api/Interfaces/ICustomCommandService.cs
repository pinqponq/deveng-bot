using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ICustomCommandService
{
    Task<List<CustomCommandDto>> GetCustomCommandsAsync(string guildId);
    Task<CustomCommandDto?> GetCustomCommandByNameAsync(string guildId, string commandName);
    Task<CustomCommandDto?> GetCustomCommandByIdAsync(int id);
    Task<CustomCommandDto> CreateOrUpdateCustomCommandAsync(string guildId, CreateCustomCommandDto createDto);
    Task<CustomCommandDto?> UpdateCustomCommandAsync(int id, UpdateCustomCommandDto updateDto);
    Task<bool> DeleteCustomCommandAsync(int id);
}
