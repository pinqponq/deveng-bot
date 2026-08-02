using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class HelpCommandService : IHelpCommandService
{
    private const string FeatureName = "HelpCommand";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly ILogger<HelpCommandService> _logger;

    public HelpCommandService(DevengDbContext db, IGuildFeatureService guildFeatureService, ILogger<HelpCommandService> logger)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _logger = logger;
    }

    public async Task<List<HelpCommandDto>> GetHelpCommandsAsync(string guildId)
    {
        try
        {
            var results = await HelpCommandQuery()
                .Where(h => h.GuildId == guildId)
                .OrderBy(h => h.CommandName)
                .ToListAsync();

            var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
            return results.Select(h =>
            {
                var dto = MapToDto(h);
                dto.Enabled = featureEnabled;
                return dto;
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[HelpCommandService] GetHelpCommandsAsync failed GuildId={GuildId}", guildId);
            return new List<HelpCommandDto>();
        }
    }

    public async Task<HelpCommandDto?> GetHelpCommandByNameAsync(string guildId, string commandName)
    {
        var helpCommand = await HelpCommandQuery()
            .FirstOrDefaultAsync(h => h.GuildId == guildId && h.CommandName == commandName);

        if (helpCommand == null) return null;

        var dto = MapToDto(helpCommand);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<HelpCommandDto?> GetHelpCommandByIdAsync(int id)
    {
        var helpCommand = await HelpCommandQuery().FirstOrDefaultAsync(h => h.Id == id);
        if (helpCommand == null) return null;

        var dto = MapToDto(helpCommand);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(helpCommand.GuildId, FeatureName);
        return dto;
    }

    public async Task<HelpCommandDto> CreateOrUpdateHelpCommandAsync(string guildId, CreateHelpCommandDto createDto)
    {
        if (string.IsNullOrWhiteSpace(createDto.CommandName))
            throw new ArgumentException("Komut adı gereklidir");

        var commandName = createDto.CommandName.Trim();
        var existing = await _db.HelpCommands
            .FirstOrDefaultAsync(h => h.GuildId == guildId && h.CommandName == commandName);

        int commandId;
        if (existing != null)
        {
            ApplyCreateDto(existing, createDto);
            commandId = existing.Id;
        }
        else
        {
            var command = new HelpCommand
            {
                GuildId = guildId,
                CommandName = commandName
            };
            ApplyCreateDto(command, createDto);
            _db.HelpCommands.Add(command);
            await _db.SaveChangesAsync();
            commandId = command.Id;
        }

        await UpdateHelpCommandRolesAsync(commandId, createDto.RoleIds);
        await UpdateHelpCommandChannelsAsync(commandId, createDto.ChannelIds);
        await _db.SaveChangesAsync();

        return await GetHelpCommandByIdAsync(commandId)
               ?? throw new Exception("Help command oluşturulamadı");
    }

    public async Task<HelpCommandDto?> UpdateHelpCommandAsync(int id, UpdateHelpCommandDto updateDto)
    {
        var existing = await GetHelpCommandByIdAsync(id);
        if (existing == null) return null;

        var command = await _db.HelpCommands.FirstOrDefaultAsync(h => h.Id == id);
        if (command == null) return null;

        if (updateDto.Description != null) command.Description = updateDto.Description;
        if (updateDto.CooldownType.HasValue) command.CooldownType = updateDto.CooldownType.Value;
        if (updateDto.CooldownSeconds.HasValue) command.CooldownSeconds = updateDto.CooldownSeconds;
        if (updateDto.SendAsDM.HasValue) command.SendAsDM = updateDto.SendAsDM.Value;
        if (updateDto.DeleteAfterUse.HasValue) command.DeleteAfterUse = updateDto.DeleteAfterUse.Value;
        if (updateDto.DisableReply.HasValue) command.DisableReply = updateDto.DisableReply.Value;
        if (updateDto.RolePermissionType.HasValue) command.RolePermissionType = updateDto.RolePermissionType.Value;
        if (updateDto.ChannelPermissionType.HasValue) command.ChannelPermissionType = updateDto.ChannelPermissionType.Value;
        if (updateDto.IsEmbed.HasValue) command.IsEmbed = updateDto.IsEmbed.Value;
        if (updateDto.Message != null) command.Message = updateDto.Message;
        if (updateDto.EmbedTitle != null) command.EmbedTitle = updateDto.EmbedTitle;
        if (updateDto.EmbedDescription != null) command.EmbedDescription = updateDto.EmbedDescription;
        if (updateDto.EmbedColor != null) command.EmbedColor = updateDto.EmbedColor;
        if (updateDto.EmbedThumbnail != null) command.EmbedThumbnail = updateDto.EmbedThumbnail;
        if (updateDto.EmbedImage != null) command.EmbedImage = updateDto.EmbedImage;
        if (updateDto.EmbedFooter != null) command.EmbedFooter = updateDto.EmbedFooter;
        if (updateDto.EmbedTitleUrl != null) command.EmbedTitleUrl = updateDto.EmbedTitleUrl;
        if (updateDto.EmbedAuthorName != null) command.EmbedAuthorName = updateDto.EmbedAuthorName;
        if (updateDto.EmbedAuthorIcon != null) command.EmbedAuthorIcon = updateDto.EmbedAuthorIcon;
        if (updateDto.EmbedAuthorUrl != null) command.EmbedAuthorUrl = updateDto.EmbedAuthorUrl;
        if (updateDto.EmbedFooterIcon != null) command.EmbedFooterIcon = updateDto.EmbedFooterIcon;
        if (updateDto.EmbedUseTimestamp.HasValue) command.EmbedUseTimestamp = updateDto.EmbedUseTimestamp.Value;
        if (updateDto.EmbedFieldsJson != null) command.EmbedFieldsJson = updateDto.EmbedFieldsJson;

        if (updateDto.RoleIds != null) await UpdateHelpCommandRolesAsync(id, updateDto.RoleIds);
        if (updateDto.ChannelIds != null) await UpdateHelpCommandChannelsAsync(id, updateDto.ChannelIds);

        await _db.SaveChangesAsync();
        return await GetHelpCommandByIdAsync(id);
    }

    public async Task<bool> DeleteHelpCommandAsync(int id)
    {
        var command = await _db.HelpCommands.FindAsync(id);
        if (command == null) return false;

        _db.HelpCommands.Remove(command);
        await _db.SaveChangesAsync();
        return true;
    }

    private IQueryable<HelpCommand> HelpCommandQuery() =>
        _db.HelpCommands.AsNoTracking()
            .Include(h => h.Roles)
            .Include(h => h.Channels);

    private static void ApplyCreateDto(HelpCommand command, CreateHelpCommandDto dto)
    {
        command.Description = dto.Description;
        command.CooldownType = dto.CooldownType;
        command.CooldownSeconds = dto.CooldownSeconds;
        command.SendAsDM = dto.SendAsDM;
        command.DeleteAfterUse = dto.DeleteAfterUse;
        command.DisableReply = dto.DisableReply;
        command.RolePermissionType = dto.RolePermissionType;
        command.ChannelPermissionType = dto.ChannelPermissionType;
        command.IsEmbed = dto.IsEmbed;
        command.Message = dto.Message;
        command.EmbedTitle = dto.EmbedTitle;
        command.EmbedDescription = dto.EmbedDescription;
        command.EmbedColor = dto.EmbedColor;
        command.EmbedThumbnail = dto.EmbedThumbnail;
        command.EmbedImage = dto.EmbedImage;
        command.EmbedFooter = dto.EmbedFooter;
        command.EmbedTitleUrl = dto.EmbedTitleUrl;
        command.EmbedAuthorName = dto.EmbedAuthorName;
        command.EmbedAuthorIcon = dto.EmbedAuthorIcon;
        command.EmbedAuthorUrl = dto.EmbedAuthorUrl;
        command.EmbedFooterIcon = dto.EmbedFooterIcon;
        command.EmbedUseTimestamp = dto.EmbedUseTimestamp;
        command.EmbedFieldsJson = dto.EmbedFieldsJson;
    }

    private async Task UpdateHelpCommandRolesAsync(int helpCommandId, List<string> roleIds)
    {
        var existing = await _db.HelpCommandRoles.Where(r => r.HelpCommandId == helpCommandId).ToListAsync();
        _db.HelpCommandRoles.RemoveRange(existing);

        foreach (var roleId in roleIds)
        {
            if (string.IsNullOrWhiteSpace(roleId)) continue;
            _db.HelpCommandRoles.Add(new HelpCommandRole
            {
                HelpCommandId = helpCommandId,
                RoleId = roleId.Trim(),
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    private async Task UpdateHelpCommandChannelsAsync(int helpCommandId, List<string> channelIds)
    {
        var existing = await _db.HelpCommandChannels.Where(c => c.HelpCommandId == helpCommandId).ToListAsync();
        _db.HelpCommandChannels.RemoveRange(existing);

        foreach (var channelId in channelIds)
        {
            if (string.IsNullOrWhiteSpace(channelId)) continue;
            _db.HelpCommandChannels.Add(new HelpCommandChannel
            {
                HelpCommandId = helpCommandId,
                ChannelId = channelId.Trim(),
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    private static HelpCommandDto MapToDto(HelpCommand h) =>
        new()
        {
            Id = h.Id,
            GuildId = h.GuildId,
            CommandName = h.CommandName,
            Description = h.Description,
            Enabled = false,
            CooldownType = h.CooldownType,
            CooldownSeconds = h.CooldownSeconds,
            SendAsDM = h.SendAsDM,
            DeleteAfterUse = h.DeleteAfterUse,
            DisableReply = h.DisableReply,
            RolePermissionType = h.RolePermissionType,
            ChannelPermissionType = h.ChannelPermissionType,
            IsEmbed = h.IsEmbed,
            Message = h.Message,
            EmbedTitle = h.EmbedTitle,
            EmbedDescription = h.EmbedDescription,
            EmbedColor = h.EmbedColor,
            EmbedThumbnail = h.EmbedThumbnail,
            EmbedImage = h.EmbedImage,
            EmbedFooter = h.EmbedFooter,
            EmbedTitleUrl = h.EmbedTitleUrl,
            EmbedAuthorName = h.EmbedAuthorName,
            EmbedAuthorIcon = h.EmbedAuthorIcon,
            EmbedAuthorUrl = h.EmbedAuthorUrl,
            EmbedFooterIcon = h.EmbedFooterIcon,
            EmbedUseTimestamp = h.EmbedUseTimestamp,
            EmbedFieldsJson = h.EmbedFieldsJson,
            CreatedAt = h.CreatedAt,
            UpdatedAt = h.UpdatedAt,
            RoleIds = h.Roles.Select(r => r.RoleId).ToList(),
            ChannelIds = h.Channels.Select(c => c.ChannelId).ToList()
        };
}
