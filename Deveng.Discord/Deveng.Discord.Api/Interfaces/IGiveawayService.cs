using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGiveawayService
{
    Task<GiveawayDto?> GetGiveawayByIdAsync(int id);
    Task<GiveawayDto?> GetGiveawayByMessageIdAsync(string messageId);
    Task<List<GiveawayDto>> GetGiveawaysByGuildIdAsync(string guildId);
    Task<List<GiveawayDto>> GetActiveGiveawaysAsync();
    Task<GiveawayDto> CreateGiveawayAsync(CreateGiveawayDto createDto);
    Task<GiveawayDto?> UpdateGiveawayAsync(int id, UpdateGiveawayDto updateDto);
    Task<bool> DeleteGiveawayAsync(int id);
    Task<bool> UpdateMessageIdAsync(int id, string messageId);
    Task<bool> EndGiveawayAsync(int id);
    Task<bool> AddParticipantAsync(int giveawayId, string userId);
    Task<bool> RemoveParticipantAsync(int giveawayId, string userId);
    Task<List<GiveawayParticipantDto>> GetParticipantsAsync(int giveawayId);
    Task<bool> AddWinnerAsync(int giveawayId, string userId);
    Task<List<GiveawayWinnerDto>> GetWinnersAsync(int giveawayId);
    Task<bool> AddRoleAsync(int giveawayId, string roleId, decimal winChanceMultiplier);
    Task<bool> RemoveRoleAsync(int giveawayId, string roleId);
    Task<List<GiveawayRoleDto>> GetRolesAsync(int giveawayId);
    Task<bool> AddAllowedRoleAsync(int giveawayId, string roleId);
    Task<bool> RemoveAllowedRoleAsync(int giveawayId, string roleId);
    Task<List<GiveawayAllowedRoleDto>> GetAllowedRolesAsync(int giveawayId);
}
