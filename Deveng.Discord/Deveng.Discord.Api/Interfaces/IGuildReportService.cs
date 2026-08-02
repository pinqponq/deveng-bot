using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGuildReportService
{
    Task<GuildReportJobDto> CreateAsync(string guildId, string? createdByUserId, string reportRange);
    Task<List<GuildReportJobDto>> GetByGuildIdAsync(string guildId, int take);
    Task<List<GuildReportJobDto>> GetPendingAsync(int batchSize);
    Task CompleteAsync(long id, CompleteGuildReportJobDto dto);
    Task<GuildReportNotifyDto?> GetNotifyAsync(string guildId);
    Task<GuildReportNotifyDto> UpsertNotifyAsync(string guildId, UpsertGuildReportNotifyDto dto);
    Task<GuildReportJobDto?> GetByIdAsync(long id);
    Task<GuildReportJobDto?> GetByGuildAndIdAsync(string guildId, long id);
    Task UpdateEmailDeliveryAsync(long id, string? emailTo, DateTime sentAt, string status, string? error);
}
