using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IInviteLeaderboardService
{
    Task<List<GuildInviteSnapshotDto>> GetSnapshotsAsync(string guildId);
    Task UpsertSnapshotAsync(string guildId, UpsertGuildInviteSnapshotDto dto);
    Task RecordContributionAsync(string guildId, RecordGuildInviteContributionDto dto);
    Task<List<GuildInviteLeaderboardEntryDto>> GetLeaderboardAsync(string guildId, string periodKey, int limit);
    Task<List<GuildInviteContributionDto>> GetContributionsAsync(string guildId, int limit);
}
