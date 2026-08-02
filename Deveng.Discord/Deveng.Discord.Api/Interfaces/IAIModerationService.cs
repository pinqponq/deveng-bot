using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IAIModerationService
{
    Task<AIModerationSettingDto?> GetSettingsAsync(string guildId);
    Task<AIModerationSettingDto> UpsertSettingsAsync(string guildId, UpsertAIModerationSettingDto dto);
    Task<List<AIModerationPolicyDto>> GetPoliciesAsync(string guildId);
    Task<AIModerationPolicyDto> UpsertPolicyAsync(string guildId, UpsertAIModerationPolicyDto dto);
    Task<long> EnqueueAsync(CreateAIModerationQueueDto dto);
    Task<List<AIModerationReviewDto>> GetReviewsAsync(string guildId, int limit = 100);
    Task<bool> SetReviewDecisionAsync(string guildId, long reviewId, string decision);
    Task<List<AIModerationQueueItemDto>> GetPendingQueueAsync(int batchSize);
    Task CompleteQueueWithReviewAsync(long queueId, CompleteAIModerationQueueWorkerDto dto);
    Task FailQueueItemAsync(long queueId, string errorCode);
}
