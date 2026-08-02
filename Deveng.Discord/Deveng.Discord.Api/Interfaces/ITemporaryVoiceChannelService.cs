using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface ITemporaryVoiceChannelService
{
    Task<TemporaryVoiceChannelLobbyDto?> GetLobbyByIdAsync(int id);
    Task<List<TemporaryVoiceChannelLobbyDto>> GetLobbiesByGuildIdAsync(string guildId);
    Task<TemporaryVoiceChannelLobbyDto> CreateLobbyAsync(CreateTemporaryVoiceChannelLobbyDto createDto);
    Task<TemporaryVoiceChannelLobbyDto?> UpdateLobbyAsync(int id, CreateTemporaryVoiceChannelLobbyDto updateDto);
    Task<bool> DeleteLobbyAsync(int id);
    Task<List<TemporaryVoiceChannelLobbyDto>> GetAllLobbiesAsync();

    Task<TemporaryVoiceChannelDto?> GetTemporaryVoiceChannelByChannelIdAsync(string channelId);
    Task<TemporaryVoiceChannelDto> CreateTemporaryVoiceChannelAsync(CreateTemporaryVoiceChannelDto createDto);
    Task<TemporaryVoiceChannelDto?> UpdateTemporaryVoiceChannelOwnerAsync(string channelId, string ownerId);
    Task<bool> DeleteTemporaryVoiceChannelAsync(string channelId);
}
