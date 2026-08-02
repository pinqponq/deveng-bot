namespace Deveng.Discord.Api.Configuration;

public class ReportEmailOptions
{
    public const string SectionName = "ReportEmail";

    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Deveng";
    public bool UseStartTls { get; set; } = true;
}
