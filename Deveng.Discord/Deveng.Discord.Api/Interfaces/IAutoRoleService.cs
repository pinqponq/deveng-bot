using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IAutoRoleService
{
    Task<AutoRoleDto?> GetByGuildIdAsync(string guildId);
    Task<AutoRoleDto> UpsertAsync(string guildId, UpsertAutoRoleDto dto);
    Task InsertAuditAsync(AutoRoleAuditDto dto);
    Task<List<AutoRoleAuditLogDto>> GetAuditAsync(string guildId, int take);
}
