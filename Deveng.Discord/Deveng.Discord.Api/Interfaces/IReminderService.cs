using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IReminderService
{
    Task<int> GetReminderCountByGuildIdAsync(string guildId);
    Task<List<ReminderDto>> GetRemindersByGuildIdAsync(string guildId);
    Task<List<ReminderDto>> GetRemindersByUserIdAsync(string guildId, string userId);
    Task<List<ReminderDto>> GetPendingRemindersAsync();
    /// <summary>İş yükünü azaltmak için yalnızca verilen guild Id listesi (Discord üyesinin sunucuları) üzerinde bekleyen hatırlatıcıları döner.</summary>
    Task<List<ReminderDto>> GetPendingRemindersForGuildIdsAsync(IReadOnlyList<string> guildIds);
    Task<ReminderDto> CreateReminderAsync(CreateReminderDto createDto);
    Task<ReminderDto?> UpdateReminderAsync(int id, UpdateReminderDto updateDto);
    Task<bool> MarkReminderAsSentAsync(int id);
    Task<bool> DeleteReminderAsync(int id);
    Task<ReminderDto?> GetReminderByIdAsync(int id);
}
