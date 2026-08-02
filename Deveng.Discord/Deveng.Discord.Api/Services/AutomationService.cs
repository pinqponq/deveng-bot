using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Exceptions;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class AutomationService : IAutomationService
{
    public const string FeatureName = "Automation";
    private const int MaxRulesPerGuild = 25;
    private const int MaxDefinitionLength = 120_000;
    private const int MaxNameLength = 128;

    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly IQuotaService _quota;

    public AutomationService(DevengDbContext db, IGuildFeatureService guildFeatureService, IQuotaService quota)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _quota = quota;
    }

    public async Task<List<GuildAutomationDto>> GetByGuildIdAsync(string guildId)
    {
        var featureOn = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        if (!featureOn)
            return new List<GuildAutomationDto>();

        var automations = await _db.GuildAutomations.AsNoTracking()
            .Where(a => a.GuildId == guildId)
            .OrderBy(a => a.Name)
            .ToListAsync();

        return automations.Select(Map).ToList();
    }

    public async Task<GuildAutomationDto?> GetByIdAsync(int id)
    {
        var automation = await _db.GuildAutomations.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        return automation == null ? null : Map(automation);
    }

    public async Task<GuildAutomationDto> CreateAsync(string guildId, CreateGuildAutomationDto dto)
    {
        ValidateDefinition(dto.DefinitionJson);
        ValidateName(dto.Name);

        var featureOn = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        if (!featureOn)
            throw new FeatureDisabledException("Automation özelliği bu sunucuda kapalı.");

        var existing = await GetByGuildIdAsync(guildId);
        await _quota.EnforceQuotaAsync(guildId, FeatureQuota.AutomationRule, existing.Count);
        if (existing.Count >= MaxRulesPerGuild)
            throw new InvalidOperationException($"En fazla {MaxRulesPerGuild} otomasyon kuralı oluşturulabilir.");

        var automation = new GuildAutomation
        {
            GuildId = guildId,
            Name = dto.Name.Trim(),
            Enabled = dto.Enabled,
            DefinitionJson = dto.DefinitionJson,
            RetryOnFailure = dto.RetryOnFailure
        };

        _db.GuildAutomations.Add(automation);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(automation.Id)
               ?? throw new Exception("Otomasyon oluşturulamadı.");
    }

    public async Task<GuildAutomationDto?> UpdateAsync(string guildId, int id, UpdateGuildAutomationDto dto)
    {
        ValidateDefinition(dto.DefinitionJson);
        ValidateName(dto.Name);

        var automation = await _db.GuildAutomations.FirstOrDefaultAsync(a => a.Id == id && a.GuildId == guildId);
        if (automation == null) return null;

        var featureOn = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        if (!featureOn)
            throw new FeatureDisabledException("Automation özelliği bu sunucuda kapalı.");

        automation.Name = dto.Name.Trim();
        automation.Enabled = dto.Enabled;
        automation.DefinitionJson = dto.DefinitionJson;
        automation.RetryOnFailure = dto.RetryOnFailure;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(string guildId, int id)
    {
        var automation = await _db.GuildAutomations.FirstOrDefaultAsync(a => a.Id == id && a.GuildId == guildId);
        if (automation == null) return false;

        _db.GuildAutomations.Remove(automation);
        await _db.SaveChangesAsync();
        return true;
    }

    private static GuildAutomationDto Map(GuildAutomation a) =>
        new()
        {
            Id = a.Id,
            GuildId = a.GuildId,
            Name = a.Name,
            Enabled = a.Enabled,
            DefinitionJson = a.DefinitionJson,
            RetryOnFailure = a.RetryOnFailure,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Otomasyon adı gereklidir.");
        if (name.Trim().Length > MaxNameLength)
            throw new ArgumentException($"Otomasyon adı en fazla {MaxNameLength} karakter olabilir.");
    }

    private static void ValidateDefinition(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            throw new ArgumentException("Tanım (JSON) gereklidir.");
        if (json.Length > MaxDefinitionLength)
            throw new ArgumentException("Tanım çok uzun.");
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("trigger", out _))
                throw new ArgumentException("Tanımda trigger alanı zorunludur.");
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Geçersiz JSON: " + ex.Message);
        }
    }
}
