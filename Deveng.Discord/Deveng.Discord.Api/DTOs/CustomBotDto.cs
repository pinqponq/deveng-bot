namespace Deveng.Discord.Api.DTOs;

public class CustomBotDto
{
    public int Id { get; set; }
    public string BotToken { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? BotName { get; set; }
    public string Status { get; set; } = "Inactive";
    public string? ErrorMessage { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string PresenceStatus { get; set; } = "online";
    public string ActivityType { get; set; } = "Playing";
    public string? ActivityText { get; set; }
    public bool PersonalizationEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastSeen { get; set; }
}

public class CreateCustomBotDto
{
    public string BotToken { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? BotName { get; set; }
}

public class UpdateCustomBotDto
{
    public string? BotToken { get; set; }
    public string? BotName { get; set; }
    public string? Status { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? LastSeen { get; set; }
}

public class UpdateCustomBotPersonalizationDto
{
    public string? BotName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? PresenceStatus { get; set; }
    public string? ActivityType { get; set; }
    public string? ActivityText { get; set; }
    public bool? PersonalizationEnabled { get; set; }
}

public class CustomBotPersonalizationInternalDto
{
    public int Id { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string? BotName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string PresenceStatus { get; set; } = "online";
    public string ActivityType { get; set; } = "Playing";
    public string? ActivityText { get; set; }
    public bool PersonalizationEnabled { get; set; }
}

public class CustomBotInternalActiveDto
{
    public int Id { get; set; }
    public string BotToken { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? BotName { get; set; }
}

public class UpdateCustomBotInternalStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime? LastSeen { get; set; }
}

public class ApplyPersonalizationResultDto
{
    public bool Success { get; set; }
    public List<string> Warnings { get; set; } = [];
    public string? Error { get; set; }
}
