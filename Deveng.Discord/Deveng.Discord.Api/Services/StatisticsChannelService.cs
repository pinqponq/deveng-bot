using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class StatisticsChannelService : IStatisticsChannelService
{
    private const string FeatureName = "StatisticsChannel";
    private const string RoleCounterType = "Rol Sayacı";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public StatisticsChannelService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<StatisticsChannelDto?> GetStatisticsChannelByGuildIdAsync(string guildId)
    {
        var channels = await LoadChannelsAsync(_db.StatisticsChannels.AsNoTracking()
            .Where(c => c.GuildId == guildId));

        var first = channels.FirstOrDefault();
        if (first != null)
            first.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return first;
    }

    public async Task<StatisticsChannelDto?> GetStatisticsChannelByGuildIdAndTypeAsync(string guildId,
        string counterType)
    {
        var channel = await _db.StatisticsChannels.AsNoTracking()
            .FirstOrDefaultAsync(c => c.GuildId == guildId && c.CounterType == counterType);
        if (channel == null) return null;

        var dto = MapToDto(channel);
        if (dto.CounterType == RoleCounterType)
            dto.Roles = await GetStatisticsChannelRolesAsync(channel.Id);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<StatisticsChannelDto?> GetStatisticsChannelByIdAsync(int id)
    {
        var channel = await _db.StatisticsChannels.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (channel == null) return null;

        var dto = MapToDto(channel);
        dto.Roles = await GetStatisticsChannelRolesAsync(channel.Id);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(channel.GuildId, FeatureName);
        return dto;
    }

    public async Task<List<StatisticsChannelDto>> GetAllStatisticsChannelsAsync()
    {
        return await LoadChannelsAsync(_db.StatisticsChannels.AsNoTracking());
    }

    public async Task<List<StatisticsChannelDto>> GetEnabledStatisticsChannelsByGuildIdAsync(string guildId)
    {
        var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        if (!featureEnabled)
            return new List<StatisticsChannelDto>();

        return await LoadChannelsAsync(_db.StatisticsChannels.AsNoTracking()
            .Where(c => c.GuildId == guildId && c.Enabled));
    }

    public async Task<StatisticsChannelDto> CreateStatisticsChannelAsync(CreateStatisticsChannelDto createDto)
    {
        var channel = new StatisticsChannel
        {
            GuildId = createDto.GuildId,
            CounterType = createDto.CounterType,
            ChannelId = createDto.ChannelId,
            ChannelName = createDto.ChannelName,
            Enabled = createDto.Enabled
        };
        _db.StatisticsChannels.Add(channel);
        await _db.SaveChangesAsync();

        if (createDto.CounterType == RoleCounterType && createDto.RoleIds != null && createDto.RoleIds.Any())
        {
            foreach (var roleId in createDto.RoleIds)
                await AddStatisticsChannelRoleAsync(channel.Id, roleId, null, 0);
        }

        return await GetStatisticsChannelByIdAsync(channel.Id)
               ?? throw new Exception("İstatistik kanalı oluşturulamadı");
    }

    public async Task<StatisticsChannelDto?> UpdateStatisticsChannelAsync(int id, UpdateStatisticsChannelDto updateDto)
    {
        var existing = await GetStatisticsChannelByIdAsync(id);
        if (existing == null) return null;

        var channel = await _db.StatisticsChannels.FirstOrDefaultAsync(c => c.Id == id);
        if (channel == null) return null;

        if (updateDto.ChannelId != null)
            channel.ChannelId = updateDto.ChannelId;
        if (updateDto.ChannelName != null)
            channel.ChannelName = updateDto.ChannelName;

        await _db.SaveChangesAsync();

        if (existing.CounterType == RoleCounterType && updateDto.RoleIds != null)
        {
            var currentRoles = await _db.StatisticsChannelRoles
                .Where(r => r.StatisticsChannelId == id)
                .ToListAsync();
            _db.StatisticsChannelRoles.RemoveRange(currentRoles);

            foreach (var roleId in updateDto.RoleIds)
            {
                _db.StatisticsChannelRoles.Add(new StatisticsChannelRole
                {
                    StatisticsChannelId = id,
                    RoleId = roleId,
                    RoleName = null,
                    OrderIndex = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
        }

        return await GetStatisticsChannelByIdAsync(id);
    }

    public async Task<bool> DeleteStatisticsChannelAsync(int id)
    {
        var existing = await GetStatisticsChannelByIdAsync(id);
        if (existing == null) return false;

        var channel = await _db.StatisticsChannels
            .Include(c => c.Roles)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (channel == null) return false;

        _db.StatisticsChannels.Remove(channel);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => (await GetStatisticsChannelByIdAsync(id)) != null);
    }

    public async Task<int> UpdateAndGetPeakOnlineAsync(string guildId, string counterType, int currentOnline)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var channel = await _db.StatisticsChannels
            .FirstOrDefaultAsync(c => c.GuildId == guildId && c.CounterType == counterType);
        if (channel == null)
        {
            await tx.CommitAsync();
            return currentOnline;
        }

        if (currentOnline > channel.PeakOnlineCount)
            channel.PeakOnlineCount = currentOnline;

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return channel.PeakOnlineCount;
    }

    private async Task<List<StatisticsChannelDto>> LoadChannelsAsync(IQueryable<StatisticsChannel> query)
    {
        var channelRows = await query
            .OrderBy(c => c.CounterType)
            .ToListAsync();

        var channels = channelRows.Select(MapToDto).ToList();

        foreach (var channel in channels.Where(c => c.CounterType == RoleCounterType))
            channel.Roles = await GetStatisticsChannelRolesAsync(channel.Id);

        return channels;
    }

    private async Task<List<StatisticsChannelRoleDto>> GetStatisticsChannelRolesAsync(int statisticsChannelId)
    {
        var rows = await _db.StatisticsChannelRoles.AsNoTracking()
            .Where(r => r.StatisticsChannelId == statisticsChannelId)
            .OrderBy(r => r.OrderIndex)
            .ToListAsync();
        return rows.Select(MapRoleToDto).ToList();
    }

    private async Task AddStatisticsChannelRoleAsync(int statisticsChannelId, string roleId, string? roleName,
        int orderIndex)
    {
        _db.StatisticsChannelRoles.Add(new StatisticsChannelRole
        {
            StatisticsChannelId = statisticsChannelId,
            RoleId = roleId,
            RoleName = roleName,
            OrderIndex = orderIndex,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    private static StatisticsChannelDto MapToDto(StatisticsChannel channel) => new()
    {
        Id = channel.Id,
        GuildId = channel.GuildId,
        CounterType = channel.CounterType,
        ChannelId = channel.ChannelId,
        ChannelName = channel.ChannelName,
        Enabled = channel.Enabled,
        CreatedAt = channel.CreatedAt,
        UpdatedAt = channel.UpdatedAt,
        Roles = new List<StatisticsChannelRoleDto>()
    };

    private static StatisticsChannelRoleDto MapRoleToDto(StatisticsChannelRole role) => new()
    {
        Id = role.Id,
        StatisticsChannelId = role.StatisticsChannelId,
        RoleId = role.RoleId,
        RoleName = role.RoleName,
        OrderIndex = role.OrderIndex,
        CreatedAt = role.CreatedAt
    };
}
