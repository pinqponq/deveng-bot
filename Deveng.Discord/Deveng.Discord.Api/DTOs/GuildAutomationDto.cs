namespace Deveng.Discord.Api.DTOs;

public class GuildAutomationDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string DefinitionJson { get; set; } = "{}";
    public bool RetryOnFailure { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateGuildAutomationDto
{
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string DefinitionJson { get; set; } = "{}";
    public bool RetryOnFailure { get; set; }
}

public class UpdateGuildAutomationDto
{
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string DefinitionJson { get; set; } = "{}";
    public bool RetryOnFailure { get; set; }
}
