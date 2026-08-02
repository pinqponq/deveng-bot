using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ITicketPanelService
{
    Task<TicketPanelDto?> GetTicketPanelByGuildIdAsync(string guildId);
    Task<TicketPanelDto> CreateTicketPanelAsync(CreateTicketPanelDto createDto);
    Task<TicketPanelDto?> UpdateTicketPanelAsync(string guildId, CreateTicketPanelDto updateDto);
    Task<bool> DeleteTicketPanelAsync(string guildId);
    Task<List<TicketPanelDto>> GetAllTicketPanelsAsync();
}
