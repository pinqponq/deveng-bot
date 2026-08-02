using System.Text.RegularExpressions;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class CustomBotService : ICustomBotService
{
    private const int MaxAvatarDataUrlLength = 350_000;
    private const int MaxBannerDataUrlLength = 700_000;
    private const int MaxActivityTextLength = 128;
    private const int MaxBotNameLength = 32;

    private static readonly HashSet<string> ValidPresenceStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "online", "idle", "dnd", "invisible" };

    private static readonly HashSet<string> ValidActivityTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Playing", "Streaming", "Listening", "Watching", "Competing", "Custom"
        };

    private readonly DevengDbContext _db;

    public CustomBotService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<CustomBotDto?> GetCustomBotByIdAsync(int id)
    {
        var bot = await _db.CustomBots.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
        return bot == null ? null : MapToDto(bot);
    }

    public async Task<CustomBotDto?> GetCustomBotByClientIdAsync(string clientId)
    {
        var bot = await _db.CustomBots.AsNoTracking().FirstOrDefaultAsync(b => b.ClientId == clientId);
        return bot == null ? null : MapToDto(bot);
    }

    public async Task<List<CustomBotDto>> GetCustomBotsByOwnerIdAsync(string ownerId)
    {
        var bots = await _db.CustomBots.AsNoTracking()
            .Where(b => b.OwnerId == ownerId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return bots.Select(MapToDto).ToList();
    }

    public async Task<List<CustomBotDto>> GetAllCustomBotsAsync()
    {
        var bots = await _db.CustomBots.AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return bots.Select(MapToDto).ToList();
    }

    public async Task<List<CustomBotDto>> GetActiveCustomBotsAsync()
    {
        var bots = await _db.CustomBots.AsNoTracking()
            .Where(b => b.Status == "Active")
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return bots.Select(MapToDto).ToList();
    }

    public async Task<List<CustomBotInternalActiveDto>> GetActiveCustomBotsInternalAsync()
    {
        var bots = await _db.CustomBots.AsNoTracking()
            .Where(b => b.Status == "Active")
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bots.Select(b => new CustomBotInternalActiveDto
        {
            Id = b.Id,
            BotToken = b.BotToken,
            ClientId = b.ClientId,
            OwnerId = b.OwnerId,
            BotName = b.BotName
        }).ToList();
    }

    public async Task<CustomBotPersonalizationInternalDto?> GetPersonalizationInternalAsync(int id)
    {
        var bot = await _db.CustomBots.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
        return bot == null ? null : MapToPersonalizationInternal(bot);
    }

    public async Task<CustomBotDto> CreateCustomBotAsync(CreateCustomBotDto createDto)
    {
        var ownerHasBot = await _db.CustomBots.AsNoTracking()
            .AnyAsync(b => b.OwnerId == createDto.OwnerId);
        if (ownerHasBot)
            throw new InvalidOperationException("Hesap başına yalnızca bir özel bot tanımlanabilir.");

        var existing = await GetCustomBotByClientIdAsync(createDto.ClientId);
        if (existing != null)
            throw new InvalidOperationException($"Custom bot zaten mevcut (ClientId: {createDto.ClientId})");

        try
        {
            var bot = new CustomBot
            {
                BotToken = createDto.BotToken,
                ClientId = createDto.ClientId,
                OwnerId = createDto.OwnerId,
                BotName = createDto.BotName,
                Status = "Inactive"
            };

            _db.CustomBots.Add(bot);
            await _db.SaveChangesAsync();

            return await GetCustomBotByClientIdAsync(createDto.ClientId)
                   ?? throw new Exception("Custom bot kaydı oluşturulamadı");
        }
        catch (DbUpdateException ex)
        {
            throw new Exception($"SQL hatası: {ex.InnerException?.Message ?? ex.Message}", ex);
        }
        catch (Exception ex)
        {
            throw new Exception($"Custom bot oluşturulurken hata: {ex.Message}", ex);
        }
    }

    public async Task<CustomBotDto?> UpdateCustomBotAsync(int id, UpdateCustomBotDto updateDto)
    {
        var bot = await _db.CustomBots.FindAsync(id);
        if (bot == null) return null;

        if (updateDto.BotToken != null) bot.BotToken = updateDto.BotToken;
        if (updateDto.BotName != null) bot.BotName = updateDto.BotName;
        if (updateDto.Status != null) bot.Status = updateDto.Status;
        if (updateDto.ErrorMessage != null) bot.ErrorMessage = updateDto.ErrorMessage;
        if (updateDto.LastSeen.HasValue) bot.LastSeen = updateDto.LastSeen;

        await _db.SaveChangesAsync();
        return await GetCustomBotByIdAsync(id);
    }

    public async Task<CustomBotDto?> UpdatePersonalizationAsync(int id, UpdateCustomBotPersonalizationDto updateDto)
    {
        var bot = await _db.CustomBots.FindAsync(id);
        if (bot == null) return null;

        if (updateDto.BotName != null)
        {
            var trimmed = updateDto.BotName.Trim();
            if (trimmed.Length > MaxBotNameLength)
                throw new InvalidOperationException($"Bot adı en fazla {MaxBotNameLength} karakter olabilir.");
            bot.BotName = string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }

        if (updateDto.AvatarUrl != null)
            bot.AvatarUrl = ValidateImageUrl(updateDto.AvatarUrl, MaxAvatarDataUrlLength, "Avatar");

        if (updateDto.BannerUrl != null)
            bot.BannerUrl = ValidateImageUrl(updateDto.BannerUrl, MaxBannerDataUrlLength, "Banner");

        if (updateDto.PresenceStatus != null)
        {
            var status = updateDto.PresenceStatus.Trim().ToLowerInvariant();
            if (!ValidPresenceStatuses.Contains(status))
                throw new InvalidOperationException("Geçersiz presence durumu.");
            bot.PresenceStatus = status;
        }

        if (updateDto.ActivityType != null)
        {
            var activityType = ValidActivityTypes.FirstOrDefault(
                t => string.Equals(t, updateDto.ActivityType.Trim(), StringComparison.OrdinalIgnoreCase));
            if (activityType == null)
                throw new InvalidOperationException("Geçersiz activity tipi.");
            bot.ActivityType = activityType;
        }

        if (updateDto.ActivityText != null)
        {
            var text = updateDto.ActivityText.Trim();
            if (text.Length > MaxActivityTextLength)
                throw new InvalidOperationException($"Durum metni en fazla {MaxActivityTextLength} karakter olabilir.");
            bot.ActivityText = string.IsNullOrEmpty(text) ? null : text;
        }

        if (updateDto.PersonalizationEnabled.HasValue)
            bot.PersonalizationEnabled = updateDto.PersonalizationEnabled.Value;

        await _db.SaveChangesAsync();
        return await GetCustomBotByIdAsync(id);
    }

    public async Task<CustomBotDto?> UpdateInternalStatusAsync(int id, UpdateCustomBotInternalStatusDto updateDto)
    {
        var bot = await _db.CustomBots.FindAsync(id);
        if (bot == null) return null;

        if (!string.IsNullOrWhiteSpace(updateDto.Status))
            bot.Status = updateDto.Status;

        bot.ErrorMessage = updateDto.ErrorMessage;
        if (updateDto.LastSeen.HasValue)
            bot.LastSeen = updateDto.LastSeen;

        await _db.SaveChangesAsync();
        return await GetCustomBotByIdAsync(id);
    }

    public async Task<bool> DeleteCustomBotAsync(int id)
    {
        var bot = await _db.CustomBots.FindAsync(id);
        if (bot == null) return false;

        _db.CustomBots.Remove(bot);
        await _db.SaveChangesAsync();
        return true;
    }

    private static string? ValidateImageUrl(string value, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new InvalidOperationException($"{fieldName} görseli çok büyük.");

        if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            if (!Regex.IsMatch(trimmed, @"^data:image/(png|jpeg|jpg|gif|webp);base64,", RegexOptions.IgnoreCase))
                throw new InvalidOperationException($"{fieldName} yalnızca PNG, JPEG, GIF veya WebP olabilir.");
            return trimmed;
        }

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
        {
            return trimmed;
        }

        throw new InvalidOperationException($"{fieldName} geçerli bir görsel URL veya data URL olmalıdır.");
    }

    private static CustomBotDto MapToDto(CustomBot bot) =>
        new()
        {
            Id = bot.Id,
            BotToken = bot.BotToken,
            ClientId = bot.ClientId,
            OwnerId = bot.OwnerId,
            BotName = bot.BotName,
            Status = bot.Status,
            ErrorMessage = bot.ErrorMessage,
            AvatarUrl = bot.AvatarUrl,
            BannerUrl = bot.BannerUrl,
            PresenceStatus = bot.PresenceStatus,
            ActivityType = bot.ActivityType,
            ActivityText = bot.ActivityText,
            PersonalizationEnabled = bot.PersonalizationEnabled,
            CreatedAt = bot.CreatedAt,
            UpdatedAt = bot.UpdatedAt,
            LastSeen = bot.LastSeen
        };

    private static CustomBotPersonalizationInternalDto MapToPersonalizationInternal(CustomBot bot) =>
        new()
        {
            Id = bot.Id,
            ClientId = bot.ClientId,
            BotName = bot.BotName,
            AvatarUrl = bot.AvatarUrl,
            BannerUrl = bot.BannerUrl,
            PresenceStatus = bot.PresenceStatus,
            ActivityType = bot.ActivityType,
            ActivityText = bot.ActivityText,
            PersonalizationEnabled = bot.PersonalizationEnabled
        };
}
