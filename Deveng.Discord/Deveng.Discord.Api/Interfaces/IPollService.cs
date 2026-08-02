using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IPollService
{
    Task<PollDto?> GetPollByIdAsync(int id);
    Task<PollDto?> GetActivePollByChannelIdAsync(string channelId);
    Task<int> GetActivePollCountByGuildIdAsync(string guildId);
    Task<List<PollDto>> GetAllPollsByGuildIdAsync(string guildId, int offset = 0, int? limit = null);
    Task<PollDto> CreatePollAsync(CreatePollDto createDto);
    Task<PollDto?> UpdatePollAsync(int id, UpdatePollDto updateDto);
    Task<bool> DeletePollAsync(int id);
    Task<bool> UpdateMessageIdAsync(int id, string messageId);
    Task<bool> EndPollAsync(int id);
    Task<bool> AddVoteAsync(int pollId, int optionId, string userId);
    Task<bool> RemoveVoteAsync(int pollId, int optionId, string userId);
    Task<PollResultDto?> GetPollResultAsync(int pollId);
    Task<List<int>> GetUserVotesForPollAsync(int pollId, string userId);
}
