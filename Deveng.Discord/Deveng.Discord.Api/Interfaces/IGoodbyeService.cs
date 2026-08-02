using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGoodbyeService
{
    Task<GoodbyeDto?> GetGoodbyeByGuildIdAsync(string guildId, string language = "tr");
    Task<GoodbyeDto> CreateGoodbyeAsync(CreateGoodbyeDto createDto);
    Task<GoodbyeDto?> UpdateGoodbyeAsync(string guildId, UpdateGoodbyeDto updateDto);
    Task<bool> DeleteGoodbyeAsync(string guildId);
    Task<List<GoodbyeDto>> GetAllGoodbyesAsync();
}
