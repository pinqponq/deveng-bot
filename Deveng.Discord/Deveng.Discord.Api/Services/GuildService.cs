using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class GuildService : IGuildService
{
    private readonly DevengDbContext _db;

    public GuildService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<GuildDto?> GetGuildByGuildIdAsync(string guildId)
    {
        var guild = await _db.Guilds.AsNoTracking()
            .FirstOrDefaultAsync(g => g.GuildId == guildId);
        return guild == null ? null : MapToDto(guild);
    }

    public async Task<GuildDto> CreateGuildAsync(CreateGuildDto createDto)
    {
        var existing = await _db.Guilds.AnyAsync(g => g.GuildId == createDto.GuildId);
        if (existing)
            throw new InvalidOperationException($"Guild zaten mevcut (GuildId: {createDto.GuildId})");

        var now = DateTime.UtcNow;
        var guild = new Guild
        {
            GuildId = createDto.GuildId,
            GuildName = createDto.GuildName,
            OwnerId = createDto.OwnerId,
            MemberCount = createDto.MemberCount,
            JoinedAt = createDto.JoinedAt,
            LastSeen = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Guilds.Add(guild);
        await _db.SaveChangesAsync();

        return MapToDto(guild);
    }

    public async Task<GuildDto?> UpdateGuildAsync(string guildId, UpdateGuildDto updateDto)
    {
        var guild = await _db.Guilds.FirstOrDefaultAsync(g => g.GuildId == guildId);
        if (guild == null) return null;

        if (updateDto.GuildName != null) guild.GuildName = updateDto.GuildName;
        if (updateDto.OwnerId != null) guild.OwnerId = updateDto.OwnerId;
        if (updateDto.MemberCount.HasValue) guild.MemberCount = updateDto.MemberCount.Value;
        if (updateDto.JoinedAt.HasValue) guild.JoinedAt = updateDto.JoinedAt;
        if (updateDto.LastSeen.HasValue) guild.LastSeen = updateDto.LastSeen;

        await _db.SaveChangesAsync();
        return MapToDto(guild);
    }

    public async Task<bool> DeleteGuildAsync(string guildId)
    {
        var guild = await _db.Guilds.FirstOrDefaultAsync(g => g.GuildId == guildId);
        if (guild == null) return false;

        _db.Guilds.Remove(guild);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<GuildDto>> GetAllGuildsAsync()
    {
        return await _db.Guilds.AsNoTracking()
            .OrderBy(g => g.Id)
            .Select(g => MapToDto(g))
            .ToListAsync();
    }

    public async Task<List<GuildDto>> GetGuildsForDiscordUserGuildIdsAsync(IReadOnlyCollection<string> discordGuildIds)
    {
        if (discordGuildIds == null || discordGuildIds.Count == 0)
            return [];

        var distinct = discordGuildIds
            .Where(static id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (distinct.Length == 0)
            return [];

        return await _db.Guilds.AsNoTracking()
            .Where(g => distinct.Contains(g.GuildId))
            .Select(g => MapToDto(g))
            .ToListAsync();
    }

    private static GuildDto MapToDto(Guild g) => new()
    {
        Id = g.Id,
        GuildId = g.GuildId,
        GuildName = g.GuildName,
        OwnerId = g.OwnerId,
        MemberCount = g.MemberCount,
        JoinedAt = g.JoinedAt,
        LastSeen = g.LastSeen ?? g.UpdatedAt,
        CreatedAt = g.CreatedAt,
        UpdatedAt = g.UpdatedAt
    };
}
