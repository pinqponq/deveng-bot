namespace Deveng.Discord.Api.DTOs;

public class GuildFeatureDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string FeatureName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateGuildFeatureDto
{
    public string GuildId { get; set; } = string.Empty;
    public string FeatureName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
}

public class UpdateGuildFeatureDto
{
    public bool IsEnabled { get; set; }
}

public class GuildFeatureStatusDto
{
    public string FeatureName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}