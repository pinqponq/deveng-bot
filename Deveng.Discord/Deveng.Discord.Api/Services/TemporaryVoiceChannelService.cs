using System.Text.Json;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class TemporaryVoiceChannelService : ITemporaryVoiceChannelService
{
    private const string FeatureName = "TemporaryVoiceChannel";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public TemporaryVoiceChannelService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<TemporaryVoiceChannelLobbyDto?> GetLobbyByIdAsync(int id)
    {
        var lobby = await _db.TemporaryVoiceChannelLobbies.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id);
        if (lobby == null) return null;

        var dto = MapToDto(lobby);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(dto.GuildId, FeatureName);
        dto.Roles = await GetRolesAsync(dto.Id);
        return dto;
    }

    public async Task<List<TemporaryVoiceChannelLobbyDto>> GetLobbiesByGuildIdAsync(string guildId)
    {
        var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        var lobbies = await _db.TemporaryVoiceChannelLobbies.AsNoTracking()
            .Where(l => l.GuildId == guildId)
            .ToListAsync();

        var results = new List<TemporaryVoiceChannelLobbyDto>();
        foreach (var lobby in lobbies)
        {
            var dto = MapToDto(lobby);
            dto.Enabled = featureEnabled;
            dto.Roles = await GetRolesAsync(dto.Id);
            results.Add(dto);
        }

        return results;
    }

    public async Task<TemporaryVoiceChannelLobbyDto> CreateLobbyAsync(CreateTemporaryVoiceChannelLobbyDto createDto)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var lobby = new TemporaryVoiceChannelLobby
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            ChannelName = createDto.ChannelName,
            UserLimit = createDto.UserLimit,
            Bitrate = createDto.Bitrate,
            DeleteAfterMinutes = createDto.DeleteAfterMinutes,
            OwnershipTimeoutMinutes = createDto.OwnershipTimeoutMinutes,
            SyncCategoryPermissions = createDto.SyncCategoryPermissions,
            SyncChannelPermissions = createDto.SyncChannelPermissions,
            CreateTextChannel = createDto.CreateTextChannel,
            RestrictCommandsToTextChannel = createDto.RestrictCommandsToTextChannel,
            PinCommandUsage = createDto.PinCommandUsage,
            RestrictTextChannel = createDto.RestrictTextChannel,
            OwnerCanManageChannel = createDto.OwnerCanManageChannel,
            OwnerCanManagePermissions = createDto.OwnerCanManagePermissions,
            OwnerIsPrioritySpeaker = createDto.OwnerIsPrioritySpeaker,
            OwnerCanMoveMembers = createDto.OwnerCanMoveMembers,
            Enabled = true
        };
        _db.TemporaryVoiceChannelLobbies.Add(lobby);
        await _db.SaveChangesAsync();

        foreach (var roleDto in createDto.Roles)
        {
            _db.TemporaryVoiceChannelRoles.Add(new TemporaryVoiceChannelRole
            {
                LobbyId = lobby.Id,
                RoleId = roleDto.RoleId,
                RoleType = roleDto.RoleType,
                CanManageAccess = roleDto.CanManageAccess,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetLobbyByIdAsync(lobby.Id)
               ?? throw new Exception("TemporaryVoiceChannelLobby kaydı oluşturulamadı");
    }

    public async Task<TemporaryVoiceChannelLobbyDto?> UpdateLobbyAsync(int id,
        CreateTemporaryVoiceChannelLobbyDto updateDto)
    {
        var existing = await GetLobbyByIdAsync(id);
        if (existing == null) return null;

        await using var tx = await _db.Database.BeginTransactionAsync();

        var lobby = await _db.TemporaryVoiceChannelLobbies
            .Include(l => l.Roles)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (lobby == null) return null;

        lobby.ChannelId = updateDto.ChannelId;
        lobby.ChannelName = updateDto.ChannelName;
        lobby.UserLimit = updateDto.UserLimit;
        lobby.Bitrate = updateDto.Bitrate;
        lobby.DeleteAfterMinutes = updateDto.DeleteAfterMinutes;
        lobby.OwnershipTimeoutMinutes = updateDto.OwnershipTimeoutMinutes;
        lobby.SyncCategoryPermissions = updateDto.SyncCategoryPermissions;
        lobby.SyncChannelPermissions = updateDto.SyncChannelPermissions;
        lobby.CreateTextChannel = updateDto.CreateTextChannel;
        lobby.RestrictCommandsToTextChannel = updateDto.RestrictCommandsToTextChannel;
        lobby.PinCommandUsage = updateDto.PinCommandUsage;
        lobby.RestrictTextChannel = updateDto.RestrictTextChannel;
        lobby.OwnerCanManageChannel = updateDto.OwnerCanManageChannel;
        lobby.OwnerCanManagePermissions = updateDto.OwnerCanManagePermissions;
        lobby.OwnerIsPrioritySpeaker = updateDto.OwnerIsPrioritySpeaker;
        lobby.OwnerCanMoveMembers = updateDto.OwnerCanMoveMembers;
        lobby.Enabled = updateDto.Enabled;

        _db.TemporaryVoiceChannelRoles.RemoveRange(lobby.Roles);
        foreach (var roleDto in updateDto.Roles)
        {
            _db.TemporaryVoiceChannelRoles.Add(new TemporaryVoiceChannelRole
            {
                LobbyId = lobby.Id,
                RoleId = roleDto.RoleId,
                RoleType = roleDto.RoleType,
                CanManageAccess = roleDto.CanManageAccess,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetLobbyByIdAsync(id);
    }

    public async Task<bool> DeleteLobbyAsync(int id)
    {
        var existing = await GetLobbyByIdAsync(id);
        if (existing == null) return false;

        var lobby = await _db.TemporaryVoiceChannelLobbies
            .Include(l => l.Roles)
            .Include(l => l.Instances)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (lobby == null) return false;

        _db.TemporaryVoiceChannelLobbies.Remove(lobby);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => (await GetLobbyByIdAsync(id)) != null);
    }

    public async Task<List<TemporaryVoiceChannelLobbyDto>> GetAllLobbiesAsync()
    {
        var lobbies = await _db.TemporaryVoiceChannelLobbies.AsNoTracking()
            .Where(l => l.Enabled)
            .ToListAsync();

        var results = new List<TemporaryVoiceChannelLobbyDto>();
        foreach (var lobby in lobbies)
        {
            var dto = MapToDto(lobby);
            dto.Roles = await GetRolesAsync(dto.Id);
            results.Add(dto);
        }

        return results;
    }

    public async Task<TemporaryVoiceChannelDto?> GetTemporaryVoiceChannelByChannelIdAsync(string channelId)
    {
        var instance = await _db.TemporaryVoiceChannelInstances.AsNoTracking()
            .FirstOrDefaultAsync(i => i.ChannelId == channelId);
        if (instance == null) return null;

        return MapInstanceToDto(instance);
    }

    public async Task<TemporaryVoiceChannelDto> CreateTemporaryVoiceChannelAsync(
        CreateTemporaryVoiceChannelDto createDto)
    {
        var instance = new TemporaryVoiceChannelInstance
        {
            LobbyId = createDto.LobbyId,
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            TextChannelId = createDto.TextChannelId,
            OwnerId = createDto.OwnerId,
            ChannelName = createDto.ChannelName,
            UserLimit = createDto.UserLimit,
            Bitrate = createDto.Bitrate,
            IsLocked = false,
            IsHidden = false,
            BannedUserIds = "[]",
            LastActivityAt = DateTime.UtcNow
        };
        _db.TemporaryVoiceChannelInstances.Add(instance);
        await _db.SaveChangesAsync();

        return await GetTemporaryVoiceChannelByChannelIdAsync(createDto.ChannelId)
               ?? throw new Exception("TemporaryVoiceChannel kaydı oluşturulamadı");
    }

    public async Task<TemporaryVoiceChannelDto?> UpdateTemporaryVoiceChannelOwnerAsync(string channelId, string ownerId)
    {
        var instance = await _db.TemporaryVoiceChannelInstances
            .FirstOrDefaultAsync(i => i.ChannelId == channelId);
        if (instance == null) return null;

        // Yalnızca sahiplik değişir; kilit/gizli/ban ve diğer durum korunur.
        instance.OwnerId = ownerId;
        instance.LastActivityAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetTemporaryVoiceChannelByChannelIdAsync(channelId);
    }

    public async Task<bool> DeleteTemporaryVoiceChannelAsync(string channelId)
    {
        var instance = await _db.TemporaryVoiceChannelInstances
            .FirstOrDefaultAsync(i => i.ChannelId == channelId);
        if (instance == null) return false;

        _db.TemporaryVoiceChannelInstances.Remove(instance);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => (await GetTemporaryVoiceChannelByChannelIdAsync(channelId)) != null);
    }

    private async Task<List<TemporaryVoiceChannelRoleDto>> GetRolesAsync(int lobbyId)
    {
        return await _db.TemporaryVoiceChannelRoles.AsNoTracking()
            .Where(r => r.LobbyId == lobbyId)
            .Select(r => new TemporaryVoiceChannelRoleDto
            {
                Id = r.Id,
                RoleId = r.RoleId,
                RoleType = r.RoleType,
                CanManageAccess = r.CanManageAccess
            })
            .ToListAsync();
    }

    private static TemporaryVoiceChannelLobbyDto MapToDto(TemporaryVoiceChannelLobby lobby) => new()
    {
        Id = lobby.Id,
        GuildId = lobby.GuildId,
        ChannelId = lobby.ChannelId,
        ChannelName = lobby.ChannelName,
        UserLimit = lobby.UserLimit,
        Bitrate = lobby.Bitrate,
        DeleteAfterMinutes = lobby.DeleteAfterMinutes,
        OwnershipTimeoutMinutes = lobby.OwnershipTimeoutMinutes,
        SyncCategoryPermissions = lobby.SyncCategoryPermissions,
        SyncChannelPermissions = lobby.SyncChannelPermissions,
        CreateTextChannel = lobby.CreateTextChannel,
        RestrictCommandsToTextChannel = lobby.RestrictCommandsToTextChannel,
        PinCommandUsage = lobby.PinCommandUsage,
        RestrictTextChannel = lobby.RestrictTextChannel,
        OwnerCanManageChannel = lobby.OwnerCanManageChannel,
        OwnerCanManagePermissions = lobby.OwnerCanManagePermissions,
        OwnerIsPrioritySpeaker = lobby.OwnerIsPrioritySpeaker,
        OwnerCanMoveMembers = lobby.OwnerCanMoveMembers,
        Enabled = lobby.Enabled,
        Roles = new List<TemporaryVoiceChannelRoleDto>()
    };

    private static TemporaryVoiceChannelDto MapInstanceToDto(TemporaryVoiceChannelInstance instance) => new()
    {
        Id = instance.Id,
        LobbyId = instance.LobbyId,
        GuildId = instance.GuildId,
        ChannelId = instance.ChannelId,
        TextChannelId = instance.TextChannelId,
        OwnerId = instance.OwnerId,
        ChannelName = instance.ChannelName,
        IsLocked = instance.IsLocked,
        IsHidden = instance.IsHidden,
        UserLimit = instance.UserLimit,
        Bitrate = instance.Bitrate,
        BannedUserIds = string.IsNullOrWhiteSpace(instance.BannedUserIds)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(instance.BannedUserIds) ?? new List<string>(),
        LastActivityAt = instance.LastActivityAt ?? instance.CreatedAt,
        CreatedAt = instance.CreatedAt
    };
}
