using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class BirthdayService : IBirthdayService
{
    private const string FeatureName = "Birthday";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public BirthdayService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<BirthdaySettingsDto?> GetBirthdaySettingsByGuildIdAsync(string guildId)
    {
        var settings = await _db.BirthdaySettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (settings == null) return null;

        var dto = MapToSettingsDto(settings);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<BirthdaySettingsDto> CreateOrUpdateBirthdaySettingsAsync(string guildId,
        CreateBirthdaySettingsDto createDto)
    {
        var settings = await _db.BirthdaySettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (settings == null)
        {
            settings = new BirthdaySettings { GuildId = guildId };
            _db.BirthdaySettings.Add(settings);
        }

        ApplySettingsFromCreate(settings, createDto);
        await _db.SaveChangesAsync();

        return await GetBirthdaySettingsByGuildIdAsync(guildId)
               ?? throw new Exception("Birthday settings oluşturulamadı");
    }

    public async Task<BirthdaySettingsDto?> UpdateBirthdaySettingsAsync(string guildId,
        UpdateBirthdaySettingsDto updateDto)
    {
        var settings = await _db.BirthdaySettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (settings == null) return null;

        ApplySettingsFromUpdate(settings, updateDto);
        await _db.SaveChangesAsync();
        return await GetBirthdaySettingsByGuildIdAsync(guildId);
    }

    public async Task<bool> DeleteBirthdaySettingsAsync(string guildId)
    {
        var settings = await _db.BirthdaySettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (settings == null) return false;

        _db.BirthdaySettings.Remove(settings);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<BirthdayUserDto>> GetBirthdayUsersByGuildIdAsync(string guildId)
    {
        var users = await _db.BirthdayUsers.AsNoTracking()
            .Where(u => u.GuildId == guildId)
            .OrderBy(u => u.UserId)
            .ToListAsync();
        return users.Select(MapToUserDto).ToList();
    }

    public async Task<List<BirthdayUserDto>> GetBirthdayUsersByDateAsync(int month, int day)
    {
        var users = await _db.BirthdayUsers.AsNoTracking()
            .Where(u => u.BirthDate.Month == month && u.BirthDate.Day == day)
            .ToListAsync();
        return users.Select(MapToUserDto).ToList();
    }

    public async Task<BirthdayUserDto> CreateOrUpdateBirthdayUserAsync(string guildId, CreateBirthdayUserDto createDto)
    {
        var user = await _db.BirthdayUsers
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == createDto.UserId);

        if (user == null)
        {
            user = new BirthdayUser
            {
                GuildId = guildId,
                UserId = createDto.UserId
            };
            _db.BirthdayUsers.Add(user);
        }

        user.BirthDate = DateOnly.FromDateTime(createDto.BirthDate);
        await _db.SaveChangesAsync();

        return MapToUserDto(user);
    }

    public async Task<BirthdayUserDto?> UpdateBirthdayUserAsync(int id, UpdateBirthdayUserDto updateDto)
    {
        var user = await _db.BirthdayUsers.FindAsync(id);
        if (user == null) return null;

        user.BirthDate = DateOnly.FromDateTime(updateDto.BirthDate);
        await _db.SaveChangesAsync();
        return MapToUserDto(user);
    }

    public async Task<bool> DeleteBirthdayUserAsync(string guildId, string userId)
    {
        var user = await _db.BirthdayUsers
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == userId);
        if (user == null) return false;

        _db.BirthdayUsers.Remove(user);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task MarkBirthdayUserCelebratedAsync(string guildId, string userId)
    {
        var user = await _db.BirthdayUsers
            .FirstOrDefaultAsync(u => u.GuildId == guildId && u.UserId == userId);
        if (user == null) return;

        user.LastCelebratedYear = DateTime.UtcNow.Year;
        await _db.SaveChangesAsync();
    }

    public async Task<BirthdayUserDto?> GetBirthdayUserByIdAsync(int id)
    {
        var user = await _db.BirthdayUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user == null ? null : MapToUserDto(user);
    }

    private static BirthdaySettingsDto MapToSettingsDto(BirthdaySettings s) =>
        new()
        {
            Id = s.Id,
            GuildId = s.GuildId,
            ChannelId = s.ChannelId,
            RoleId = s.RoleId,
            IsEmbed = s.IsEmbed,
            Message = s.Message,
            EmbedTitle = s.EmbedTitle,
            EmbedDescription = s.EmbedDescription,
            EmbedColor = s.EmbedColor,
            EmbedThumbnail = s.EmbedThumbnail,
            EmbedImage = s.EmbedImage,
            EmbedFooter = s.EmbedFooter,
            EmbedTitleUrl = s.EmbedTitleUrl,
            EmbedAuthorName = s.EmbedAuthorName,
            EmbedAuthorIcon = s.EmbedAuthorIcon,
            EmbedAuthorUrl = s.EmbedAuthorUrl,
            EmbedFooterIcon = s.EmbedFooterIcon,
            EmbedUseTimestamp = s.EmbedUseTimestamp,
            EmbedFieldsJson = s.EmbedFieldsJson,
            Enabled = false,
            CheckHour = s.CheckHour,
            CreateMessageIsEmbed = s.CreateMessageIsEmbed,
            CreateMessage = s.CreateMessage,
            CreateEmbedTitle = s.CreateEmbedTitle,
            CreateEmbedDescription = s.CreateEmbedDescription,
            CreateEmbedColor = s.CreateEmbedColor,
            CreateEmbedThumbnail = s.CreateEmbedThumbnail,
            CreateEmbedImage = s.CreateEmbedImage,
            CreateEmbedFooter = s.CreateEmbedFooter,
            CreateEmbedTitleUrl = s.CreateEmbedTitleUrl,
            CreateEmbedAuthorName = s.CreateEmbedAuthorName,
            CreateEmbedAuthorIcon = s.CreateEmbedAuthorIcon,
            CreateEmbedAuthorUrl = s.CreateEmbedAuthorUrl,
            CreateEmbedFooterIcon = s.CreateEmbedFooterIcon,
            CreateEmbedUseTimestamp = s.CreateEmbedUseTimestamp,
            CreateEmbedFieldsJson = s.CreateEmbedFieldsJson,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        };

    private static BirthdayUserDto MapToUserDto(BirthdayUser u) =>
        new()
        {
            Id = u.Id,
            GuildId = u.GuildId,
            UserId = u.UserId,
            BirthDate = u.BirthDate.ToDateTime(TimeOnly.MinValue),
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt
        };

    private static void ApplySettingsFromCreate(BirthdaySettings settings, CreateBirthdaySettingsDto dto)
    {
        settings.ChannelId = dto.ChannelId;
        settings.RoleId = dto.RoleId;
        settings.IsEmbed = dto.IsEmbed;
        settings.Message = dto.Message;
        settings.EmbedTitle = dto.EmbedTitle;
        settings.EmbedDescription = dto.EmbedDescription;
        settings.EmbedColor = dto.EmbedColor;
        settings.EmbedThumbnail = dto.EmbedThumbnail;
        settings.EmbedImage = dto.EmbedImage;
        settings.EmbedFooter = dto.EmbedFooter;
        settings.EmbedTitleUrl = dto.EmbedTitleUrl;
        settings.EmbedAuthorName = dto.EmbedAuthorName;
        settings.EmbedAuthorIcon = dto.EmbedAuthorIcon;
        settings.EmbedAuthorUrl = dto.EmbedAuthorUrl;
        settings.EmbedFooterIcon = dto.EmbedFooterIcon;
        settings.EmbedUseTimestamp = dto.EmbedUseTimestamp;
        settings.EmbedFieldsJson = dto.EmbedFieldsJson;
        settings.CheckHour = dto.CheckHour;
        settings.CreateMessageIsEmbed = dto.CreateMessageIsEmbed;
        settings.CreateMessage = dto.CreateMessage;
        settings.CreateEmbedTitle = dto.CreateEmbedTitle;
        settings.CreateEmbedDescription = dto.CreateEmbedDescription;
        settings.CreateEmbedColor = dto.CreateEmbedColor;
        settings.CreateEmbedThumbnail = dto.CreateEmbedThumbnail;
        settings.CreateEmbedImage = dto.CreateEmbedImage;
        settings.CreateEmbedFooter = dto.CreateEmbedFooter;
        settings.CreateEmbedTitleUrl = dto.CreateEmbedTitleUrl;
        settings.CreateEmbedAuthorName = dto.CreateEmbedAuthorName;
        settings.CreateEmbedAuthorIcon = dto.CreateEmbedAuthorIcon;
        settings.CreateEmbedAuthorUrl = dto.CreateEmbedAuthorUrl;
        settings.CreateEmbedFooterIcon = dto.CreateEmbedFooterIcon;
        settings.CreateEmbedUseTimestamp = dto.CreateEmbedUseTimestamp;
        settings.CreateEmbedFieldsJson = dto.CreateEmbedFieldsJson;
    }

    private static void ApplySettingsFromUpdate(BirthdaySettings settings, UpdateBirthdaySettingsDto dto)
    {
        if (dto.ChannelId != null) settings.ChannelId = dto.ChannelId;
        if (dto.RoleId != null) settings.RoleId = dto.RoleId;
        if (dto.IsEmbed.HasValue) settings.IsEmbed = dto.IsEmbed.Value;
        if (dto.Message != null) settings.Message = dto.Message;
        if (dto.EmbedTitle != null) settings.EmbedTitle = dto.EmbedTitle;
        if (dto.EmbedDescription != null) settings.EmbedDescription = dto.EmbedDescription;
        if (dto.EmbedColor != null) settings.EmbedColor = dto.EmbedColor;
        if (dto.EmbedThumbnail != null) settings.EmbedThumbnail = dto.EmbedThumbnail;
        if (dto.EmbedImage != null) settings.EmbedImage = dto.EmbedImage;
        if (dto.EmbedFooter != null) settings.EmbedFooter = dto.EmbedFooter;
        if (dto.EmbedTitleUrl != null) settings.EmbedTitleUrl = dto.EmbedTitleUrl;
        if (dto.EmbedAuthorName != null) settings.EmbedAuthorName = dto.EmbedAuthorName;
        if (dto.EmbedAuthorIcon != null) settings.EmbedAuthorIcon = dto.EmbedAuthorIcon;
        if (dto.EmbedAuthorUrl != null) settings.EmbedAuthorUrl = dto.EmbedAuthorUrl;
        if (dto.EmbedFooterIcon != null) settings.EmbedFooterIcon = dto.EmbedFooterIcon;
        if (dto.EmbedUseTimestamp.HasValue) settings.EmbedUseTimestamp = dto.EmbedUseTimestamp.Value;
        if (dto.EmbedFieldsJson != null) settings.EmbedFieldsJson = dto.EmbedFieldsJson;
        if (dto.CheckHour.HasValue) settings.CheckHour = dto.CheckHour.Value;
        if (dto.CreateMessageIsEmbed.HasValue) settings.CreateMessageIsEmbed = dto.CreateMessageIsEmbed.Value;
        if (dto.CreateMessage != null) settings.CreateMessage = dto.CreateMessage;
        if (dto.CreateEmbedTitle != null) settings.CreateEmbedTitle = dto.CreateEmbedTitle;
        if (dto.CreateEmbedDescription != null) settings.CreateEmbedDescription = dto.CreateEmbedDescription;
        if (dto.CreateEmbedColor != null) settings.CreateEmbedColor = dto.CreateEmbedColor;
        if (dto.CreateEmbedThumbnail != null) settings.CreateEmbedThumbnail = dto.CreateEmbedThumbnail;
        if (dto.CreateEmbedImage != null) settings.CreateEmbedImage = dto.CreateEmbedImage;
        if (dto.CreateEmbedFooter != null) settings.CreateEmbedFooter = dto.CreateEmbedFooter;
        if (dto.CreateEmbedTitleUrl != null) settings.CreateEmbedTitleUrl = dto.CreateEmbedTitleUrl;
        if (dto.CreateEmbedAuthorName != null) settings.CreateEmbedAuthorName = dto.CreateEmbedAuthorName;
        if (dto.CreateEmbedAuthorIcon != null) settings.CreateEmbedAuthorIcon = dto.CreateEmbedAuthorIcon;
        if (dto.CreateEmbedAuthorUrl != null) settings.CreateEmbedAuthorUrl = dto.CreateEmbedAuthorUrl;
        if (dto.CreateEmbedFooterIcon != null) settings.CreateEmbedFooterIcon = dto.CreateEmbedFooterIcon;
        if (dto.CreateEmbedUseTimestamp.HasValue) settings.CreateEmbedUseTimestamp = dto.CreateEmbedUseTimestamp.Value;
        if (dto.CreateEmbedFieldsJson != null) settings.CreateEmbedFieldsJson = dto.CreateEmbedFieldsJson;
    }
}
