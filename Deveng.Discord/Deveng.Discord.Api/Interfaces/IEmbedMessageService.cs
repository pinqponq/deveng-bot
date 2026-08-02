using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IEmbedMessageService
{
    Task<EmbedMessageDto?> GetEmbedMessageByIdAsync(int id);
    Task<EmbedMessageDto?> GetEmbedMessageByGuildIdAndNameAsync(string guildId, string name);
    Task<List<EmbedMessageDto>> GetAllEmbedMessagesByGuildIdAsync(string guildId);
    Task<EmbedMessageDto> CreateEmbedMessageAsync(CreateEmbedMessageDto createDto);
    Task<EmbedMessageDto?> UpdateEmbedMessageAsync(int id, UpdateEmbedMessageDto updateDto);
    Task<bool> DeleteEmbedMessageAsync(int id);
    Task DeleteAllByGuildIdAsync(string guildId);
    Task<bool> UpdateMessageIdAsync(int id, string messageId);
}
