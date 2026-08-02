using Deveng.Discord.Api.DTOs;

namespace Deveng.Discord.Api.Interfaces;

public interface IGuildReportEmailSender
{
    /// <summary>
    /// Rapor tamamlandıktan sonra veya panelden yeniden gönderim.
    /// </summary>
    /// <param name="jobId">Rapor job kimliği.</param>
    /// <param name="actingGuildId">Panel çağrılarında job'un bu sunucuya ait olduğu doğrulanır; bot tamamlama yolunda null.</param>
    /// <param name="respectSendOnComplete">true iken Notify.SendOnComplete kapalıysa gönderilmez (otomatik tamamlama).</param>
    Task<GuildReportEmailSendResultDto> TrySendForJobAsync(long jobId, string? actingGuildId, bool respectSendOnComplete);
}
