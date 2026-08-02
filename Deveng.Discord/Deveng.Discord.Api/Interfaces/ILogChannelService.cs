using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ILogChannelService
{
    Task<LogChannelDto?> GetLogChannelByGuildIdAsync(string guildId);
    Task<List<LogChannelTypeDto>> GetLogChannelTypesByGuildIdAsync(string guildId);
    Task<LogChannelTypeDto?> GetLogChannelTypeByGuildIdAndTypeAsync(string guildId, string logType);
    Task<LogChannelDto> CreateLogChannelAsync(CreateLogChannelDto createDto);
    Task<LogChannelDto?> UpdateLogChannelAsync(string guildId, UpdateLogChannelDto updateDto);

    /// <summary>Ana log kaydını ve türlerini siler; Discord’daki ilgili kanalları bota sildirir.</summary>
    /// <param name="guildId">Sunucu ID</param>
    /// <param name="discordBotClientId">Custom bot ise X-Bot-ClientId.</param>
    Task<bool> DeleteLogChannelAsync(string guildId, string? discordBotClientId = null);

    Task<LogChannelTypeDto> CreateLogChannelTypeAsync(CreateLogChannelTypeDto createDto);
    Task<LogChannelTypeDto?> UpdateLogChannelTypeAsync(string guildId, string logType, UpdateLogChannelTypeDto updateDto);

    /// <summary>Tek log türünü siler; türün kendi kanalı varsa Discord’da sildirir.</summary>
    /// <param name="guildId">Sunucu ID</param>
    /// <param name="logType">Log türü anahtarı</param>
    /// <param name="discordBotClientId">Custom bot ise X-Bot-ClientId.</param>
    Task<bool> DeleteLogChannelTypeAsync(string guildId, string logType, string? discordBotClientId = null);
    Task<List<LogChannelDto>> GetAllLogChannelsAsync();
}
