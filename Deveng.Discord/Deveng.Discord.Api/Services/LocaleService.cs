using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class LocaleService : ILocaleService
{
    private readonly DevengDbContext _db;

    public LocaleService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<GuildLocaleDto?> GetAsync(string guildId)
    {
        var setting = await _db.GuildLocaleSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null) return null;

        return new GuildLocaleDto
        {
            GuildId = setting.GuildId,
            DefaultLocale = setting.DefaultLocale,
            FallbackLocale = setting.FallbackLocale,
            UpdatedAt = setting.UpdatedAt
        };
    }

    public async Task<GuildLocaleDto> UpsertAsync(string guildId, UpsertGuildLocaleDto dto)
    {
        if (!PlatformLocales.IsSupported(dto.DefaultLocale) || !PlatformLocales.IsSupported(dto.FallbackLocale))
            throw new ArgumentException("Desteklenmeyen locale kodu.");

        var defaultLocale = dto.DefaultLocale.Trim().ToLowerInvariant();
        var fallbackLocale = dto.FallbackLocale.Trim().ToLowerInvariant();

        var setting = await _db.GuildLocaleSettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null)
        {
            setting = new GuildLocaleSetting
            {
                GuildId = guildId,
                DefaultLocale = defaultLocale,
                FallbackLocale = fallbackLocale,
                UpdatedAt = DateTime.UtcNow
            };
            _db.GuildLocaleSettings.Add(setting);
        }
        else
        {
            setting.DefaultLocale = defaultLocale;
            setting.FallbackLocale = fallbackLocale;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return await GetAsync(guildId) ?? throw new InvalidOperationException("Locale ayarı oluşturulamadı.");
    }
}
