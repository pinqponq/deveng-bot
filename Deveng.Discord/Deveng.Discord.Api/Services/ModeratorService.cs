using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ModeratorService : IModeratorService
{
    private const string FeatureName = "Moderator";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public ModeratorService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<ModeratorDto?> GetModeratorByGuildIdAsync(string guildId)
    {
        var moderator = await _db.Moderators.AsNoTracking()
            .FirstOrDefaultAsync(m => m.GuildId == guildId);
        if (moderator == null) return null;

        var dto = new ModeratorDto
        {
            Id = moderator.Id,
            GuildId = moderator.GuildId,
            Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName),
            CreatedAt = moderator.CreatedAt,
            UpdatedAt = moderator.UpdatedAt,
            Rules = await GetModeratorRulesAsync(moderator.Id),
            ForbiddenWords = await GetForbiddenWordsAsync(moderator.Id)
        };
        return dto;
    }

    private async Task<List<ModeratorRuleDto>> GetModeratorRulesAsync(int moderatorId)
    {
        return await _db.ModeratorRules.AsNoTracking()
            .Where(r => r.ModeratorId == moderatorId)
            .Select(r => new ModeratorRuleDto
            {
                Id = r.Id,
                ModeratorId = r.ModeratorId,
                RuleType = r.RuleType,
                Action = r.Action,
                Enabled = r.Enabled,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync();
    }

    private async Task<List<ForbiddenWordDto>> GetForbiddenWordsAsync(int moderatorId)
    {
        return await _db.ForbiddenWords.AsNoTracking()
            .Where(w => w.ModeratorId == moderatorId)
            .Select(w => new ForbiddenWordDto
            {
                Id = w.Id,
                ModeratorId = w.ModeratorId,
                Word = w.Word,
                CreatedAt = w.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ModeratorDto> CreateOrUpdateModeratorAsync(string guildId, CreateModeratorDto createDto)
    {
        var moderator = await _db.Moderators.FirstOrDefaultAsync(m => m.GuildId == guildId);
        if (moderator == null)
        {
            moderator = new Moderator { GuildId = guildId };
            _db.Moderators.Add(moderator);
            await _db.SaveChangesAsync();
        }

        if (createDto.Rules != null)
        {
            foreach (var rule in createDto.Rules)
                await UpsertModeratorRuleAsync(moderator.Id, rule.RuleType, rule.Action, rule.Enabled);
        }

        return await GetModeratorByGuildIdAsync(guildId)
               ?? throw new Exception("Moderator kaydı oluşturulamadı");
    }

    public async Task<ModeratorDto?> UpdateModeratorAsync(string guildId, UpdateModeratorDto updateDto)
    {
        var existing = await GetModeratorByGuildIdAsync(guildId);
        if (existing == null) return null;

        var moderator = await _db.Moderators.FirstOrDefaultAsync(m => m.GuildId == guildId);
        if (moderator != null)
            await _db.SaveChangesAsync();

        return await GetModeratorByGuildIdAsync(guildId);
    }

    public async Task<bool> DeleteModeratorAsync(string guildId)
    {
        var existing = await GetModeratorByGuildIdAsync(guildId);
        if (existing == null) return false;

        var moderator = await _db.Moderators
            .Include(m => m.Rules)
            .Include(m => m.ForbiddenWords)
            .FirstOrDefaultAsync(m => m.GuildId == guildId);
        if (moderator == null) return false;

        _db.Moderators.Remove(moderator);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => (await GetModeratorByGuildIdAsync(guildId)) != null);
    }

    public async Task<List<ModeratorDto>> GetAllModeratorsAsync()
    {
        var guildIds = await _db.Moderators.AsNoTracking()
            .Select(m => m.GuildId)
            .ToListAsync();

        var results = new List<ModeratorDto>();
        foreach (var guildId in guildIds)
        {
            var moderator = await GetModeratorByGuildIdAsync(guildId);
            if (moderator != null)
                results.Add(moderator);
        }

        return results;
    }

    public async Task<ModeratorRuleDto?> UpdateModeratorRuleAsync(string guildId, string ruleType,
        UpdateModeratorRuleDto updateDto)
    {
        var moderator = await GetModeratorByGuildIdAsync(guildId);
        if (moderator == null) return null;

        await UpsertModeratorRuleAsync(moderator.Id, ruleType, updateDto.Action, updateDto.Enabled ?? true);

        var updatedModerator = await GetModeratorByGuildIdAsync(guildId);
        return updatedModerator?.Rules.FirstOrDefault(r => r.RuleType == ruleType);
    }

    public async Task<ForbiddenWordDto> AddForbiddenWordAsync(string guildId, AddForbiddenWordDto addDto)
    {
        var moderator = await GetModeratorByGuildIdAsync(guildId);
        if (moderator == null)
            throw new Exception("Moderator bulunamadı");

        var word = new ForbiddenWord
        {
            ModeratorId = moderator.Id,
            Word = addDto.Word,
            CreatedAt = DateTime.UtcNow
        };
        _db.ForbiddenWords.Add(word);
        await _db.SaveChangesAsync();

        return new ForbiddenWordDto
        {
            Id = word.Id,
            ModeratorId = moderator.Id,
            Word = addDto.Word,
            CreatedAt = word.CreatedAt
        };
    }

    public async Task<bool> DeleteForbiddenWordAsync(int wordId)
    {
        var word = await _db.ForbiddenWords.FindAsync(wordId);
        if (word == null) return SpNonQuery.AffectedMightBeOk(0);

        _db.ForbiddenWords.Remove(word);
        var rows = await _db.SaveChangesAsync();
        return SpNonQuery.AffectedMightBeOk(rows);
    }

    public async Task<List<ForbiddenWordDto>> GetForbiddenWordsAsync(string guildId)
    {
        var moderator = await GetModeratorByGuildIdAsync(guildId);
        if (moderator == null)
            return new List<ForbiddenWordDto>();
        return moderator.ForbiddenWords;
    }

    private async Task UpsertModeratorRuleAsync(int moderatorId, string ruleType, int action, bool enabled)
    {
        var rule = await _db.ModeratorRules
            .FirstOrDefaultAsync(r => r.ModeratorId == moderatorId && r.RuleType == ruleType);
        if (rule == null)
        {
            _db.ModeratorRules.Add(new ModeratorRule
            {
                ModeratorId = moderatorId,
                RuleType = ruleType,
                Action = action,
                Enabled = enabled
            });
        }
        else
        {
            rule.Action = action;
            rule.Enabled = enabled;
        }

        await _db.SaveChangesAsync();
    }
}
