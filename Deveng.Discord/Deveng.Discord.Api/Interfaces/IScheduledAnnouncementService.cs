using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IScheduledAnnouncementService
{
    Task<List<ScheduledAnnouncementDto>> GetByGuildIdAsync(string guildId);
    Task<ScheduledAnnouncementDto> UpsertAsync(string guildId, string? createdByUserId, UpsertScheduledAnnouncementDto dto);
    Task DeleteAsync(string guildId, long id);
    Task<List<ScheduledAnnouncementDto>> GetPendingAsync(int batchSize);
    Task MarkRunAsync(long announcementId, MarkScheduledAnnouncementRunDto dto);
    Task<List<ScheduledAnnouncementRunDto>> GetRunsAsync(string guildId, int take);
}
