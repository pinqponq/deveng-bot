using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Deveng.Discord.Api.Services;

public class CustomCommandService : ICustomCommandService
{
    private const string FeatureName = "CustomCommand";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly ILogger<CustomCommandService> _logger;

    public CustomCommandService(DevengDbContext db, IGuildFeatureService guildFeatureService, ILogger<CustomCommandService> logger)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _logger = logger;
    }

    public async Task<List<CustomCommandDto>> GetCustomCommandsAsync(string guildId)
    {
        try
        {
            var featureEnabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
            var commands = await _db.CustomCommands.AsNoTracking()
                .Where(c => c.GuildId == guildId)
                .OrderBy(c => c.CommandName)
                .ToListAsync();

            return commands.Select(c =>
            {
                var dto = MapCustomCommand(c);
                dto.Enabled = featureEnabled;
                return dto;
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[CustomCommandService] GetCustomCommandsAsync failed GuildId={GuildId}", guildId);
            return new List<CustomCommandDto>();
        }
    }

    public async Task<CustomCommandDto?> GetCustomCommandByNameAsync(string guildId, string commandName)
    {
        var command = await _db.CustomCommands.AsNoTracking()
            .FirstOrDefaultAsync(c => c.GuildId == guildId && c.CommandName == commandName);
        if (command == null) return null;

        var dto = MapCustomCommand(command);
        dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(guildId, FeatureName);
        return dto;
    }

    public async Task<CustomCommandDto> CreateOrUpdateCustomCommandAsync(string guildId,
        CreateCustomCommandDto createDto)
    {
        if (string.IsNullOrWhiteSpace(createDto.CommandName))
            throw new ArgumentException("Komut adı gereklidir");

        if (createDto.ActionType < 0 || createDto.ActionType > 3)
            throw new ArgumentException("Geçersiz ActionType (0-3 arası olmalı)");

        if (createDto.ActionType == 0 && string.IsNullOrWhiteSpace(createDto.TargetChannelId))
            throw new ArgumentException("Kanal ID gereklidir (ActionType 0 için)");

        if ((createDto.ActionType == 0 || createDto.ActionType == 1) && string.IsNullOrWhiteSpace(createDto.Message))
            throw new ArgumentException("Mesaj gereklidir (ActionType 0 ve 1 için)");

        if ((createDto.ActionType == 2 || createDto.ActionType == 3) && string.IsNullOrWhiteSpace(createDto.RoleId))
            throw new ArgumentException("Rol ID gereklidir (ActionType 2 ve 3 için)");

        ValidateAdvancedOptions(createDto.UseRegex, createDto.TriggerPattern, createDto.CooldownSeconds, createDto.Scope);

        var commandName = createDto.CommandName.Trim();
        var existing = await GetCustomCommandByNameAsync(guildId, commandName);
        var currentCommands = await GetCustomCommandsAsync(guildId);
        if (existing == null && currentCommands.Count >= 5)
            throw new InvalidOperationException("Kota aşıldı: ücretsiz planda en fazla 5 özel komut oluşturulabilir.");

        var command = await _db.CustomCommands
            .FirstOrDefaultAsync(c => c.GuildId == guildId && c.CommandName == commandName);

        if (command == null)
        {
            command = new CustomCommand
            {
                GuildId = guildId,
                CommandName = commandName,
                Enabled = true
            };
            _db.CustomCommands.Add(command);
        }

        command.ActionType = createDto.ActionType;
        command.TargetChannelId = createDto.ActionType == 0 ? createDto.TargetChannelId : null;
        command.Message = createDto.ActionType is 0 or 1 ? createDto.Message : null;
        command.RoleId = createDto.ActionType is 2 or 3 ? createDto.RoleId : null;
        command.Enabled = true;
        command.UseRegex = createDto.UseRegex;
        command.TriggerPattern = createDto.TriggerPattern;
        command.CooldownSeconds = createDto.CooldownSeconds;
        command.Scope = createDto.Scope;

        await _db.SaveChangesAsync();

        return await GetCustomCommandByNameAsync(guildId, commandName)
               ?? throw new Exception("Custom command oluşturulamadı");
    }

    public async Task<CustomCommandDto?> GetCustomCommandByIdAsync(int id)
    {
        var command = await _db.CustomCommands.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (command == null) return null;

        return await GetCustomCommandByNameAsync(command.GuildId, command.CommandName);
    }

    public async Task<CustomCommandDto?> UpdateCustomCommandAsync(int id, UpdateCustomCommandDto updateDto)
    {
        var command = await _db.CustomCommands.FindAsync(id);
        if (command == null) return null;

        ValidateAdvancedOptions(updateDto.UseRegex, updateDto.TriggerPattern, updateDto.CooldownSeconds, updateDto.Scope);

        command.ActionType = updateDto.ActionType;
        command.TargetChannelId = updateDto.TargetChannelId;
        command.Message = updateDto.Message;
        command.RoleId = updateDto.RoleId;
        if (updateDto.Enabled.HasValue) command.Enabled = updateDto.Enabled.Value;
        command.UseRegex = updateDto.UseRegex;
        command.TriggerPattern = updateDto.TriggerPattern;
        command.CooldownSeconds = updateDto.CooldownSeconds;
        command.Scope = updateDto.Scope;

        await _db.SaveChangesAsync();
        return await GetCustomCommandByNameAsync(command.GuildId, command.CommandName);
    }

    public async Task<bool> DeleteCustomCommandAsync(int id)
    {
        var command = await _db.CustomCommands.FindAsync(id);
        if (command == null) return false;

        _db.CustomCommands.Remove(command);
        await _db.SaveChangesAsync();
        return true;
    }

    private static CustomCommandDto MapCustomCommand(CustomCommand c) =>
        new()
        {
            Id = c.Id,
            GuildId = c.GuildId,
            CommandName = c.CommandName,
            ActionType = c.ActionType,
            TargetChannelId = c.TargetChannelId,
            Message = c.Message,
            RoleId = c.RoleId,
            Enabled = c.Enabled,
            UseRegex = c.UseRegex,
            TriggerPattern = c.TriggerPattern,
            CooldownSeconds = c.CooldownSeconds ?? 2,
            Scope = c.Scope,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };

    private static void ValidateAdvancedOptions(bool useRegex, string? triggerPattern, int cooldownSeconds, string scope)
    {
        var allowedScopes = new[] { "slash", "message", "both" };
        if (!allowedScopes.Contains(scope, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException("Scope slash, message veya both olmalıdır.");
        if (cooldownSeconds < 2 || cooldownSeconds > 3600)
            throw new ArgumentException("Cooldown 2-3600 saniye aralığında olmalıdır.");
        if (!useRegex) return;
        if (string.IsNullOrWhiteSpace(triggerPattern))
            throw new ArgumentException("Regex tetik için TriggerPattern zorunludur.");
        if (triggerPattern.Length > 256)
            throw new ArgumentException("Regex deseni en fazla 256 karakter olabilir.");
        if (triggerPattern.Contains("(.+") || triggerPattern.Contains("(.*") || triggerPattern.Contains(")+") || triggerPattern.Contains(")*"))
            throw new ArgumentException("Regex deseni ReDoS riski nedeniyle reddedildi.");

        try
        {
            var re = new Regex(triggerPattern, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));
            _ = re.IsMatch("abcdefghijklmnopqrstuvwxyz0123456789_probe");
        }
        catch (RegexMatchTimeoutException)
        {
            throw new ArgumentException("Regex eşleştirme zaman aşımına uğradı; deseni sadeleştirin.");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException("Geçersiz regex: " + ex.Message, ex);
        }
    }
}
