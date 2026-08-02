using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class GoodbyeService : IGoodbyeService
{
    private const string FeatureName = "Goodbye";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public GoodbyeService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<GoodbyeDto?> GetGoodbyeByGuildIdAsync(string guildId, string language = "tr")
    {
        var goodbye = await GoodbyeQuery().FirstOrDefaultAsync(g => g.GuildId == guildId && g.Language == language);
        if (goodbye == null) return null;

        var dto = MapToDto(goodbye);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<GoodbyeDto> CreateGoodbyeAsync(CreateGoodbyeDto createDto)
    {
        var language = createDto.Language ?? "tr";
        var goodbye = new Goodbye
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            Message = createDto.Message,
            Language = language,
            EmbedSettings = new GoodbyeEmbedSettings
            {
                IsEmbed = createDto.EmbedSettings?.IsEmbed ?? false,
                EmbedTitle = createDto.EmbedSettings?.EmbedTitle,
                EmbedColor = createDto.EmbedSettings?.EmbedColor,
                EmbedThumbnail = createDto.EmbedSettings?.EmbedThumbnail,
                EmbedImage = createDto.EmbedSettings?.EmbedImage,
                EmbedFooter = createDto.EmbedSettings?.EmbedFooter,
                EmbedTitleUrl = createDto.EmbedSettings?.EmbedTitleUrl,
                EmbedAuthorName = createDto.EmbedSettings?.EmbedAuthorName,
                EmbedAuthorIcon = createDto.EmbedSettings?.EmbedAuthorIcon,
                EmbedAuthorUrl = createDto.EmbedSettings?.EmbedAuthorUrl,
                EmbedFooterIcon = createDto.EmbedSettings?.EmbedFooterIcon,
                EmbedUseTimestamp = createDto.EmbedSettings?.EmbedUseTimestamp ?? true,
                EmbedFieldsJson = createDto.EmbedSettings?.EmbedFieldsJson
            }
        };

        _db.Goodbyes.Add(goodbye);
        await _db.SaveChangesAsync();

        return await GetGoodbyeByGuildIdAsync(createDto.GuildId, language)
               ?? throw new Exception("Goodbye kaydı oluşturulamadı");
    }

    public async Task<GoodbyeDto?> UpdateGoodbyeAsync(string guildId, UpdateGoodbyeDto updateDto)
    {
        var language = updateDto.Language ?? "tr";
        var goodbye = await _db.Goodbyes
            .Include(g => g.EmbedSettings)
            .FirstOrDefaultAsync(g => g.GuildId == guildId && g.Language == language);

        if (goodbye == null) return null;

        if (updateDto.ChannelId != null) goodbye.ChannelId = updateDto.ChannelId;
        if (updateDto.Message != null) goodbye.Message = updateDto.Message;
        if (updateDto.Language != null) goodbye.Language = updateDto.Language;

        if (updateDto.EmbedSettings != null)
        {
            goodbye.EmbedSettings ??= new GoodbyeEmbedSettings();
            goodbye.EmbedSettings.IsEmbed = updateDto.EmbedSettings.IsEmbed;
            if (updateDto.EmbedSettings.EmbedTitle != null) goodbye.EmbedSettings.EmbedTitle = updateDto.EmbedSettings.EmbedTitle;
            if (updateDto.EmbedSettings.EmbedColor != null) goodbye.EmbedSettings.EmbedColor = updateDto.EmbedSettings.EmbedColor;
            if (updateDto.EmbedSettings.EmbedThumbnail != null) goodbye.EmbedSettings.EmbedThumbnail = updateDto.EmbedSettings.EmbedThumbnail;
            if (updateDto.EmbedSettings.EmbedImage != null) goodbye.EmbedSettings.EmbedImage = updateDto.EmbedSettings.EmbedImage;
            if (updateDto.EmbedSettings.EmbedFooter != null) goodbye.EmbedSettings.EmbedFooter = updateDto.EmbedSettings.EmbedFooter;
            if (updateDto.EmbedSettings.EmbedTitleUrl != null) goodbye.EmbedSettings.EmbedTitleUrl = updateDto.EmbedSettings.EmbedTitleUrl;
            if (updateDto.EmbedSettings.EmbedAuthorName != null) goodbye.EmbedSettings.EmbedAuthorName = updateDto.EmbedSettings.EmbedAuthorName;
            if (updateDto.EmbedSettings.EmbedAuthorIcon != null) goodbye.EmbedSettings.EmbedAuthorIcon = updateDto.EmbedSettings.EmbedAuthorIcon;
            if (updateDto.EmbedSettings.EmbedAuthorUrl != null) goodbye.EmbedSettings.EmbedAuthorUrl = updateDto.EmbedSettings.EmbedAuthorUrl;
            if (updateDto.EmbedSettings.EmbedFooterIcon != null) goodbye.EmbedSettings.EmbedFooterIcon = updateDto.EmbedSettings.EmbedFooterIcon;
            goodbye.EmbedSettings.EmbedUseTimestamp = updateDto.EmbedSettings.EmbedUseTimestamp;
            if (updateDto.EmbedSettings.EmbedFieldsJson != null) goodbye.EmbedSettings.EmbedFieldsJson = updateDto.EmbedSettings.EmbedFieldsJson;
        }

        await _db.SaveChangesAsync();
        return await GetGoodbyeByGuildIdAsync(guildId, language);
    }

    public async Task<bool> DeleteGoodbyeAsync(string guildId)
    {
        var goodbye = await _db.Goodbyes.FirstOrDefaultAsync(g => g.GuildId == guildId);
        if (goodbye == null) return false;

        _db.Goodbyes.Remove(goodbye);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<GoodbyeDto>> GetAllGoodbyesAsync()
    {
        var goodbyes = await GoodbyeQuery().ToListAsync();
        return goodbyes.Select(MapToDto).ToList();
    }

    private IQueryable<Goodbye> GoodbyeQuery() =>
        _db.Goodbyes.AsNoTracking().Include(g => g.EmbedSettings);

    private static GoodbyeDto MapToDto(Goodbye g)
    {
        var embed = g.EmbedSettings;
        return new GoodbyeDto
        {
            Id = g.Id,
            GuildId = g.GuildId,
            ChannelId = g.ChannelId,
            Message = g.Message,
            Language = g.Language,
            Enabled = false,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt,
            IsEmbed = embed?.IsEmbed ?? false,
            EmbedTitle = embed?.EmbedTitle,
            EmbedColor = embed?.EmbedColor,
            EmbedThumbnail = embed?.EmbedThumbnail,
            EmbedImage = embed?.EmbedImage,
            EmbedFooter = embed?.EmbedFooter,
            EmbedTitleUrl = embed?.EmbedTitleUrl,
            EmbedAuthorName = embed?.EmbedAuthorName,
            EmbedAuthorIcon = embed?.EmbedAuthorIcon,
            EmbedAuthorUrl = embed?.EmbedAuthorUrl,
            EmbedFooterIcon = embed?.EmbedFooterIcon,
            EmbedUseTimestamp = embed?.EmbedUseTimestamp ?? true,
            EmbedFieldsJson = embed?.EmbedFieldsJson
        };
    }
}
