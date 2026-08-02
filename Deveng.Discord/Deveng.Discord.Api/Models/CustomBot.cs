using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Deveng.Discord.Api.Models;

[Table("CustomBots")]
public class CustomBot
{
    [Key] public int Id { get; set; }

    [Required][MaxLength(500)] public string BotToken { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string ClientId { get; set; } = string.Empty;

    [Required][MaxLength(50)] public string OwnerId { get; set; } = string.Empty;

    [MaxLength(200)] public string? BotName { get; set; }

    [Required][MaxLength(20)] public string Status { get; set; } = "Inactive"; // Active, Inactive, Error

    [MaxLength(1000)] public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastSeen { get; set; }
}