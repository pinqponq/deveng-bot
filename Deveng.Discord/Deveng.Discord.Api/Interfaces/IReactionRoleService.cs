using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IReactionRoleService
{
    Task<List<ReactionRoleDto>> GetReactionRolesByGuildIdAsync(string guildId);
    Task<ReactionRoleDto?> GetReactionRoleByIdAsync(int id);
    Task<ReactionRoleDto> CreateReactionRoleAsync(CreateReactionRoleDto createDto);
    Task<ReactionRoleDto?> UpdateReactionRoleAsync(string guildId, int id, CreateReactionRoleDto updateDto);
    Task<bool> DeleteReactionRoleAsync(string guildId, int id);
    Task<List<ReactionRoleDto>> GetAllReactionRolesAsync();
}
