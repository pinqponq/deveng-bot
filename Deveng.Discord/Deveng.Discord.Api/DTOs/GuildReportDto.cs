namespace Deveng.Discord.Api.DTOs;

public class GuildReportJobDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string? CreatedByUserId { get; set; }
    public string ReportRange { get; set; } = "weekly";
    public string Status { get; set; } = "pending";
    public string? SummaryJson { get; set; }
    public string? FileRef { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? EmailTo { get; set; }
    public DateTime? EmailSentAt { get; set; }
    public string? EmailStatus { get; set; }
    public string? EmailError { get; set; }
}

public class GuildReportNotifyDto
{
    public string GuildId { get; set; } = string.Empty;
    public string? NotifyEmail { get; set; }
    public bool SendOnComplete { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class UpsertGuildReportNotifyDto
{
    public string? NotifyEmail { get; set; }
    public bool SendOnComplete { get; set; }
}

public class GuildReportEmailSendResultDto
{
    public string Outcome { get; set; } = string.Empty;
    public string? Detail { get; set; }
}

public class CreateGuildReportJobDto
{
    public string ReportRange { get; set; } = "weekly";
}

public class CompleteGuildReportJobDto
{
    public string Status { get; set; } = "completed";
    public string? SummaryJson { get; set; }
    public string? FileRef { get; set; }
    public string? Error { get; set; }
}
