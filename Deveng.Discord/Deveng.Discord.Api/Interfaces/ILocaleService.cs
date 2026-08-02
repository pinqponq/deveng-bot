using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ILocaleService
{
    Task<GuildLocaleDto?> GetAsync(string guildId);
    Task<GuildLocaleDto> UpsertAsync(string guildId, UpsertGuildLocaleDto dto);
}
