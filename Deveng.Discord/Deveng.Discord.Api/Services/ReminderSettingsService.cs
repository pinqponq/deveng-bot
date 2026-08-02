using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ReminderSettingsService : IReminderSettingsService
{
    private const string CreateSlot = "Create";
    private const string SendSlot = "Send";
    private readonly DevengDbContext _db;

    public ReminderSettingsService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<ReminderSettingsDto?> GetReminderSettingsByGuildIdAsync(string guildId)
    {
        var settings = await _db.ReminderSettings.AsNoTracking()
            .Include(s => s.EmbedSettings)
            .FirstOrDefaultAsync(s => s.GuildId == guildId);
        return settings == null ? null : MapToDto(settings);
    }

    public async Task<ReminderSettingsDto> CreateOrUpdateReminderSettingsAsync(string guildId,
        CreateOrUpdateReminderSettingsDto dto)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var settings = await _db.ReminderSettings
            .Include(s => s.EmbedSettings)
            .FirstOrDefaultAsync(s => s.GuildId == guildId);

        var now = DateTime.UtcNow;
        if (settings == null)
        {
            settings = new ReminderSettings
            {
                GuildId = guildId,
                DefaultIsEmbed = dto.DefaultIsEmbed,
                CreatedAt = now,
                UpdatedAt = now
            };
            _db.ReminderSettings.Add(settings);
            await _db.SaveChangesAsync();
        }
        else
        {
            settings.DefaultIsEmbed = dto.DefaultIsEmbed;
            settings.UpdatedAt = now;
        }

        UpsertEmbedSlot(settings, CreateSlot, dto.CreateMessageIsEmbed, dto.CreateMessage,
            dto.CreateEmbedTitle, dto.CreateEmbedDescription, dto.CreateEmbedColor,
            dto.CreateEmbedThumbnail, dto.CreateEmbedImage, dto.CreateEmbedFooter,
            dto.CreateEmbedTitleUrl, dto.CreateEmbedAuthorName, dto.CreateEmbedAuthorIcon,
            dto.CreateEmbedAuthorUrl, dto.CreateEmbedFooterIcon, dto.CreateEmbedUseTimestamp,
            dto.CreateEmbedFieldsJson, now);

        UpsertEmbedSlot(settings, SendSlot, dto.SendMessageIsEmbed, dto.SendMessage,
            dto.SendEmbedTitle, dto.SendEmbedDescription, dto.SendEmbedColor,
            dto.SendEmbedThumbnail, dto.SendEmbedImage, dto.SendEmbedFooter,
            dto.SendEmbedTitleUrl, dto.SendEmbedAuthorName, dto.SendEmbedAuthorIcon,
            dto.SendEmbedAuthorUrl, dto.SendEmbedFooterIcon, dto.SendEmbedUseTimestamp,
            dto.SendEmbedFieldsJson, now);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return MapToDto(settings);
    }

    private static void UpsertEmbedSlot(
        ReminderSettings settings,
        string slot,
        bool isEmbed,
        string? message,
        string? embedTitle,
        string? embedDescription,
        string? embedColor,
        string? embedThumbnail,
        string? embedImage,
        string? embedFooter,
        string? embedTitleUrl,
        string? embedAuthorName,
        string? embedAuthorIcon,
        string? embedAuthorUrl,
        string? embedFooterIcon,
        bool embedUseTimestamp,
        string? embedFieldsJson,
        DateTime now)
    {
        var embed = settings.EmbedSettings.FirstOrDefault(e => e.Slot == slot);
        if (embed == null)
        {
            embed = new ReminderEmbedSetting { Slot = slot, CreatedAt = now };
            settings.EmbedSettings.Add(embed);
        }

        embed.IsEmbed = isEmbed;
        embed.Message = message;
        embed.EmbedTitle = embedTitle;
        embed.EmbedDescription = embedDescription;
        embed.EmbedColor = embedColor;
        embed.EmbedThumbnail = embedThumbnail;
        embed.EmbedImage = embedImage;
        embed.EmbedFooter = embedFooter;
        embed.EmbedTitleUrl = embedTitleUrl;
        embed.EmbedAuthorName = embedAuthorName;
        embed.EmbedAuthorIcon = embedAuthorIcon;
        embed.EmbedAuthorUrl = embedAuthorUrl;
        embed.EmbedFooterIcon = embedFooterIcon;
        embed.EmbedUseTimestamp = embedUseTimestamp;
        embed.EmbedFieldsJson = embedFieldsJson;
        embed.UpdatedAt = now;
    }

    private static ReminderSettingsDto MapToDto(ReminderSettings s)
    {
        var create = s.EmbedSettings.FirstOrDefault(e => e.Slot == CreateSlot);
        var send = s.EmbedSettings.FirstOrDefault(e => e.Slot == SendSlot);

        return new ReminderSettingsDto
        {
            Id = s.Id,
            GuildId = s.GuildId,
            CreateMessageIsEmbed = create?.IsEmbed ?? s.CreateMessageIsEmbed,
            CreateMessage = create?.Message ?? s.CreateMessage,
            CreateEmbedTitle = create?.EmbedTitle ?? s.CreateEmbedTitle,
            CreateEmbedDescription = create?.EmbedDescription ?? s.CreateEmbedDescription,
            CreateEmbedColor = create?.EmbedColor ?? s.CreateEmbedColor,
            CreateEmbedThumbnail = create?.EmbedThumbnail ?? s.CreateEmbedThumbnail,
            CreateEmbedImage = create?.EmbedImage ?? s.CreateEmbedImage,
            CreateEmbedFooter = create?.EmbedFooter ?? s.CreateEmbedFooter,
            CreateEmbedTitleUrl = create?.EmbedTitleUrl ?? s.CreateEmbedTitleUrl,
            CreateEmbedAuthorName = create?.EmbedAuthorName ?? s.CreateEmbedAuthorName,
            CreateEmbedAuthorIcon = create?.EmbedAuthorIcon ?? s.CreateEmbedAuthorIcon,
            CreateEmbedAuthorUrl = create?.EmbedAuthorUrl ?? s.CreateEmbedAuthorUrl,
            CreateEmbedFooterIcon = create?.EmbedFooterIcon ?? s.CreateEmbedFooterIcon,
            CreateEmbedUseTimestamp = create?.EmbedUseTimestamp ?? s.CreateEmbedUseTimestamp,
            CreateEmbedFieldsJson = create?.EmbedFieldsJson ?? s.CreateEmbedFieldsJson,
            DefaultIsEmbed = s.DefaultIsEmbed,
            SendMessageIsEmbed = send?.IsEmbed ?? s.SendMessageIsEmbed,
            SendMessage = send?.Message ?? s.SendMessage,
            SendEmbedTitle = send?.EmbedTitle ?? s.SendEmbedTitle,
            SendEmbedDescription = send?.EmbedDescription ?? s.SendEmbedDescription,
            SendEmbedColor = send?.EmbedColor ?? s.SendEmbedColor,
            SendEmbedThumbnail = send?.EmbedThumbnail ?? s.SendEmbedThumbnail,
            SendEmbedImage = send?.EmbedImage ?? s.SendEmbedImage,
            SendEmbedFooter = send?.EmbedFooter ?? s.SendEmbedFooter,
            SendEmbedTitleUrl = send?.EmbedTitleUrl ?? s.SendEmbedTitleUrl,
            SendEmbedAuthorName = send?.EmbedAuthorName ?? s.SendEmbedAuthorName,
            SendEmbedAuthorIcon = send?.EmbedAuthorIcon ?? s.SendEmbedAuthorIcon,
            SendEmbedAuthorUrl = send?.EmbedAuthorUrl ?? s.SendEmbedAuthorUrl,
            SendEmbedFooterIcon = send?.EmbedFooterIcon ?? s.SendEmbedFooterIcon,
            SendEmbedUseTimestamp = send?.EmbedUseTimestamp ?? s.SendEmbedUseTimestamp,
            SendEmbedFieldsJson = send?.EmbedFieldsJson ?? s.SendEmbedFieldsJson,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        };
    }
}
