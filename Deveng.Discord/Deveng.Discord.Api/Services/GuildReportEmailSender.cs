using Deveng.Discord.Api.Configuration;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Newtonsoft.Json.Linq;

namespace Deveng.Discord.Api.Services;

public class GuildReportEmailSender : IGuildReportEmailSender
{
    private readonly IGuildReportService _reports;
    private readonly ReportEmailOptions _opt;
    private readonly ILogger<GuildReportEmailSender> _logger;

    public GuildReportEmailSender(
        IGuildReportService reports,
        IOptions<ReportEmailOptions> options,
        ILogger<GuildReportEmailSender> logger)
    {
        _reports = reports;
        _opt = options.Value;
        _logger = logger;
    }

    public async Task<GuildReportEmailSendResultDto> TrySendForJobAsync(long jobId, string? actingGuildId, bool respectSendOnComplete)
    {
        var job = actingGuildId is null
            ? await _reports.GetByIdAsync(jobId).ConfigureAwait(false)
            : await _reports.GetByGuildAndIdAsync(actingGuildId, jobId).ConfigureAwait(false);
        if (job is null)
            return new GuildReportEmailSendResultDto { Outcome = "not_found", Detail = "Rapor kaydı bulunamadı veya sunucu uyuşmazlığı." };

        if (job.Status != "completed")
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, null, DateTime.UtcNow, "skipped_not_completed",
                null).ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "skipped_not_completed", Detail = "Yalnızca tamamlanmış raporlara e-posta gönderilebilir." };
        }

        var notify = await _reports.GetNotifyAsync(job.GuildId).ConfigureAwait(false);
        var recipient = string.IsNullOrWhiteSpace(notify?.NotifyEmail) ? null : notify!.NotifyEmail.Trim();
        if (recipient is null)
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, null, DateTime.UtcNow, "skipped_no_recipient", null)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "skipped_no_recipient", Detail = "Panelde bildirim e-postası tanımlı değil." };
        }

        if (!LooksLikeEmail(recipient))
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "skipped_invalid_email", null)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "skipped_invalid_email", Detail = "Geçersiz e-posta adresi." };
        }

        if (respectSendOnComplete && notify is { SendOnComplete: false })
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "skipped_auto_disabled", null)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto
            {
                Outcome = "skipped_auto_disabled",
                Detail = "Tamamlanınca otomatik gönder kapalı; «E-postayı yeniden gönder» kullanın.",
            };
        }

        if (!_opt.Enabled || string.IsNullOrWhiteSpace(_opt.Host) || string.IsNullOrWhiteSpace(_opt.FromAddress))
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "skipped_smtp_not_configured", null)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto
            {
                Outcome = "skipped_smtp_not_configured",
                Detail = null,
            };
        }

        string? pdfBase64 = null;
        var guildName = "Sunucu";
        try
        {
            if (!string.IsNullOrEmpty(job.SummaryJson))
            {
                var jo = JObject.Parse(job.SummaryJson);
                pdfBase64 = jo["reportPdfBase64"]?.Value<string>();
                guildName = jo["name"]?.Value<string>() ?? guildName;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Guild report summary parse failed job={JobId}", jobId);
        }

        if (string.IsNullOrWhiteSpace(pdfBase64))
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "skipped_no_pdf", null)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "skipped_no_pdf", Detail = "Bu raporda PDF verisi yok." };
        }

        byte[] pdfBytes;
        try
        {
            pdfBytes = Convert.FromBase64String(pdfBase64);
        }
        catch (Exception ex)
        {
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "failed_bad_pdf", ex.Message)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "failed_bad_pdf", Detail = ex.Message };
        }

        var subject = $"[Deveng] {guildName} — yönetim özeti ({job.ReportRange})";
        var body =
            "Merhaba,\n\nBu e-posta Deveng panelinde bu sunucu için tanımladığınız bildirim adresine gönderilmiştir. Ekte yönetim özetinin PDF kopyası bulunur.\n\n" +
            $"- Rapor No: {job.Id}\n- Aralık: {job.ReportRange}\n- Oluşturulma: {job.CreatedAt:u}\n";

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_opt.FromName, _opt.FromAddress));
            message.To.Add(MailboxAddress.Parse(recipient));
            message.Subject = subject;
            var builder = new BodyBuilder { TextBody = body };
            builder.Attachments.Add($"guild-report-{job.Id}.pdf", pdfBytes, ContentType.Parse("application/pdf"));
            message.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            smtp.Timeout = 20000;
            var secure = _opt.UseStartTls
                ? SecureSocketOptions.StartTlsWhenAvailable
                : SecureSocketOptions.Auto;
            await smtp.ConnectAsync(_opt.Host, _opt.Port, secure).ConfigureAwait(false);
            if (!string.IsNullOrEmpty(_opt.User))
                await smtp.AuthenticateAsync(_opt.User, _opt.Password).ConfigureAwait(false);
            await smtp.SendAsync(message).ConfigureAwait(false);
            await smtp.DisconnectAsync(true).ConfigureAwait(false);

            var sentAt = DateTime.UtcNow;
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, sentAt, "sent", null).ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "sent", Detail = recipient };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Guild report SMTP send failed job={JobId}", jobId);
            await _reports.UpdateEmailDeliveryAsync(job.Id, recipient, DateTime.UtcNow, "failed", ex.Message)
                .ConfigureAwait(false);
            return new GuildReportEmailSendResultDto { Outcome = "failed", Detail = ex.Message };
        }
    }

    private static bool LooksLikeEmail(string v)
    {
        if (v.Length < 3 || v.Length > 320) return false;
        var at = v.IndexOf('@');
        return at > 0 && at < v.Length - 1 && v.IndexOf('@', at + 1) < 0;
    }
}
