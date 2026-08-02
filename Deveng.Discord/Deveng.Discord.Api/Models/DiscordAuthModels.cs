namespace Deveng.Discord.Api.Models;

/// <summary>
///     Discord kullanıcı bilgileri ve sunucu listesi
/// </summary>
public class DiscordUserInfo
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    /// <summary>Discord görünen ad (global_name); yoksa UI için Username kullanılır.</summary>
    public string? GlobalName { get; set; }
    /// <summary>Discord avatar hash; null ise varsayılan avatar (CDN embed).</summary>
    public string? AvatarHash { get; set; }
    public List<DiscordGuildInfo> Guilds { get; set; } = new();

    /// <summary>
    ///     Rate limit nedeniyle guilds listesi alınamadı mı?
    /// </summary>
    public bool RateLimitHit { get; set; } = false;
}

/// <summary>
///     Discord sunucu bilgileri
/// </summary>
public class DiscordGuildInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public long Permissions { get; set; }
    public bool Owner { get; set; }
}

/// <summary>
///     Discord OAuth2 token exchange response
/// </summary>
public class DiscordOAuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
}
