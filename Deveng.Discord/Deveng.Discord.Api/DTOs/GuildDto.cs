namespace Deveng.Discord.Api.DTOs;

public class GuildDto
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string GuildName { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public int MemberCount { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime LastSeen { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateGuildDto
{
    public string GuildId { get; set; } = string.Empty;
    public string GuildName { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public int MemberCount { get; set; } = 0;
    public DateTime? JoinedAt { get; set; }
}

public class UpdateGuildDto
{
    public string? GuildName { get; set; }
    public string? OwnerId { get; set; }
    public int? MemberCount { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LastSeen { get; set; }
}