using Deveng.Discord.Api.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Deveng.Discord.Api.Services;

public class BotGuildAuthorizationService : IBotGuildAuthorizationService
{
    private readonly IGuildService _guildService;
    private readonly ICustomBotService _customBotService;
    private readonly IConfiguration _configuration;

    public BotGuildAuthorizationService(
        IGuildService guildService,
        ICustomBotService customBotService,
        IConfiguration configuration)
    {
        _guildService = guildService;
        _customBotService = customBotService;
        _configuration = configuration;
    }

    public async Task<bool> IsBotAuthorizedForGuildAsync(string? botClientId, string guildId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(guildId)) return false;

        var guild = await _guildService.GetGuildByGuildIdAsync(guildId.Trim());
        if (guild == null) return false;

        var mainClientId = _configuration["Bot:DiscordClientId"]?.Trim()
                           ?? Environment.GetEnvironmentVariable("BOT_CLIENT_ID")?.Trim()
                           ?? _configuration["Auth:Discord:ClientId"]?.Trim();

        if (!string.IsNullOrEmpty(mainClientId) &&
            (string.IsNullOrEmpty(botClientId) ||
             string.Equals(botClientId, mainClientId, StringComparison.Ordinal)))
            return true;

        if (string.IsNullOrEmpty(botClientId)) return false;

        var custom = await _customBotService.GetCustomBotByClientIdAsync(botClientId);
        if (custom == null) return false;

        if (string.IsNullOrEmpty(guild.OwnerId)) return false;

        return string.Equals(custom.OwnerId, guild.OwnerId, StringComparison.Ordinal);
    }
}
