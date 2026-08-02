using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IFeedAnnouncementService
{
    Task<List<FeedSubscriptionDto>> GetByGuildIdAsync(string guildId);
    Task<FeedSubscriptionDto?> GetByIdAsync(long id);
    Task<FeedSubscriptionDto> UpsertAsync(string guildId, UpsertFeedSubscriptionDto dto);
    Task DeleteAsync(string guildId, long id);
    Task<List<FeedDeliveryDto>> GetDeliveriesAsync(string guildId, int take);
    Task<List<FeedSubscriptionDto>> GetDueAsync(int batchSize);
    Task RecordDeliveryAsync(long subscriptionId, RecordFeedDeliveryDto dto);
    Task RecordErrorAsync(long subscriptionId);
    Task<FeedPreviewDto> PreviewAsync(string url);
}
