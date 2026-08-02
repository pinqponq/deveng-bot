using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGuildService
{
    Task<GuildDto?> GetGuildByGuildIdAsync(string guildId);
    Task<GuildDto> CreateGuildAsync(CreateGuildDto createDto);
    Task<GuildDto?> UpdateGuildAsync(string guildId, UpdateGuildDto updateDto);
    Task<bool> DeleteGuildAsync(string guildId);
    Task<List<GuildDto>> GetAllGuildsAsync();

    /// <summary>OAuth kullanıcının Discord üye olduğu guild Id kümesine göre DB tarafında filtrelenmiş kayıtlar.</summary>
    Task<List<GuildDto>> GetGuildsForDiscordUserGuildIdsAsync(IReadOnlyCollection<string> discordGuildIds);
}
