using Deveng.Discord.Api.Models;

namespace Deveng.Discord.Api.Interfaces;

/// <summary>
///     Discord authentication ve authorization işlemlerini yöneten service interface
/// </summary>
public interface IDiscordAuthService
{
    /// <summary>
    ///     Discord OAuth2 code ile access token exchange eder
    /// </summary>
    Task<DiscordOAuthResponse?> ExchangeCodeForTokenAsync(string code, string clientId, string clientSecret,
        string redirectUri);

    /// <summary>
    ///     Discord access token'ını validate eder ve kullanıcı bilgilerini döndürür
    /// </summary>
    /// <param name="token">Discord OAuth access token</param>
    /// <param name="includeGuilds">true ise kullanıcının sunucu listesi de alınır</param>
    /// <param name="bypassGuildsCache">true ise sunucu listesi Redis'ten okunmaz (OAuth girişinde güncel liste için)</param>
    Task<DiscordUserInfo?> ValidateTokenAsync(string token, bool includeGuilds = false,
        bool bypassGuildsCache = false);

    /// <summary>
    ///     Kullanıcının belirtilen sunucuda yönetim yetkisi olup olmadığını kontrol eder
    /// </summary>
    bool HasGuildPermission(DiscordUserInfo userInfo, string guildId, bool requireAdminPermission = false);
}
