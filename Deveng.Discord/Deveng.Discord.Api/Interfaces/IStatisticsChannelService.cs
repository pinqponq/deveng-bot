using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IStatisticsChannelService
{
    Task<StatisticsChannelDto?> GetStatisticsChannelByGuildIdAsync(string guildId);
    Task<StatisticsChannelDto?> GetStatisticsChannelByGuildIdAndTypeAsync(string guildId, string counterType);
    Task<StatisticsChannelDto?> GetStatisticsChannelByIdAsync(int id);
    Task<List<StatisticsChannelDto>> GetAllStatisticsChannelsAsync();
    Task<List<StatisticsChannelDto>> GetEnabledStatisticsChannelsByGuildIdAsync(string guildId);
    Task<StatisticsChannelDto> CreateStatisticsChannelAsync(CreateStatisticsChannelDto createDto);
    Task<StatisticsChannelDto?> UpdateStatisticsChannelAsync(int id, UpdateStatisticsChannelDto updateDto);
    Task<bool> DeleteStatisticsChannelAsync(int id);

    /// <summary>
    ///     "Rekor Çevrimiçi" sayacı için anlık online değerini kalıcı tepe ile karşılaştırır
    ///     ve sonuçtaki tepe değerini (max) döndürür.
    /// </summary>
    Task<int> UpdateAndGetPeakOnlineAsync(string guildId, string counterType, int currentOnline);
}
