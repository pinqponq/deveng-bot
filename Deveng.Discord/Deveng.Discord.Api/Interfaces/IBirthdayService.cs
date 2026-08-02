using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IBirthdayService
{
    Task<BirthdaySettingsDto?> GetBirthdaySettingsByGuildIdAsync(string guildId);
    Task<BirthdaySettingsDto> CreateOrUpdateBirthdaySettingsAsync(string guildId, CreateBirthdaySettingsDto createDto);
    Task<BirthdaySettingsDto?> UpdateBirthdaySettingsAsync(string guildId, UpdateBirthdaySettingsDto updateDto);
    Task<bool> DeleteBirthdaySettingsAsync(string guildId);
    Task<List<BirthdayUserDto>> GetBirthdayUsersByGuildIdAsync(string guildId);
    Task<List<BirthdayUserDto>> GetBirthdayUsersByDateAsync(int month, int day);
    Task<BirthdayUserDto> CreateOrUpdateBirthdayUserAsync(string guildId, CreateBirthdayUserDto createDto);
    Task<BirthdayUserDto?> UpdateBirthdayUserAsync(int id, UpdateBirthdayUserDto updateDto);
    Task<bool> DeleteBirthdayUserAsync(string guildId, string userId);
    Task MarkBirthdayUserCelebratedAsync(string guildId, string userId);
    Task<BirthdayUserDto?> GetBirthdayUserByIdAsync(int id);
}
