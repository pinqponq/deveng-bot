using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ICustomBotService
{
    Task<CustomBotDto?> GetCustomBotByIdAsync(int id);
    Task<CustomBotDto?> GetCustomBotByClientIdAsync(string clientId);
    Task<List<CustomBotDto>> GetCustomBotsByOwnerIdAsync(string ownerId);
    Task<List<CustomBotDto>> GetAllCustomBotsAsync();
    Task<List<CustomBotDto>> GetActiveCustomBotsAsync();
    Task<List<CustomBotInternalActiveDto>> GetActiveCustomBotsInternalAsync();
    Task<CustomBotPersonalizationInternalDto?> GetPersonalizationInternalAsync(int id);
    Task<CustomBotDto> CreateCustomBotAsync(CreateCustomBotDto createDto);
    Task<CustomBotDto?> UpdateCustomBotAsync(int id, UpdateCustomBotDto updateDto);
    Task<CustomBotDto?> UpdatePersonalizationAsync(int id, UpdateCustomBotPersonalizationDto updateDto);
    Task<CustomBotDto?> UpdateInternalStatusAsync(int id, UpdateCustomBotInternalStatusDto updateDto);
    Task<bool> DeleteCustomBotAsync(int id);
}
