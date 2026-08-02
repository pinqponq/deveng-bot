using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Helpers;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class LogChannelService : ILogChannelService
{
    private const string FeatureName = "LogChannel";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<LogChannelService> _logger;

    public LogChannelService(
        DevengDbContext db,
        IGuildFeatureService guildFeatureService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<LogChannelService> logger)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<LogChannelDto?> GetLogChannelByGuildIdAsync(string guildId)
    {
        var channel = await LogChannelQuery().FirstOrDefaultAsync(lc => lc.GuildId == guildId);
        if (channel == null) return null;

        var dto = MapToDto(channel);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<List<LogChannelTypeDto>> GetLogChannelTypesByGuildIdAsync(string guildId)
    {
        var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        var types = await _db.LogChannelTypes.AsNoTracking()
            .Where(t => t.LogChannel.GuildId == guildId)
            .OrderBy(t => t.LogType)
            .ToListAsync();

        return types.Select(t =>
        {
            var dto = MapToTypeDto(t);
            dto.Enabled = featureEnabled;
            return dto;
        }).ToList();
    }

    public async Task<LogChannelTypeDto?> GetLogChannelTypeByGuildIdAndTypeAsync(string guildId, string logType)
    {
        var type = await _db.LogChannelTypes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.LogChannel.GuildId == guildId && t.LogType == logType);
        if (type == null) return null;

        var dto = MapToTypeDto(type);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<LogChannelDto> CreateLogChannelAsync(CreateLogChannelDto createDto)
    {
        var existing = await _db.LogChannels
            .Include(lc => lc.EmbedSettings)
            .FirstOrDefaultAsync(lc => lc.GuildId == createDto.GuildId);

        if (existing != null)
        {
            existing.ChannelId = createDto.ChannelId;
            existing.Enabled = true;
            ApplyEmbedSettings(existing, createDto.EmbedSettings);
        }
        else
        {
            existing = new LogChannel
            {
                GuildId = createDto.GuildId,
                ChannelId = createDto.ChannelId,
                Enabled = true,
                EmbedSettings = CreateEmbedSettings(createDto.EmbedSettings)
            };
            _db.LogChannels.Add(existing);
        }

        await _db.SaveChangesAsync();
        return await GetLogChannelByGuildIdAsync(createDto.GuildId)
               ?? throw new Exception("LogChannel kaydı oluşturulamadı");
    }

    public async Task<LogChannelDto?> UpdateLogChannelAsync(string guildId, UpdateLogChannelDto updateDto)
    {
        var channel = await _db.LogChannels
            .Include(lc => lc.EmbedSettings)
            .FirstOrDefaultAsync(lc => lc.GuildId == guildId);
        if (channel == null) return null;

        if (updateDto.ChannelId != null) channel.ChannelId = updateDto.ChannelId;

        if (updateDto.EmbedSettings != null)
        {
            channel.EmbedSettings ??= new LogChannelEmbedSettings();
            channel.EmbedSettings.IsEmbed = updateDto.EmbedSettings.IsEmbed;
            channel.EmbedSettings.EmbedTitle = updateDto.EmbedSettings.EmbedTitle;
            channel.EmbedSettings.EmbedDescription = updateDto.EmbedSettings.EmbedDescription;
            channel.EmbedSettings.EmbedColor = updateDto.EmbedSettings.EmbedColor;
            channel.EmbedSettings.EmbedThumbnail = updateDto.EmbedSettings.EmbedThumbnail;
            channel.EmbedSettings.EmbedImage = updateDto.EmbedSettings.EmbedImage;
            channel.EmbedSettings.EmbedFooter = updateDto.EmbedSettings.EmbedFooter;
            channel.EmbedSettings.EmbedTitleUrl = updateDto.EmbedSettings.EmbedTitleUrl;
            channel.EmbedSettings.EmbedAuthorName = updateDto.EmbedSettings.EmbedAuthorName;
            channel.EmbedSettings.EmbedAuthorIcon = updateDto.EmbedSettings.EmbedAuthorIcon;
            channel.EmbedSettings.EmbedAuthorUrl = updateDto.EmbedSettings.EmbedAuthorUrl;
            channel.EmbedSettings.EmbedFooterIcon = updateDto.EmbedSettings.EmbedFooterIcon;
            channel.EmbedSettings.EmbedUseTimestamp = updateDto.EmbedSettings.EmbedUseTimestamp;
            channel.EmbedSettings.EmbedFieldsJson = updateDto.EmbedSettings.EmbedFieldsJson;
        }

        await _db.SaveChangesAsync();
        return await GetLogChannelByGuildIdAsync(guildId);
    }

    public async Task<bool> DeleteLogChannelAsync(string guildId, string? discordBotClientId = null)
    {
        var existing = await GetLogChannelByGuildIdAsync(guildId);
        if (existing == null) return false;

        var types = await GetLogChannelTypesByGuildIdAsync(guildId);
        var channelIds = CollectDiscordChannelIds(existing, types);
        await TryRequestBotDeleteLogChannelsAsync(guildId, channelIds, discordBotClientId).ConfigureAwait(false);

        var channel = await _db.LogChannels.FirstOrDefaultAsync(lc => lc.GuildId == guildId);
        if (channel == null) return false;

        _db.LogChannels.Remove(channel);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<LogChannelTypeDto> CreateLogChannelTypeAsync(CreateLogChannelTypeDto createDto)
    {
        var logChannel = await _db.LogChannels.FirstOrDefaultAsync(lc => lc.GuildId == createDto.GuildId)
            ?? throw new Exception("LogChannelType kaydı oluşturulamadı");

        var type = await _db.LogChannelTypes
            .FirstOrDefaultAsync(t => t.LogChannelId == logChannel.Id && t.LogType == createDto.LogType);

        if (type == null)
        {
            type = new LogChannelType
            {
                LogChannelId = logChannel.Id,
                LogType = createDto.LogType
            };
            _db.LogChannelTypes.Add(type);
        }

        type.ChannelId = createDto.ChannelId;
        type.Enabled = createDto.Enabled;
        type.IsEmbed = createDto.EmbedSettings?.IsEmbed ?? true;
        type.EmbedTitle = createDto.EmbedSettings?.EmbedTitle;
        type.EmbedDescription = createDto.EmbedSettings?.EmbedDescription;
        type.EmbedColor = createDto.EmbedSettings?.EmbedColor;
        type.EmbedThumbnail = createDto.EmbedSettings?.EmbedThumbnail;
        type.EmbedImage = createDto.EmbedSettings?.EmbedImage;
        type.EmbedFooter = createDto.EmbedSettings?.EmbedFooter;
        type.EmbedTitleUrl = createDto.EmbedSettings?.EmbedTitleUrl;
        type.EmbedAuthorName = createDto.EmbedSettings?.EmbedAuthorName;
        type.EmbedAuthorIcon = createDto.EmbedSettings?.EmbedAuthorIcon;
        type.EmbedAuthorUrl = createDto.EmbedSettings?.EmbedAuthorUrl;
        type.EmbedFooterIcon = createDto.EmbedSettings?.EmbedFooterIcon;
        type.EmbedUseTimestamp = createDto.EmbedSettings?.EmbedUseTimestamp ?? true;
        type.EmbedFieldsJson = createDto.EmbedSettings?.EmbedFieldsJson;

        await _db.SaveChangesAsync();

        return await GetLogChannelTypeByGuildIdAndTypeAsync(createDto.GuildId, createDto.LogType)
               ?? throw new Exception("LogChannelType kaydı oluşturulamadı");
    }

    public async Task<LogChannelTypeDto?> UpdateLogChannelTypeAsync(string guildId, string logType,
        UpdateLogChannelTypeDto updateDto)
    {
        var type = await _db.LogChannelTypes
            .FirstOrDefaultAsync(t => t.LogChannel.GuildId == guildId && t.LogType == logType);
        if (type == null) return null;

        if (updateDto.ChannelId != null) type.ChannelId = updateDto.ChannelId;
        if (updateDto.Enabled.HasValue) type.Enabled = updateDto.Enabled.Value;

        if (updateDto.EmbedSettings != null)
        {
            type.IsEmbed = updateDto.EmbedSettings.IsEmbed;
            type.EmbedTitle = updateDto.EmbedSettings.EmbedTitle;
            type.EmbedDescription = updateDto.EmbedSettings.EmbedDescription;
            type.EmbedColor = updateDto.EmbedSettings.EmbedColor;
            type.EmbedThumbnail = updateDto.EmbedSettings.EmbedThumbnail;
            type.EmbedImage = updateDto.EmbedSettings.EmbedImage;
            type.EmbedFooter = updateDto.EmbedSettings.EmbedFooter;
            type.EmbedTitleUrl = updateDto.EmbedSettings.EmbedTitleUrl;
            type.EmbedAuthorName = updateDto.EmbedSettings.EmbedAuthorName;
            type.EmbedAuthorIcon = updateDto.EmbedSettings.EmbedAuthorIcon;
            type.EmbedAuthorUrl = updateDto.EmbedSettings.EmbedAuthorUrl;
            type.EmbedFooterIcon = updateDto.EmbedSettings.EmbedFooterIcon;
            type.EmbedUseTimestamp = updateDto.EmbedSettings.EmbedUseTimestamp;
            type.EmbedFieldsJson = updateDto.EmbedSettings.EmbedFieldsJson;
        }

        await _db.SaveChangesAsync();
        return await GetLogChannelTypeByGuildIdAndTypeAsync(guildId, logType);
    }

    public async Task<bool> DeleteLogChannelTypeAsync(string guildId, string logType, string? discordBotClientId = null)
    {
        if (string.IsNullOrWhiteSpace(logType)) return false;

        var main = await GetLogChannelByGuildIdAsync(guildId);
        var types = await GetLogChannelTypesByGuildIdAsync(guildId);
        var match = types.FirstOrDefault(t =>
            t.LogType.Equals(logType.Trim(), StringComparison.OrdinalIgnoreCase));
        if (match == null) return false;

        var effectiveChannelId = GetEffectiveLogTypeDiscordChannelId(match, main);
        if (!string.IsNullOrWhiteSpace(effectiveChannelId))
        {
            var othersUseSame = types.Any(t =>
                !t.LogType.Equals(match.LogType, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(
                    GetEffectiveLogTypeDiscordChannelId(t, main),
                    effectiveChannelId,
                    StringComparison.Ordinal));
            if (!othersUseSame)
                await TryRequestBotDeleteLogChannelsAsync(guildId, [effectiveChannelId], discordBotClientId)
                    .ConfigureAwait(false);
        }

        var entity = await _db.LogChannelTypes
            .FirstOrDefaultAsync(t => t.LogChannel.GuildId == guildId && t.LogType == match.LogType);
        if (entity == null) return false;

        _db.LogChannelTypes.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<LogChannelDto>> GetAllLogChannelsAsync()
    {
        var channels = await LogChannelQuery().ToListAsync();
        return channels.Select(MapToDto).ToList();
    }

    private IQueryable<LogChannel> LogChannelQuery() =>
        _db.LogChannels.AsNoTracking().Include(lc => lc.EmbedSettings);

    private static LogChannelEmbedSettings CreateEmbedSettings(LogChannelEmbedSettingsDto? dto) =>
        new()
        {
            IsEmbed = dto?.IsEmbed ?? true,
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

    private static void ApplyEmbedSettings(LogChannel channel, LogChannelEmbedSettingsDto? dto)
    {
        channel.EmbedSettings ??= new LogChannelEmbedSettings();
        channel.EmbedSettings.IsEmbed = dto?.IsEmbed ?? true;
        channel.EmbedSettings.EmbedTitle = dto?.EmbedTitle;
        channel.EmbedSettings.EmbedDescription = dto?.EmbedDescription;
        channel.EmbedSettings.EmbedColor = dto?.EmbedColor;
        channel.EmbedSettings.EmbedThumbnail = dto?.EmbedThumbnail;
        channel.EmbedSettings.EmbedImage = dto?.EmbedImage;
        channel.EmbedSettings.EmbedFooter = dto?.EmbedFooter;
        channel.EmbedSettings.EmbedTitleUrl = dto?.EmbedTitleUrl;
        channel.EmbedSettings.EmbedAuthorName = dto?.EmbedAuthorName;
        channel.EmbedSettings.EmbedAuthorIcon = dto?.EmbedAuthorIcon;
        channel.EmbedSettings.EmbedAuthorUrl = dto?.EmbedAuthorUrl;
        channel.EmbedSettings.EmbedFooterIcon = dto?.EmbedFooterIcon;
        channel.EmbedSettings.EmbedUseTimestamp = dto?.EmbedUseTimestamp ?? true;
        channel.EmbedSettings.EmbedFieldsJson = dto?.EmbedFieldsJson;
    }

    /// <summary>Tür satırındaki ChannelId; yoksa ana LogChannel.ChannelId (panel ile aynı mantık).</summary>
    private static string? GetEffectiveLogTypeDiscordChannelId(LogChannelTypeDto type, LogChannelDto? main)
    {
        if (!string.IsNullOrWhiteSpace(type.ChannelId)) return type.ChannelId.Trim();
        if (main != null && !string.IsNullOrWhiteSpace(main.ChannelId)) return main.ChannelId.Trim();
        return null;
    }

    private static List<string> CollectDiscordChannelIds(LogChannelDto main, List<LogChannelTypeDto> types)
    {
        var set = new HashSet<string>(StringComparer.Ordinal);
        if (!string.IsNullOrWhiteSpace(main.ChannelId)) set.Add(main.ChannelId.Trim());
        foreach (var t in types)
            if (!string.IsNullOrWhiteSpace(t.ChannelId))
                set.Add(t.ChannelId!.Trim());
        return set.ToList();
    }

    private async Task TryRequestBotDeleteLogChannelsAsync(string guildId, IReadOnlyList<string> channelIds,
        string? discordBotClientId)
    {
        if (channelIds.Count == 0) return;

        var botUrl = _configuration["Bot:HttpServerUrl"]?.Trim();
        if (string.IsNullOrEmpty(botUrl))
        {
            _logger.LogWarning("[LogChannel] Bot:HttpServerUrl yok; Discord log kanalları silinemedi. GuildId={GuildId}",
                guildId);
            return;
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(60);

            var payload = JsonSerializer.Serialize(new { channelIds });
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json") { CharSet = "utf-8" };

            var request = new HttpRequestMessage(HttpMethod.Post,
                $"{botUrl.TrimEnd('/')}/api/bot/delete-log-channels/{Uri.EscapeDataString(guildId)}")
            {
                Content = content
            };

            var botToken = _configuration["BotToken"] ?? Environment.GetEnvironmentVariable("BOT_TOKEN");
            if (!string.IsNullOrEmpty(botToken))
                request.Headers.TryAddWithoutValidation("X-Bot-Token", botToken);
            if (!string.IsNullOrEmpty(discordBotClientId))
                request.Headers.TryAddWithoutValidation("X-Bot-ClientId", discordBotClientId);

            var sharedSecret = _configuration["Bot:SharedSecret"] ?? string.Empty;
            BotHttpHmac.AddSignedHeaders(request, sharedSecret, payload);

            var response = await httpClient.SendAsync(request).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                _logger.LogWarning(
                    "[LogChannel] Bot log kanalı silme yanıtı başarısız. GuildId={GuildId} Status={Status} Body={Body}",
                    guildId, (int)response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[LogChannel] Bot log kanalı silme isteği hata. GuildId={GuildId}", guildId);
        }
    }

    private static LogChannelDto MapToDto(LogChannel lc)
    {
        var embed = lc.EmbedSettings;
        return new LogChannelDto
        {
            Id = lc.Id,
            GuildId = lc.GuildId,
            ChannelId = lc.ChannelId,
            Enabled = lc.Enabled,
            CreatedAt = lc.CreatedAt,
            UpdatedAt = lc.UpdatedAt,
            IsEmbed = embed?.IsEmbed ?? true,
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
            EmbedFieldsJson = embed?.EmbedFieldsJson
        };
    }

    private static LogChannelTypeDto MapToTypeDto(LogChannelType t) =>
        new()
        {
            Id = t.Id,
            LogChannelId = t.LogChannelId,
            LogType = t.LogType,
            ChannelId = t.ChannelId,
            Enabled = t.Enabled,
            IsEmbed = t.IsEmbed,
            EmbedTitle = t.EmbedTitle,
            EmbedDescription = t.EmbedDescription,
            EmbedColor = t.EmbedColor,
            EmbedThumbnail = t.EmbedThumbnail,
            EmbedImage = t.EmbedImage,
            EmbedFooter = t.EmbedFooter,
            EmbedTitleUrl = t.EmbedTitleUrl,
            EmbedAuthorName = t.EmbedAuthorName,
            EmbedAuthorIcon = t.EmbedAuthorIcon,
            EmbedAuthorUrl = t.EmbedAuthorUrl,
            EmbedFooterIcon = t.EmbedFooterIcon,
            EmbedUseTimestamp = t.EmbedUseTimestamp,
            EmbedFieldsJson = t.EmbedFieldsJson,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };
}
