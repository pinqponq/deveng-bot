using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IPanelAuditLogService
{
    Task<PanelAuditLogDto> CreateAsync(CreatePanelAuditLogDto dto);
    Task<List<PanelAuditLogDto>> QueryAsync(string guildId, PanelAuditLogQueryDto query);
}
