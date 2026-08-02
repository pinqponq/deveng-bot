using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IReminderSettingsService
{
    Task<ReminderSettingsDto?> GetReminderSettingsByGuildIdAsync(string guildId);

    Task<ReminderSettingsDto>
        CreateOrUpdateReminderSettingsAsync(string guildId, CreateOrUpdateReminderSettingsDto dto);
}
