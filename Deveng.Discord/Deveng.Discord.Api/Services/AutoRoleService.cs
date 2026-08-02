using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class AutoRoleService : IAutoRoleService
{
    private readonly DevengDbContext _db;

    public AutoRoleService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<AutoRoleDto?> GetByGuildIdAsync(string guildId)
    {
        var setting = await _db.GuildAutoRoleSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null) return null;

        return new AutoRoleDto
        {
            GuildId = setting.GuildId,
            Enabled = setting.Enabled,
            DelaySeconds = setting.DelaySeconds,
            MinAccountAgeDays = setting.MinAccountAgeDays,
            CreatedAt = setting.CreatedAt,
            UpdatedAt = setting.UpdatedAt,
            Roles = await GetRolesAsync(guildId)
        };
    }

    public async Task<AutoRoleDto> UpsertAsync(string guildId, UpsertAutoRoleDto dto)
    {
        if (dto.DelaySeconds is < 0 or > 86400) throw new ArgumentException("Gecikme 0-86400 saniye aralığında olmalıdır.");
        if (dto.Roles.Count > 10) throw new ArgumentException("En fazla 10 otomatik rol tanımlanabilir.");
        if (dto.Roles.Any(r => string.IsNullOrWhiteSpace(r.RoleId))) throw new ArgumentException("RoleId zorunludur.");
        if (dto.Roles.Select(r => r.RoleId).Distinct(StringComparer.Ordinal).Count() != dto.Roles.Count)
            throw new ArgumentException("Aynı rol birden fazla eklenemez.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var setting = await _db.GuildAutoRoleSettings.FirstOrDefaultAsync(s => s.GuildId == guildId);
        if (setting == null)
        {
            setting = new GuildAutoRoleSetting
            {
                GuildId = guildId,
                Enabled = dto.Enabled,
                DelaySeconds = dto.DelaySeconds,
                MinAccountAgeDays = dto.MinAccountAgeDays
            };
            _db.GuildAutoRoleSettings.Add(setting);
        }
        else
        {
            setting.Enabled = dto.Enabled;
            setting.DelaySeconds = dto.DelaySeconds;
            setting.MinAccountAgeDays = dto.MinAccountAgeDays;
        }

        var existingRoles = await _db.GuildAutoRoleRoles.Where(r => r.GuildId == guildId).ToListAsync();
        _db.GuildAutoRoleRoles.RemoveRange(existingRoles);

        foreach (var role in dto.Roles.OrderBy(r => r.SortOrder))
        {
            _db.GuildAutoRoleRoles.Add(new GuildAutoRoleRole
            {
                GuildId = guildId,
                RoleId = role.RoleId,
                SortOrder = role.SortOrder,
                Enabled = role.Enabled,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetByGuildIdAsync(guildId) ?? throw new InvalidOperationException("AutoRole ayarı oluşturulamadı.");
    }

    public async Task InsertAuditAsync(AutoRoleAuditDto dto)
    {
        _db.GuildAutoRoleAudits.Add(new GuildAutoRoleAudit
        {
            GuildId = dto.GuildId,
            UserIdHash = dto.UserIdHash,
            RoleId = dto.RoleId,
            Result = dto.Result,
            ErrorCode = dto.ErrorCode,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task<List<AutoRoleAuditLogDto>> GetAuditAsync(string guildId, int take)
    {
        var limit = Math.Clamp(take, 1, 200);
        return await _db.GuildAutoRoleAudits.AsNoTracking()
            .Where(a => a.GuildId == guildId)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Take(limit)
            .Select(a => new AutoRoleAuditLogDto
            {
                Id = a.Id,
                GuildId = a.GuildId,
                UserIdHash = a.UserIdHash,
                RoleId = a.RoleId,
                Result = a.Result,
                ErrorCode = a.ErrorCode,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    private async Task<List<AutoRoleRoleDto>> GetRolesAsync(string guildId)
    {
        return await _db.GuildAutoRoleRoles.AsNoTracking()
            .Where(r => r.GuildId == guildId)
            .OrderBy(r => r.SortOrder)
            .Select(r => new AutoRoleRoleDto
            {
                RoleId = r.RoleId,
                SortOrder = r.SortOrder,
                Enabled = r.Enabled
            })
            .ToListAsync();
    }
}
