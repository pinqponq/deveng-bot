namespace Deveng.Discord.Api.Interfaces;

/// <summary>
/// Guild bazlı kayıt sayısı kotası (ücret katmanı yok).
/// </summary>
public interface IQuotaService
{
    /// <summary>
    /// Kayıt eklemeden önce <paramref name="currentCount"/> kota üstünde mi kontrol eder; aşıldıysa <see cref="Exceptions.FeatureLimitException"/> fırlatır.
    /// </summary>
    Task EnforceQuotaAsync(string guildId, string quotaKey, int currentCount);
}
