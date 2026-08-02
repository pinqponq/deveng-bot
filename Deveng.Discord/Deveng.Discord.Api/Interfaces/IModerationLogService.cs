using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IModerationLogService
{
    Task<ModerationActionLogDto> CreateActionLogAsync(CreateModerationActionLogDto dto);
    Task<ModerationUserNoticeDto> CreateUserNoticeAsync(CreateModerationUserNoticeDto dto);
    Task<List<ModerationActionLogDto>> QueryAsync(string guildId, ModerationLogQueryDto query);
    Task<ModerationActionLogDto?> GetByIdAsync(string guildId, long id);
}
