using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class EmbedMessageService : IEmbedMessageService
{
    private const string FeatureName = "EmbedMessage";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public EmbedMessageService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<EmbedMessageDto?> GetEmbedMessageByIdAsync(int id)
    {
        var message = await _db.EmbedMessages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (message == null) return null;

        var dto = MapToDto(message);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(message.GuildId, FeatureName);
        return dto;
    }

    public async Task<EmbedMessageDto?> GetEmbedMessageByGuildIdAndNameAsync(string guildId, string name)
    {
        var message = await _db.EmbedMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.GuildId == guildId && m.Name == name);
        if (message == null) return null;

        var dto = MapToDto(message);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<List<EmbedMessageDto>> GetAllEmbedMessagesByGuildIdAsync(string guildId)
    {
        var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        var results = await _db.EmbedMessages.AsNoTracking()
            .Where(m => m.GuildId == guildId)
            .OrderBy(m => m.Name)
            .ToListAsync();

        return results.Select(m =>
        {
            var dto = MapToDto(m);
            dto.Enabled = featureEnabled;
            return dto;
        }).ToList();
    }

    public async Task<EmbedMessageDto> CreateEmbedMessageAsync(CreateEmbedMessageDto createDto)
    {
        var message = new EmbedMessage
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            Name = createDto.Name,
            IsEmbed = createDto.IsEmbed,
            Message = createDto.Message,
            EmbedTitle = createDto.EmbedTitle,
            EmbedTitleUrl = createDto.EmbedTitleUrl,
            EmbedDescription = createDto.EmbedDescription,
            EmbedColor = createDto.EmbedColor,
            EmbedAuthorName = createDto.EmbedAuthorName,
            EmbedAuthorIcon = createDto.EmbedAuthorIcon,
            EmbedAuthorUrl = createDto.EmbedAuthorUrl,
            EmbedThumbnail = createDto.EmbedThumbnail,
            EmbedImage = createDto.EmbedImage,
            EmbedFooter = createDto.EmbedFooter,
            EmbedFooterIcon = createDto.EmbedFooterIcon,
            EmbedUseTimestamp = createDto.EmbedUseTimestamp,
            EmbedFieldsJson = createDto.EmbedFieldsJson,
            Enabled = true
        };

        _db.EmbedMessages.Add(message);
        await _db.SaveChangesAsync();

        return await GetEmbedMessageByIdAsync(message.Id)
               ?? throw new Exception("Oluşturulan embed mesaj bulunamadı");
    }

    public async Task<EmbedMessageDto?> UpdateEmbedMessageAsync(int id, UpdateEmbedMessageDto updateDto)
    {
        var message = await _db.EmbedMessages.FindAsync(id);
        if (message == null) return null;

        if (updateDto.ChannelId != null) message.ChannelId = updateDto.ChannelId;
        if (updateDto.Name != null) message.Name = updateDto.Name;
        if (updateDto.IsEmbed.HasValue) message.IsEmbed = updateDto.IsEmbed.Value;
        if (updateDto.Message != null) message.Message = updateDto.Message;
        if (updateDto.EmbedTitle != null) message.EmbedTitle = updateDto.EmbedTitle;
        if (updateDto.EmbedTitleUrl != null) message.EmbedTitleUrl = updateDto.EmbedTitleUrl;
        if (updateDto.EmbedDescription != null) message.EmbedDescription = updateDto.EmbedDescription;
        if (updateDto.EmbedColor != null) message.EmbedColor = updateDto.EmbedColor;
        if (updateDto.EmbedAuthorName != null) message.EmbedAuthorName = updateDto.EmbedAuthorName;
        if (updateDto.EmbedAuthorIcon != null) message.EmbedAuthorIcon = updateDto.EmbedAuthorIcon;
        if (updateDto.EmbedAuthorUrl != null) message.EmbedAuthorUrl = updateDto.EmbedAuthorUrl;
        if (updateDto.EmbedThumbnail != null) message.EmbedThumbnail = updateDto.EmbedThumbnail;
        if (updateDto.EmbedImage != null) message.EmbedImage = updateDto.EmbedImage;
        if (updateDto.EmbedFooter != null) message.EmbedFooter = updateDto.EmbedFooter;
        if (updateDto.EmbedFooterIcon != null) message.EmbedFooterIcon = updateDto.EmbedFooterIcon;
        if (updateDto.EmbedUseTimestamp.HasValue) message.EmbedUseTimestamp = updateDto.EmbedUseTimestamp.Value;
        if (updateDto.EmbedFieldsJson != null) message.EmbedFieldsJson = updateDto.EmbedFieldsJson;

        await _db.SaveChangesAsync();
        return await GetEmbedMessageByIdAsync(id);
    }

    public async Task<bool> DeleteEmbedMessageAsync(int id)
    {
        var message = await _db.EmbedMessages.FindAsync(id);
        if (message == null) return false;

        _db.EmbedMessages.Remove(message);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task DeleteAllByGuildIdAsync(string guildId)
    {
        var messages = await _db.EmbedMessages.Where(m => m.GuildId == guildId).ToListAsync();
        _db.EmbedMessages.RemoveRange(messages);
        await _db.SaveChangesAsync();
    }

    public async Task<bool> UpdateMessageIdAsync(int id, string messageId)
    {
        var message = await _db.EmbedMessages.FindAsync(id);
        if (message == null) return false;

        message.MessageId = messageId;
        await _db.SaveChangesAsync();
        return true;
    }

    private static EmbedMessageDto MapToDto(EmbedMessage m) =>
        new()
        {
            Id = m.Id,
            GuildId = m.GuildId,
            ChannelId = m.ChannelId,
            MessageId = m.MessageId,
            Name = m.Name,
            IsEmbed = m.IsEmbed,
            Message = m.Message,
            EmbedTitle = m.EmbedTitle,
            EmbedTitleUrl = m.EmbedTitleUrl,
            EmbedDescription = m.EmbedDescription,
            EmbedColor = m.EmbedColor,
            EmbedAuthorName = m.EmbedAuthorName,
            EmbedAuthorIcon = m.EmbedAuthorIcon,
            EmbedAuthorUrl = m.EmbedAuthorUrl,
            EmbedThumbnail = m.EmbedThumbnail,
            EmbedImage = m.EmbedImage,
            EmbedFooter = m.EmbedFooter,
            EmbedFooterIcon = m.EmbedFooterIcon,
            EmbedUseTimestamp = m.EmbedUseTimestamp,
            EmbedFieldsJson = m.EmbedFieldsJson,
            Enabled = m.Enabled,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt
        };
}
