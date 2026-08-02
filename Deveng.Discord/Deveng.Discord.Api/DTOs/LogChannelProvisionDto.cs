namespace Deveng.Discord.Api.DTOs;

/// <summary>POST /api/discord/guilds/{guildId}/log-channels/provision</summary>
public class ProvisionLogChannelsRequest
{
    /// <summary>auto: yeni kategori + meta kanal; existing: sadece metin kanallarını <see cref="ParentId"/> altında açar.</summary>
    public string Mode { get; set; } = "auto";

    /// <summary>Mode=existing iken GUILD_CATEGORY kanal id.</summary>
    public string? ParentId { get; set; }
}

public class ProvisionLogChannelsResponse
{
    public string CategoryId { get; set; } = string.Empty;
    public string DefaultChannelId { get; set; } = string.Empty;
    public List<ProvisionedLogTypeChannelDto> LogTypes { get; set; } = new();
}

public class ProvisionedLogTypeChannelDto
{
    public string LogType { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
}
