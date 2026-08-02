using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class WelcomeService : IWelcomeService
{
    private const string FeatureName = "Welcome";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public WelcomeService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<WelcomeDto?> GetWelcomeByGuildIdAsync(string guildId, string language = "tr")
    {
        var welcome = await WelcomeQuery().FirstOrDefaultAsync(w => w.GuildId == guildId && w.Language == language);
        if (welcome == null) return null;

        var dto = MapToDto(welcome);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<WelcomeDto> CreateWelcomeAsync(CreateWelcomeDto createDto)
    {
        var language = createDto.Language ?? "tr";
        var welcome = new Welcome
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            Message = createDto.Message,
            Language = language,
            GiveRole = createDto.GiveRole,
            RoleId = createDto.RoleId,
            EmbedSettings = CreateEmbedSettings(createDto.EmbedSettings),
            CardSettings = CreateCardSettings(createDto.CardSettings),
            DMSettings = CreateDMSettings(createDto.DMSettings),
            DMEmbedSettings = CreateDMEmbedSettings(createDto.DMEmbedSettings),
            DMCardSettings = CreateDMCardSettings(createDto.DMCardSettings)
        };

        _db.Welcomes.Add(welcome);
        await _db.SaveChangesAsync();

        return await GetWelcomeByGuildIdAsync(createDto.GuildId, language)
               ?? throw new Exception("Welcome kaydı oluşturulamadı");
    }

    public async Task<WelcomeDto?> UpdateWelcomeAsync(string guildId, UpdateWelcomeDto updateDto)
    {
        var language = updateDto.Language ?? "tr";
        var welcome = await _db.Welcomes
            .Include(w => w.EmbedSettings)
            .Include(w => w.CardSettings)
            .Include(w => w.DMSettings)
            .Include(w => w.DMEmbedSettings)
            .Include(w => w.DMCardSettings)
            .FirstOrDefaultAsync(w => w.GuildId == guildId && w.Language == language);

        if (welcome == null) return null;

        if (updateDto.ChannelId != null) welcome.ChannelId = updateDto.ChannelId;
        if (updateDto.Message != null) welcome.Message = updateDto.Message;
        if (updateDto.Language != null) welcome.Language = updateDto.Language;
        if (updateDto.GiveRole.HasValue) welcome.GiveRole = updateDto.GiveRole.Value;
        if (updateDto.RoleId != null) welcome.RoleId = updateDto.RoleId;

        ApplyEmbedSettingsUpdate(welcome, updateDto.EmbedSettings);
        ApplyCardSettingsUpdate(welcome, updateDto.CardSettings);
        ApplyDMSettingsUpdate(welcome, updateDto.DMSettings);
        ApplyDMEmbedSettingsUpdate(welcome, updateDto.DMEmbedSettings);
        ApplyDMCardSettingsUpdate(welcome, updateDto.DMCardSettings);

        await _db.SaveChangesAsync();
        return await GetWelcomeByGuildIdAsync(guildId, language);
    }

    public async Task<bool> DeleteWelcomeAsync(string guildId)
    {
        var welcome = await _db.Welcomes.FirstOrDefaultAsync(w => w.GuildId == guildId);
        if (welcome == null) return false;

        _db.Welcomes.Remove(welcome);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<WelcomeDto>> GetAllWelcomesAsync()
    {
        var welcomes = await WelcomeQuery().ToListAsync();
        return welcomes.Select(MapToDto).ToList();
    }

    private IQueryable<Welcome> WelcomeQuery() =>
        _db.Welcomes.AsNoTracking()
            .Include(w => w.EmbedSettings)
            .Include(w => w.CardSettings)
            .Include(w => w.DMSettings)
            .Include(w => w.DMEmbedSettings)
            .Include(w => w.DMCardSettings);

    private static WelcomeDto MapToDto(Welcome w)
    {
        var embed = w.EmbedSettings;
        var card = w.CardSettings;
        var dm = w.DMSettings;
        var dmEmbed = w.DMEmbedSettings;
        var dmCard = w.DMCardSettings;

        return new WelcomeDto
        {
            Id = w.Id,
            GuildId = w.GuildId,
            ChannelId = w.ChannelId,
            Message = w.Message,
            Language = w.Language,
            Enabled = false,
            GiveRole = w.GiveRole,
            RoleId = w.RoleId,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt,
            IsEmbed = embed?.IsEmbed ?? false,
            EmbedTitle = embed?.EmbedTitle,
            EmbedDescription = embed?.EmbedDescription,
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
            EmbedFieldsJson = embed?.EmbedFieldsJson,
            SendWelcomeCard = card?.SendWelcomeCard ?? false,
            CardTitle = card?.CardTitle,
            CardUsernameText = card?.CardUsernameText,
            CardMemberText = card?.CardMemberText,
            CardBackgroundColor1 = card?.CardBackgroundColor1,
            CardBackgroundColor2 = card?.CardBackgroundColor2,
            CardTextColor = card?.CardTextColor,
            CardBorderColor = card?.CardBorderColor,
            SendDM = dm?.SendDM ?? false,
            DMMessage = dm?.DMMessage,
            IsDMEmbed = dmEmbed?.IsDMEmbed ?? false,
            DMEmbedTitle = dmEmbed?.DMEmbedTitle,
            DMEmbedDescription = dmEmbed?.DMEmbedDescription,
            DMEmbedColor = dmEmbed?.DMEmbedColor,
            DMEmbedThumbnail = dmEmbed?.DMEmbedThumbnail,
            DMEmbedImage = dmEmbed?.DMEmbedImage,
            DMEmbedFooter = dmEmbed?.DMEmbedFooter,
            DMEmbedTitleUrl = dmEmbed?.DMEmbedTitleUrl,
            DMEmbedAuthorName = dmEmbed?.DMEmbedAuthorName,
            DMEmbedAuthorIcon = dmEmbed?.DMEmbedAuthorIcon,
            DMEmbedAuthorUrl = dmEmbed?.DMEmbedAuthorUrl,
            DMEmbedFooterIcon = dmEmbed?.DMEmbedFooterIcon,
            DMEmbedUseTimestamp = dmEmbed?.DMEmbedUseTimestamp ?? true,
            DMEmbedFieldsJson = dmEmbed?.DMEmbedFieldsJson,
            SendDMCard = dmCard?.SendDMCard ?? false,
            DMCardTitle = dmCard?.DMCardTitle,
            DMCardUsernameText = dmCard?.DMCardUsernameText,
            DMCardMemberText = dmCard?.DMCardMemberText,
            DMCardBackgroundColor1 = dmCard?.DMCardBackgroundColor1,
            DMCardBackgroundColor2 = dmCard?.DMCardBackgroundColor2,
            DMCardTextColor = dmCard?.DMCardTextColor,
            DMCardBorderColor = dmCard?.DMCardBorderColor
        };
    }

    private static WelcomeEmbedSettings CreateEmbedSettings(WelcomeEmbedSettingsDto? dto) =>
        new()
        {
            IsEmbed = dto?.IsEmbed ?? false,
            EmbedTitle = dto?.EmbedTitle,
            EmbedDescription = dto?.EmbedDescription,
            EmbedColor = dto?.EmbedColor,
            EmbedThumbnail = dto?.EmbedThumbnail,
            EmbedImage = dto?.EmbedImage,
            EmbedFooter = dto?.EmbedFooter,
            EmbedTitleUrl = dto?.EmbedTitleUrl,
            EmbedAuthorName = dto?.EmbedAuthorName,
            EmbedAuthorIcon = dto?.EmbedAuthorIcon,
            EmbedAuthorUrl = dto?.EmbedAuthorUrl,
            EmbedFooterIcon = dto?.EmbedFooterIcon,
            EmbedUseTimestamp = dto?.EmbedUseTimestamp ?? true,
            EmbedFieldsJson = dto?.EmbedFieldsJson
        };

    private static WelcomeCardSettings CreateCardSettings(WelcomeCardSettingsDto? dto) =>
        new()
        {
            SendWelcomeCard = dto?.SendWelcomeCard ?? false,
            CardTitle = dto?.CardTitle,
            CardUsernameText = dto?.CardUsernameText,
            CardMemberText = dto?.CardMemberText,
            CardBackgroundColor1 = dto?.CardBackgroundColor1,
            CardBackgroundColor2 = dto?.CardBackgroundColor2,
            CardTextColor = dto?.CardTextColor,
            CardBorderColor = dto?.CardBorderColor
        };

    private static WelcomeDMSettings CreateDMSettings(WelcomeDMSettingsDto? dto) =>
        new()
        {
            SendDM = dto?.SendDM ?? false,
            DMMessage = dto?.DMMessage
        };

    private static WelcomeDMEmbedSettings CreateDMEmbedSettings(WelcomeDMEmbedSettingsDto? dto) =>
        new()
        {
            IsDMEmbed = dto?.IsDMEmbed ?? false,
            DMEmbedTitle = dto?.DMEmbedTitle,
            DMEmbedDescription = dto?.DMEmbedDescription,
            DMEmbedColor = dto?.DMEmbedColor,
            DMEmbedThumbnail = dto?.DMEmbedThumbnail,
            DMEmbedImage = dto?.DMEmbedImage,
            DMEmbedFooter = dto?.DMEmbedFooter,
            DMEmbedTitleUrl = dto?.DMEmbedTitleUrl,
            DMEmbedAuthorName = dto?.DMEmbedAuthorName,
            DMEmbedAuthorIcon = dto?.DMEmbedAuthorIcon,
            DMEmbedAuthorUrl = dto?.DMEmbedAuthorUrl,
            DMEmbedFooterIcon = dto?.DMEmbedFooterIcon,
            DMEmbedUseTimestamp = dto?.DMEmbedUseTimestamp ?? true,
            DMEmbedFieldsJson = dto?.DMEmbedFieldsJson
        };

    private static WelcomeDMCardSettings CreateDMCardSettings(WelcomeDMCardSettingsDto? dto) =>
        new()
        {
            SendDMCard = dto?.SendDMCard ?? false,
            DMCardTitle = dto?.DMCardTitle,
            DMCardUsernameText = dto?.DMCardUsernameText,
            DMCardMemberText = dto?.DMCardMemberText,
            DMCardBackgroundColor1 = dto?.DMCardBackgroundColor1,
            DMCardBackgroundColor2 = dto?.DMCardBackgroundColor2,
            DMCardTextColor = dto?.DMCardTextColor,
            DMCardBorderColor = dto?.DMCardBorderColor
        };

    private static void ApplyEmbedSettingsUpdate(Welcome welcome, WelcomeEmbedSettingsDto? dto)
    {
        if (dto == null) return;
        welcome.EmbedSettings ??= new WelcomeEmbedSettings();
        welcome.EmbedSettings.IsEmbed = dto.IsEmbed;
        if (dto.EmbedTitle != null) welcome.EmbedSettings.EmbedTitle = dto.EmbedTitle;
        if (dto.EmbedDescription != null) welcome.EmbedSettings.EmbedDescription = dto.EmbedDescription;
        if (dto.EmbedColor != null) welcome.EmbedSettings.EmbedColor = dto.EmbedColor;
        if (dto.EmbedThumbnail != null) welcome.EmbedSettings.EmbedThumbnail = dto.EmbedThumbnail;
        if (dto.EmbedImage != null) welcome.EmbedSettings.EmbedImage = dto.EmbedImage;
        if (dto.EmbedFooter != null) welcome.EmbedSettings.EmbedFooter = dto.EmbedFooter;
        if (dto.EmbedTitleUrl != null) welcome.EmbedSettings.EmbedTitleUrl = dto.EmbedTitleUrl;
        if (dto.EmbedAuthorName != null) welcome.EmbedSettings.EmbedAuthorName = dto.EmbedAuthorName;
        if (dto.EmbedAuthorIcon != null) welcome.EmbedSettings.EmbedAuthorIcon = dto.EmbedAuthorIcon;
        if (dto.EmbedAuthorUrl != null) welcome.EmbedSettings.EmbedAuthorUrl = dto.EmbedAuthorUrl;
        if (dto.EmbedFooterIcon != null) welcome.EmbedSettings.EmbedFooterIcon = dto.EmbedFooterIcon;
        welcome.EmbedSettings.EmbedUseTimestamp = dto.EmbedUseTimestamp;
        if (dto.EmbedFieldsJson != null) welcome.EmbedSettings.EmbedFieldsJson = dto.EmbedFieldsJson;
    }

    private static void ApplyCardSettingsUpdate(Welcome welcome, WelcomeCardSettingsDto? dto)
    {
        if (dto == null) return;
        welcome.CardSettings ??= new WelcomeCardSettings();
        welcome.CardSettings.SendWelcomeCard = dto.SendWelcomeCard;
        if (dto.CardTitle != null) welcome.CardSettings.CardTitle = dto.CardTitle;
        if (dto.CardUsernameText != null) welcome.CardSettings.CardUsernameText = dto.CardUsernameText;
        if (dto.CardMemberText != null) welcome.CardSettings.CardMemberText = dto.CardMemberText;
        if (dto.CardBackgroundColor1 != null) welcome.CardSettings.CardBackgroundColor1 = dto.CardBackgroundColor1;
        if (dto.CardBackgroundColor2 != null) welcome.CardSettings.CardBackgroundColor2 = dto.CardBackgroundColor2;
        if (dto.CardTextColor != null) welcome.CardSettings.CardTextColor = dto.CardTextColor;
        if (dto.CardBorderColor != null) welcome.CardSettings.CardBorderColor = dto.CardBorderColor;
    }

    private static void ApplyDMSettingsUpdate(Welcome welcome, WelcomeDMSettingsDto? dto)
    {
        if (dto == null) return;
        welcome.DMSettings ??= new WelcomeDMSettings();
        welcome.DMSettings.SendDM = dto.SendDM;
        if (dto.DMMessage != null) welcome.DMSettings.DMMessage = dto.DMMessage;
    }

    private static void ApplyDMEmbedSettingsUpdate(Welcome welcome, WelcomeDMEmbedSettingsDto? dto)
    {
        if (dto == null) return;
        welcome.DMEmbedSettings ??= new WelcomeDMEmbedSettings();
        welcome.DMEmbedSettings.IsDMEmbed = dto.IsDMEmbed;
        if (dto.DMEmbedTitle != null) welcome.DMEmbedSettings.DMEmbedTitle = dto.DMEmbedTitle;
        if (dto.DMEmbedDescription != null) welcome.DMEmbedSettings.DMEmbedDescription = dto.DMEmbedDescription;
        if (dto.DMEmbedColor != null) welcome.DMEmbedSettings.DMEmbedColor = dto.DMEmbedColor;
        if (dto.DMEmbedThumbnail != null) welcome.DMEmbedSettings.DMEmbedThumbnail = dto.DMEmbedThumbnail;
        if (dto.DMEmbedImage != null) welcome.DMEmbedSettings.DMEmbedImage = dto.DMEmbedImage;
        if (dto.DMEmbedFooter != null) welcome.DMEmbedSettings.DMEmbedFooter = dto.DMEmbedFooter;
        if (dto.DMEmbedTitleUrl != null) welcome.DMEmbedSettings.DMEmbedTitleUrl = dto.DMEmbedTitleUrl;
        if (dto.DMEmbedAuthorName != null) welcome.DMEmbedSettings.DMEmbedAuthorName = dto.DMEmbedAuthorName;
        if (dto.DMEmbedAuthorIcon != null) welcome.DMEmbedSettings.DMEmbedAuthorIcon = dto.DMEmbedAuthorIcon;
        if (dto.DMEmbedAuthorUrl != null) welcome.DMEmbedSettings.DMEmbedAuthorUrl = dto.DMEmbedAuthorUrl;
        if (dto.DMEmbedFooterIcon != null) welcome.DMEmbedSettings.DMEmbedFooterIcon = dto.DMEmbedFooterIcon;
        welcome.DMEmbedSettings.DMEmbedUseTimestamp = dto.DMEmbedUseTimestamp;
        if (dto.DMEmbedFieldsJson != null) welcome.DMEmbedSettings.DMEmbedFieldsJson = dto.DMEmbedFieldsJson;
    }

    private static void ApplyDMCardSettingsUpdate(Welcome welcome, WelcomeDMCardSettingsDto? dto)
    {
        if (dto == null) return;
        welcome.DMCardSettings ??= new WelcomeDMCardSettings();
        welcome.DMCardSettings.SendDMCard = dto.SendDMCard;
        if (dto.DMCardTitle != null) welcome.DMCardSettings.DMCardTitle = dto.DMCardTitle;
        if (dto.DMCardUsernameText != null) welcome.DMCardSettings.DMCardUsernameText = dto.DMCardUsernameText;
        if (dto.DMCardMemberText != null) welcome.DMCardSettings.DMCardMemberText = dto.DMCardMemberText;
        if (dto.DMCardBackgroundColor1 != null) welcome.DMCardSettings.DMCardBackgroundColor1 = dto.DMCardBackgroundColor1;
        if (dto.DMCardBackgroundColor2 != null) welcome.DMCardSettings.DMCardBackgroundColor2 = dto.DMCardBackgroundColor2;
        if (dto.DMCardTextColor != null) welcome.DMCardSettings.DMCardTextColor = dto.DMCardTextColor;
        if (dto.DMCardBorderColor != null) welcome.DMCardSettings.DMCardBorderColor = dto.DMCardBorderColor;
    }
}
