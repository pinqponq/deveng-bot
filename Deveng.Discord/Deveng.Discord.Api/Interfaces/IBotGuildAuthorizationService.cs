namespace Deveng.Discord.Api.Interfaces;

/// <summary>
/// Bot kimliği ile bir guild üzerinde işlem (poll/giveaway gönder vb.) için sıkılaştırılmış kontrol.
/// </summary>
public interface IBotGuildAuthorizationService
{
    /// <summary>
    /// Ana bot veya custom bot verilen guild için yetkili kabul edilebilir mi?
    /// </summary>
    Task<bool> IsBotAuthorizedForGuildAsync(string? botClientId, string guildId, CancellationToken ct = default);
}
