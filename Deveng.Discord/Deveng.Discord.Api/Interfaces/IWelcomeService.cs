using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IWelcomeService
{
    Task<WelcomeDto?> GetWelcomeByGuildIdAsync(string guildId, string language = "tr");
    Task<WelcomeDto> CreateWelcomeAsync(CreateWelcomeDto createDto);
    Task<WelcomeDto?> UpdateWelcomeAsync(string guildId, UpdateWelcomeDto updateDto);
    Task<bool> DeleteWelcomeAsync(string guildId);
    Task<List<WelcomeDto>> GetAllWelcomesAsync();
}
