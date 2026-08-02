using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class GiveawayService : IGiveawayService
{
    private readonly DevengDbContext _db;

    public GiveawayService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<GiveawayDto?> GetGiveawayByIdAsync(int id)
    {
        var giveaway = await GiveawayGraphQuery()
            .FirstOrDefaultAsync(g => g.Id == id);
        if (giveaway == null) return null;

        var participantCount = await _db.GiveawayParticipants.CountAsync(p => p.GiveawayId == id);
        return MapToDto(giveaway, participantCount);
    }

    public async Task<GiveawayDto?> GetGiveawayByMessageIdAsync(string messageId)
    {
        var giveaway = await GiveawayGraphQuery()
            .FirstOrDefaultAsync(g => g.MessageId == messageId);
        if (giveaway == null) return null;

        var participantCount = await _db.GiveawayParticipants.CountAsync(p => p.GiveawayId == giveaway.Id);
        return MapToDto(giveaway, participantCount);
    }

    public async Task<List<GiveawayDto>> GetGiveawaysByGuildIdAsync(string guildId)
    {
        var giveaways = await GiveawayGraphQuery()
            .Where(g => g.GuildId == guildId)
            .OrderBy(g => g.Id)
            .ToListAsync();
        return await MapGiveawayListAsync(giveaways);
    }

    public async Task<List<GiveawayDto>> GetActiveGiveawaysAsync()
    {
        var giveaways = await GiveawayGraphQuery()
            .Where(g => g.IsActive && !g.IsEnded)
            .OrderBy(g => g.Id)
            .ToListAsync();
        return await MapGiveawayListAsync(giveaways);
    }

    public async Task<GiveawayDto> CreateGiveawayAsync(CreateGiveawayDto createDto)
    {
        var now = DateTime.UtcNow;
        var giveaway = new Giveaway
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            Name = createDto.Name,
            Prize = createDto.Prize,
            WinnerCount = createDto.WinnerCount,
            EndDate = createDto.EndDate,
            TimeZone = createDto.TimeZone ?? "Europe/Istanbul",
            RolePermissionType = createDto.RolePermissionType,
            IsEmbed = createDto.IsEmbed,
            EmbedTitle = createDto.EmbedTitle,
            EmbedDescription = createDto.EmbedDescription,
            EmbedColor = createDto.EmbedColor,
            EmbedThumbnail = createDto.EmbedThumbnail,
            EmbedImage = createDto.EmbedImage,
            EmbedFooter = createDto.EmbedFooter,
            EmbedTitleUrl = createDto.EmbedTitleUrl,
            EmbedAuthorName = createDto.EmbedAuthorName,
            EmbedAuthorIcon = createDto.EmbedAuthorIcon,
            EmbedAuthorUrl = createDto.EmbedAuthorUrl,
            EmbedFooterIcon = createDto.EmbedFooterIcon,
            EmbedUseTimestamp = createDto.EmbedUseTimestamp,
            EmbedFieldsJson = createDto.EmbedFieldsJson,
            CreatedAt = now,
            UpdatedAt = now
        };

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.Giveaways.Add(giveaway);
        await _db.SaveChangesAsync();

        foreach (var role in createDto.Roles)
        {
            _db.GiveawayRoles.Add(new GiveawayRole
            {
                GiveawayId = giveaway.Id,
                RoleId = role.RoleId,
                WinChanceMultiplier = role.WinChanceMultiplier,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        foreach (var roleId in createDto.AllowedRoleIds)
        {
            _db.GiveawayAllowedRoles.Add(new GiveawayAllowedRole
            {
                GiveawayId = giveaway.Id,
                RoleId = roleId,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var result = await GetGiveawayByIdAsync(giveaway.Id);
        return result ?? throw new InvalidOperationException("Çekiliş oluşturulamadı");
    }

    public async Task<GiveawayDto?> UpdateGiveawayAsync(int id, UpdateGiveawayDto updateDto)
    {
        var giveaway = await _db.Giveaways
            .Include(g => g.Roles)
            .Include(g => g.AllowedRoles)
            .FirstOrDefaultAsync(g => g.Id == id);
        if (giveaway == null) return null;

        await using var tx = await _db.Database.BeginTransactionAsync();

        if (updateDto.ChannelId != null) giveaway.ChannelId = updateDto.ChannelId;
        if (updateDto.MessageId != null) giveaway.MessageId = updateDto.MessageId;
        if (updateDto.Name != null) giveaway.Name = updateDto.Name;
        if (updateDto.Prize != null) giveaway.Prize = updateDto.Prize;
        if (updateDto.WinnerCount.HasValue) giveaway.WinnerCount = updateDto.WinnerCount.Value;
        if (updateDto.EndDate.HasValue) giveaway.EndDate = updateDto.EndDate.Value;
        if (updateDto.TimeZone != null) giveaway.TimeZone = updateDto.TimeZone;
        if (updateDto.IsActive.HasValue) giveaway.IsActive = updateDto.IsActive.Value;
        if (updateDto.IsEnded.HasValue) giveaway.IsEnded = updateDto.IsEnded.Value;
        if (updateDto.RolePermissionType.HasValue) giveaway.RolePermissionType = updateDto.RolePermissionType.Value;
        if (updateDto.IsEmbed.HasValue) giveaway.IsEmbed = updateDto.IsEmbed.Value;
        if (updateDto.EmbedTitle != null) giveaway.EmbedTitle = updateDto.EmbedTitle;
        if (updateDto.EmbedDescription != null) giveaway.EmbedDescription = updateDto.EmbedDescription;
        if (updateDto.EmbedColor != null) giveaway.EmbedColor = updateDto.EmbedColor;
        if (updateDto.EmbedThumbnail != null) giveaway.EmbedThumbnail = updateDto.EmbedThumbnail;
        if (updateDto.EmbedImage != null) giveaway.EmbedImage = updateDto.EmbedImage;
        if (updateDto.EmbedFooter != null) giveaway.EmbedFooter = updateDto.EmbedFooter;
        if (updateDto.EmbedTitleUrl != null) giveaway.EmbedTitleUrl = updateDto.EmbedTitleUrl;
        if (updateDto.EmbedAuthorName != null) giveaway.EmbedAuthorName = updateDto.EmbedAuthorName;
        if (updateDto.EmbedAuthorIcon != null) giveaway.EmbedAuthorIcon = updateDto.EmbedAuthorIcon;
        if (updateDto.EmbedAuthorUrl != null) giveaway.EmbedAuthorUrl = updateDto.EmbedAuthorUrl;
        if (updateDto.EmbedFooterIcon != null) giveaway.EmbedFooterIcon = updateDto.EmbedFooterIcon;
        if (updateDto.EmbedUseTimestamp.HasValue) giveaway.EmbedUseTimestamp = updateDto.EmbedUseTimestamp.Value;
        if (updateDto.EmbedFieldsJson != null) giveaway.EmbedFieldsJson = updateDto.EmbedFieldsJson;
        giveaway.UpdatedAt = DateTime.UtcNow;

        if (updateDto.Roles != null)
        {
            _db.GiveawayRoles.RemoveRange(giveaway.Roles);
            var now = DateTime.UtcNow;
            foreach (var role in updateDto.Roles)
            {
                _db.GiveawayRoles.Add(new GiveawayRole
                {
                    GiveawayId = id,
                    RoleId = role.RoleId,
                    WinChanceMultiplier = role.WinChanceMultiplier,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        if (updateDto.AllowedRoleIds != null)
        {
            _db.GiveawayAllowedRoles.RemoveRange(giveaway.AllowedRoles);
            var now = DateTime.UtcNow;
            foreach (var roleId in updateDto.AllowedRoleIds)
            {
                _db.GiveawayAllowedRoles.Add(new GiveawayAllowedRole
                {
                    GiveawayId = id,
                    RoleId = roleId,
                    CreatedAt = now
                });
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetGiveawayByIdAsync(id);
    }

    public async Task<bool> DeleteGiveawayAsync(int id)
    {
        var giveaway = await _db.Giveaways.FindAsync(id);
        if (giveaway == null) return false;

        _db.Giveaways.Remove(giveaway);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => await _db.Giveaways.AnyAsync(g => g.Id == id));
    }

    public async Task<bool> UpdateMessageIdAsync(int id, string messageId)
    {
        var giveaway = await _db.Giveaways.FindAsync(id);
        if (giveaway == null) return false;

        giveaway.MessageId = messageId;
        giveaway.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EndGiveawayAsync(int id)
    {
        var giveaway = await _db.Giveaways.FindAsync(id);
        if (giveaway == null) return false;

        giveaway.IsActive = false;
        giveaway.IsEnded = true;
        giveaway.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddParticipantAsync(int giveawayId, string userId)
    {
        try
        {
            _db.GiveawayParticipants.Add(new GiveawayParticipant
            {
                GiveawayId = giveawayId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public async Task<bool> RemoveParticipantAsync(int giveawayId, string userId)
    {
        var participant = await _db.GiveawayParticipants
            .FirstOrDefaultAsync(p => p.GiveawayId == giveawayId && p.UserId == userId);
        if (participant == null) return false;

        _db.GiveawayParticipants.Remove(participant);
        var rows = await _db.SaveChangesAsync();
        return SpNonQuery.AffectedMightBeOk(rows);
    }

    public async Task<List<GiveawayParticipantDto>> GetParticipantsAsync(int giveawayId)
    {
        return await _db.GiveawayParticipants.AsNoTracking()
            .Where(p => p.GiveawayId == giveawayId)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new GiveawayParticipantDto
            {
                Id = p.Id,
                GiveawayId = p.GiveawayId,
                UserId = p.UserId,
                JoinedAt = p.JoinedAt
            })
            .ToListAsync();
    }

    public async Task<bool> AddWinnerAsync(int giveawayId, string userId)
    {
        try
        {
            _db.GiveawayWinners.Add(new GiveawayWinner
            {
                GiveawayId = giveawayId,
                UserId = userId,
                WonAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public async Task<List<GiveawayWinnerDto>> GetWinnersAsync(int giveawayId)
    {
        return await _db.GiveawayWinners.AsNoTracking()
            .Where(w => w.GiveawayId == giveawayId)
            .OrderBy(w => w.WonAt)
            .Select(w => new GiveawayWinnerDto
            {
                Id = w.Id,
                GiveawayId = w.GiveawayId,
                UserId = w.UserId,
                WonAt = w.WonAt
            })
            .ToListAsync();
    }

    public async Task<bool> AddRoleAsync(int giveawayId, string roleId, decimal winChanceMultiplier)
    {
        var now = DateTime.UtcNow;
        _db.GiveawayRoles.Add(new GiveawayRole
        {
            GiveawayId = giveawayId,
            RoleId = roleId,
            WinChanceMultiplier = winChanceMultiplier,
            CreatedAt = now,
            UpdatedAt = now
        });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveRoleAsync(int giveawayId, string roleId)
    {
        var role = await _db.GiveawayRoles
            .FirstOrDefaultAsync(r => r.GiveawayId == giveawayId && r.RoleId == roleId);
        if (role == null) return false;

        _db.GiveawayRoles.Remove(role);
        var rows = await _db.SaveChangesAsync();
        return SpNonQuery.AffectedMightBeOk(rows);
    }

    public async Task<List<GiveawayRoleDto>> GetRolesAsync(int giveawayId)
    {
        return await _db.GiveawayRoles.AsNoTracking()
            .Where(r => r.GiveawayId == giveawayId)
            .OrderBy(r => r.Id)
            .Select(r => new GiveawayRoleDto
            {
                Id = r.Id,
                GiveawayId = r.GiveawayId,
                RoleId = r.RoleId,
                WinChanceMultiplier = r.WinChanceMultiplier,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<bool> AddAllowedRoleAsync(int giveawayId, string roleId)
    {
        _db.GiveawayAllowedRoles.Add(new GiveawayAllowedRole
        {
            GiveawayId = giveawayId,
            RoleId = roleId,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveAllowedRoleAsync(int giveawayId, string roleId)
    {
        var allowed = await _db.GiveawayAllowedRoles
            .FirstOrDefaultAsync(r => r.GiveawayId == giveawayId && r.RoleId == roleId);
        if (allowed == null) return false;

        _db.GiveawayAllowedRoles.Remove(allowed);
        var rows = await _db.SaveChangesAsync();
        return SpNonQuery.AffectedMightBeOk(rows);
    }

    public async Task<List<GiveawayAllowedRoleDto>> GetAllowedRolesAsync(int giveawayId)
    {
        return await _db.GiveawayAllowedRoles.AsNoTracking()
            .Where(r => r.GiveawayId == giveawayId)
            .OrderBy(r => r.Id)
            .Select(r => new GiveawayAllowedRoleDto
            {
                Id = r.Id,
                GiveawayId = r.GiveawayId,
                RoleId = r.RoleId,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    private IQueryable<Giveaway> GiveawayGraphQuery() =>
        _db.Giveaways.AsNoTracking()
            .Include(g => g.Roles)
            .Include(g => g.AllowedRoles)
            .Include(g => g.Winners);

    private async Task<List<GiveawayDto>> MapGiveawayListAsync(List<Giveaway> giveaways)
    {
        if (giveaways.Count == 0) return [];

        var ids = giveaways.Select(g => g.Id).ToList();
        var counts = await _db.GiveawayParticipants
            .Where(p => ids.Contains(p.GiveawayId))
            .GroupBy(p => p.GiveawayId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        return giveaways
            .Select(g => MapToDto(g, counts.GetValueOrDefault(g.Id)))
            .ToList();
    }

    private static DateTime AsUtcFromDb(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private static GiveawayDto MapToDto(Giveaway g, int participantCount) => new()
    {
        Id = g.Id,
        GuildId = g.GuildId,
        ChannelId = g.ChannelId,
        MessageId = g.MessageId,
        Name = g.Name,
        Prize = g.Prize,
        WinnerCount = g.WinnerCount,
        EndDate = AsUtcFromDb(g.EndDate),
        TimeZone = g.TimeZone,
        IsActive = g.IsActive,
        IsEnded = g.IsEnded,
        RolePermissionType = g.RolePermissionType,
        IsEmbed = g.IsEmbed,
        EmbedTitle = g.EmbedTitle,
        EmbedDescription = g.EmbedDescription,
        EmbedColor = g.EmbedColor,
        EmbedThumbnail = g.EmbedThumbnail,
        EmbedImage = g.EmbedImage,
        EmbedFooter = g.EmbedFooter,
        EmbedTitleUrl = g.EmbedTitleUrl,
        EmbedAuthorName = g.EmbedAuthorName,
        EmbedAuthorIcon = g.EmbedAuthorIcon,
        EmbedAuthorUrl = g.EmbedAuthorUrl,
        EmbedFooterIcon = g.EmbedFooterIcon,
        EmbedUseTimestamp = g.EmbedUseTimestamp,
        EmbedFieldsJson = g.EmbedFieldsJson,
        CreatedAt = AsUtcFromDb(g.CreatedAt),
        UpdatedAt = AsUtcFromDb(g.UpdatedAt),
        ParticipantCount = participantCount,
        Roles = g.Roles.OrderBy(r => r.Id).Select(r => new GiveawayRoleDto
        {
            Id = r.Id,
            GiveawayId = r.GiveawayId,
            RoleId = r.RoleId,
            WinChanceMultiplier = r.WinChanceMultiplier,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        }).ToList(),
        AllowedRoles = g.AllowedRoles.OrderBy(r => r.Id).Select(r => new GiveawayAllowedRoleDto
        {
            Id = r.Id,
            GiveawayId = r.GiveawayId,
            RoleId = r.RoleId,
            CreatedAt = r.CreatedAt
        }).ToList(),
        Winners = g.Winners.OrderBy(w => w.WonAt).Select(w => new GiveawayWinnerDto
        {
            Id = w.Id,
            GiveawayId = w.GiveawayId,
            UserId = w.UserId,
            WonAt = w.WonAt
        }).ToList()
    };
}
