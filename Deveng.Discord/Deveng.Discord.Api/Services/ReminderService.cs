using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ReminderService : IReminderService
{
    private readonly DevengDbContext _db;

    public ReminderService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<int> GetReminderCountByGuildIdAsync(string guildId) =>
        await _db.Reminders.CountAsync(r => r.GuildId == guildId);

    public async Task<List<ReminderDto>> GetRemindersByGuildIdAsync(string guildId)
    {
        var items = await _db.Reminders.AsNoTracking()
            .Where(r => r.GuildId == guildId)
            .OrderBy(r => r.RemindDate)
            .ToListAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task<List<ReminderDto>> GetRemindersByUserIdAsync(string guildId, string userId)
    {
        var items = await _db.Reminders.AsNoTracking()
            .Where(r => r.GuildId == guildId && r.UserId == userId)
            .OrderBy(r => r.RemindDate)
            .ToListAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task<List<ReminderDto>> GetPendingRemindersAsync()
    {
        var now = DateTime.UtcNow;
        var items = await _db.Reminders.AsNoTracking()
            .Where(r => !r.IsSent && r.RemindDate <= now)
            .OrderBy(r => r.RemindDate)
            .ToListAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task<List<ReminderDto>> GetPendingRemindersForGuildIdsAsync(IReadOnlyList<string> guildIds)
    {
        if (guildIds == null || guildIds.Count == 0)
            return [];

        var distinct = guildIds
            .Where(static id => !string.IsNullOrWhiteSpace(id))
            .Select(static id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (distinct.Length == 0)
            return [];

        var now = DateTime.UtcNow;
        var items = await _db.Reminders.AsNoTracking()
            .Where(r => !r.IsSent && r.RemindDate <= now && distinct.Contains(r.GuildId))
            .OrderBy(r => r.RemindDate)
            .ToListAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task<ReminderDto> CreateReminderAsync(CreateReminderDto createDto)
    {
        var now = DateTime.UtcNow;
        var reminder = new Reminder
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            UserId = createDto.UserId,
            RemindDate = createDto.RemindDate,
            IsEmbed = createDto.IsEmbed,
            Message = createDto.Message,
            EmbedTitle = createDto.EmbedTitle,
            EmbedDescription = createDto.EmbedDescription,
            EmbedColor = createDto.EmbedColor,
            EmbedThumbnail = createDto.EmbedThumbnail,
            EmbedImage = createDto.EmbedImage,
            EmbedFooter = createDto.EmbedFooter,
            EmbedTitleUrl = createDto.EmbedTitleUrl,
            EmbedAuthorName = createDto.EmbedAuthorName,
            EmbedAuthorIcon = createDto.EmbedAuthorIcon,
            EmbedAuthorUrl = createDto.EmbedAuthorUrl,
            EmbedFooterIcon = createDto.EmbedFooterIcon,
            EmbedUseTimestamp = createDto.EmbedUseTimestamp,
            EmbedFieldsJson = createDto.EmbedFieldsJson,
            IsSent = false,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync();
        return MapToDto(reminder);
    }

    public async Task<ReminderDto?> UpdateReminderAsync(int id, UpdateReminderDto updateDto)
    {
        var reminder = await _db.Reminders.FindAsync(id);
        if (reminder == null) return null;

        if (updateDto.ChannelId != null) reminder.ChannelId = updateDto.ChannelId;
        if (updateDto.RemindDate.HasValue) reminder.RemindDate = updateDto.RemindDate.Value;
        if (updateDto.IsEmbed.HasValue) reminder.IsEmbed = updateDto.IsEmbed.Value;
        if (updateDto.Message != null) reminder.Message = updateDto.Message;
        if (updateDto.EmbedTitle != null) reminder.EmbedTitle = updateDto.EmbedTitle;
        if (updateDto.EmbedDescription != null) reminder.EmbedDescription = updateDto.EmbedDescription;
        if (updateDto.EmbedColor != null) reminder.EmbedColor = updateDto.EmbedColor;
        if (updateDto.EmbedThumbnail != null) reminder.EmbedThumbnail = updateDto.EmbedThumbnail;
        if (updateDto.EmbedImage != null) reminder.EmbedImage = updateDto.EmbedImage;
        if (updateDto.EmbedFooter != null) reminder.EmbedFooter = updateDto.EmbedFooter;
        if (updateDto.EmbedTitleUrl != null) reminder.EmbedTitleUrl = updateDto.EmbedTitleUrl;
        if (updateDto.EmbedAuthorName != null) reminder.EmbedAuthorName = updateDto.EmbedAuthorName;
        if (updateDto.EmbedAuthorIcon != null) reminder.EmbedAuthorIcon = updateDto.EmbedAuthorIcon;
        if (updateDto.EmbedAuthorUrl != null) reminder.EmbedAuthorUrl = updateDto.EmbedAuthorUrl;
        if (updateDto.EmbedFooterIcon != null) reminder.EmbedFooterIcon = updateDto.EmbedFooterIcon;
        if (updateDto.EmbedUseTimestamp.HasValue) reminder.EmbedUseTimestamp = updateDto.EmbedUseTimestamp.Value;
        if (updateDto.EmbedFieldsJson != null) reminder.EmbedFieldsJson = updateDto.EmbedFieldsJson;
        reminder.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(reminder);
    }

    public async Task<bool> MarkReminderAsSentAsync(int id)
    {
        var reminder = await _db.Reminders.FindAsync(id);
        if (reminder == null) return false;

        reminder.IsSent = true;
        reminder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteReminderAsync(int id)
    {
        var reminder = await _db.Reminders.FindAsync(id);
        if (reminder == null) return false;

        _db.Reminders.Remove(reminder);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => await _db.Reminders.AnyAsync(r => r.Id == id));
    }

    public async Task<ReminderDto?> GetReminderByIdAsync(int id)
    {
        var reminder = await _db.Reminders.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        return reminder == null ? null : MapToDto(reminder);
    }

    private static ReminderDto MapToDto(Reminder r) => new()
    {
        Id = r.Id,
        GuildId = r.GuildId,
        ChannelId = r.ChannelId,
        UserId = r.UserId,
        RemindDate = r.RemindDate,
        IsEmbed = r.IsEmbed,
        Message = r.Message,
        EmbedTitle = r.EmbedTitle,
        EmbedDescription = r.EmbedDescription,
        EmbedColor = r.EmbedColor,
        EmbedThumbnail = r.EmbedThumbnail,
        EmbedImage = r.EmbedImage,
        EmbedFooter = r.EmbedFooter,
        EmbedTitleUrl = r.EmbedTitleUrl,
        EmbedAuthorName = r.EmbedAuthorName,
        EmbedAuthorIcon = r.EmbedAuthorIcon,
        EmbedAuthorUrl = r.EmbedAuthorUrl,
        EmbedFooterIcon = r.EmbedFooterIcon,
        EmbedUseTimestamp = r.EmbedUseTimestamp,
        EmbedFieldsJson = r.EmbedFieldsJson,
        IsSent = r.IsSent,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };
}
