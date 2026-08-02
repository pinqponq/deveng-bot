using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Deveng.Discord.Api.Services;

/// <summary>
///     Discord authentication ve authorization işlemlerini yöneten service
/// </summary>
public class DiscordAuthService : IDiscordAuthService
{
    private const string DiscordApiBaseUrl = "https://discord.com/api/v10";
    private const string RedisGuildsKeyPrefix = "discord:guilds:";
    private static readonly TimeSpan GuildsCacheTtl = TimeSpan.FromMinutes(20);

    private readonly HttpClient _httpClient;
    private readonly ILogger<DiscordAuthService> _logger;
    private readonly IRedisCacheService _cache;

    public DiscordAuthService(HttpClient httpClient, ILogger<DiscordAuthService> logger, IRedisCacheService cache)
    {
        _httpClient = httpClient;
        _logger = logger;
        _cache = cache;
    }

    public async Task<DiscordOAuthResponse?> ExchangeCodeForTokenAsync(string code, string clientId,
        string clientSecret, string redirectUri)
    {
        try
        {
            var tokenRequest = new HttpRequestMessage(HttpMethod.Post, $"{DiscordApiBaseUrl}/oauth2/token");

            var formData = new List<KeyValuePair<string, string>>
            {
                new("client_id", clientId),
                new("client_secret", clientSecret),
                new("grant_type", "authorization_code"),
                new("code", code),
                new("redirect_uri", redirectUri)
            };

            tokenRequest.Content = new FormUrlEncodedContent(formData);
            tokenRequest.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            var tokenResponse = await _httpClient.SendAsync(tokenRequest);

            if (!tokenResponse.IsSuccessStatusCode)
            {
                var errorContent = await tokenResponse.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Discord OAuth2 token exchange failed. Status: {Status}, Error: {Error}, Code: {Code}, RedirectUri: {RedirectUri}",
                    tokenResponse.StatusCode, errorContent, code, redirectUri);
                return null;
            }

            var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
            var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);

            if (!tokenData.TryGetProperty("access_token", out var accessTokenElement))
            {
                _logger.LogError("Discord OAuth2 response does not contain access_token");
                return null;
            }

            return new DiscordOAuthResponse
            {
                AccessToken = accessTokenElement.GetString() ?? string.Empty,
                TokenType = tokenData.TryGetProperty("token_type", out var tokenTypeElement)
                    ? tokenTypeElement.GetString() ?? "Bearer"
                    : "Bearer",
                ExpiresIn = tokenData.TryGetProperty("expires_in", out var expiresInElement)
                    ? expiresInElement.GetInt32()
                    : 604800, // Default 7 days
                RefreshToken = tokenData.TryGetProperty("refresh_token", out var refreshTokenElement)
                    ? refreshTokenElement.GetString() ?? string.Empty
                    : string.Empty,
                Scope = tokenData.TryGetProperty("scope", out var scopeElement)
                    ? scopeElement.GetString() ?? string.Empty
                    : string.Empty
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discord OAuth2 token exchange error");
            return null;
        }
    }

    public async Task<DiscordUserInfo?> ValidateTokenAsync(string token, bool includeGuilds = false,
        bool bypassGuildsCache = false)
    {
        try
        {
            var userRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBaseUrl}/users/@me");
            userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var userSw = System.Diagnostics.Stopwatch.StartNew();
            _logger.LogInformation("DiscordAuth: calling GET /users/@me");
            var userResponse = await _httpClient.SendAsync(userRequest);
            userSw.Stop();
            _logger.LogInformation("DiscordAuth: GET /users/@me finished with {Status} in {ElapsedMs}ms",
                userResponse.StatusCode, userSw.ElapsedMilliseconds);

            if (!userResponse.IsSuccessStatusCode)
            {
                if (userResponse.StatusCode == HttpStatusCode.TooManyRequests)
                    _logger.LogWarning("Discord API rate limit exceeded. Status: {Status}", userResponse.StatusCode);
                else
                    _logger.LogWarning("Discord token validation failed. Status: {Status}", userResponse.StatusCode);
                return null;
            }

            var userJson = await userResponse.Content.ReadAsStringAsync();
            var userData = JsonSerializer.Deserialize<JsonElement>(userJson);

            if (!userData.TryGetProperty("id", out var userIdElement)) return null;

            var userId = userIdElement.GetString() ?? string.Empty;
            var username = userData.TryGetProperty("username", out var usernameElement)
                ? usernameElement.GetString() ?? string.Empty
                : string.Empty;

            string? globalName = null;
            if (userData.TryGetProperty("global_name", out var globalNameEl) &&
                globalNameEl.ValueKind == JsonValueKind.String)
                globalName = globalNameEl.GetString();

            string? avatarHash = null;
            if (userData.TryGetProperty("avatar", out var avatarEl) && avatarEl.ValueKind == JsonValueKind.String)
                avatarHash = avatarEl.GetString();

            var guilds = new List<DiscordGuildInfo>();
            var rateLimitHit = false;

            if (includeGuilds)
            {
                var cacheKey = RedisGuildsKeyPrefix + userId;
                var cachedGuilds = !bypassGuildsCache
                    ? await _cache.GetAsync<List<DiscordGuildInfo>>(cacheKey)
                    : null;
                if (cachedGuilds != null)
                {
                    guilds = cachedGuilds;
                    _logger.LogInformation("Guild list loaded from Redis for user {UserId}, count: {Count}", userId, guilds.Count);
                }
                else
                {
                    var guildsRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBaseUrl}/users/@me/guilds");
                    guildsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var guildsSw = System.Diagnostics.Stopwatch.StartNew();
                    _logger.LogInformation("DiscordAuth: calling GET /users/@me/guilds for user {UserId}", userId);
                    var guildsResponse = await _httpClient.SendAsync(guildsRequest);
                    guildsSw.Stop();
                    _logger.LogInformation("DiscordAuth: GET /users/@me/guilds finished with {Status} in {ElapsedMs}ms",
                        guildsResponse.StatusCode, guildsSw.ElapsedMilliseconds);

                    if (!guildsResponse.IsSuccessStatusCode)
                    {
                        if (guildsResponse.StatusCode == HttpStatusCode.TooManyRequests)
                        {
                            rateLimitHit = true;
                            _logger.LogWarning(
                                "Discord API rate limit exceeded when fetching guilds. Status: {Status}. Will allow access for GET requests.",
                                guildsResponse.StatusCode);
                        }
                        else
                        {
                            _logger.LogWarning("Failed to fetch guilds. Status: {Status}", guildsResponse.StatusCode);
                        }
                    }
                    else if (guildsResponse.IsSuccessStatusCode)
                    {
                        var guildsJson = await guildsResponse.Content.ReadAsStringAsync();
                        var guildsArray = JsonSerializer.Deserialize<JsonElement[]>(guildsJson) ??
                                          Array.Empty<JsonElement>();

                        foreach (var guild in guildsArray)
                            if (guild.TryGetProperty("id", out var guildIdElement))
                            {
                                var guildId = guildIdElement.GetString() ?? string.Empty;
                                if (string.IsNullOrEmpty(guildId)) continue;

                                long permissions = 0;
                                if (guild.TryGetProperty("permissions", out var permissionsElement))
                                {
                                    if (permissionsElement.ValueKind == JsonValueKind.String)
                                    {
                                        var permissionsStr = permissionsElement.GetString();
                                        if (!string.IsNullOrEmpty(permissionsStr) &&
                                            long.TryParse(permissionsStr, out var parsedPermissions))
                                            permissions = parsedPermissions;
                                    }
                                    else if (permissionsElement.ValueKind == JsonValueKind.Number)
                                        permissions = permissionsElement.GetInt64();
                                }

                                var isOwner = guild.TryGetProperty("owner", out var ownerElement) && ownerElement.GetBoolean();
                                var name = guild.TryGetProperty("name", out var nameElement) ? nameElement.GetString() ?? string.Empty : string.Empty;
                                var icon = guild.TryGetProperty("icon", out var iconElement) ? iconElement.GetString() : null;

                                _logger.LogInformation(
                                    "Adding guild to list: Id={GuildId}, Name={Name}, Owner={IsOwner}, Permissions={Permissions}",
                                    guildId, name, isOwner, permissions);

                                guilds.Add(new DiscordGuildInfo
                                {
                                    Id = guildId,
                                    Name = name,
                                    Icon = icon,
                                    Permissions = permissions,
                                    Owner = isOwner
                                });
                            }

                        if (guilds.Count > 0)
                        {
                            await _cache.SetAsync(cacheKey, guilds, GuildsCacheTtl);
                            _logger.LogInformation("Guild list cached in Redis for user {UserId}, count: {Count}, TTL: {Ttl}min",
                                userId, guilds.Count, GuildsCacheTtl.TotalMinutes);
                        }
                    }
                }
            }
            else
            {
                _logger.LogInformation(
                    "Token validated for user {UserId}, skipping guild list fetch (includeGuilds=false)", userId);
            }

            return new DiscordUserInfo
            {
                UserId = userId,
                Username = username,
                GlobalName = globalName,
                AvatarHash = avatarHash,
                Guilds = guilds,
                RateLimitHit = rateLimitHit
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discord token validation error");
            return null;
        }
    }

    public bool HasGuildPermission(DiscordUserInfo userInfo, string guildId, bool requireAdminPermission = false)
    {
        // Rate-limit + boş guild listesi: üyelik doğrulanamaz; erişim reddedilir.
        if (userInfo.RateLimitHit && userInfo.Guilds.Count == 0)
        {
            _logger.LogWarning(
                "Rate limit + boş guild listesi: {GuildId} erişimi reddedildi (üyelik doğrulanamadı). User {UserId}",
                guildId, userInfo.UserId);
            return false;
        }

        var guildIdNorm = guildId?.Trim() ?? string.Empty;
        var guild = userInfo.Guilds.FirstOrDefault(g => string.Equals(g.Id?.Trim(), guildIdNorm, StringComparison.Ordinal));

        if (guild == null)
        {
            _logger.LogWarning(
                "Guild {GuildId} not found in user {UserId} guild list. User has {GuildCount} guilds. RateLimitHit: {RateLimitHit}",
                guildId, userInfo.UserId, userInfo.Guilds.Count, userInfo.RateLimitHit);
            return false;
        }

        _logger.LogInformation(
            "Checking permissions for guild {GuildId}, user {UserId}. Owner: {IsOwner}, Permissions: {Permissions}, RequireAdmin: {RequireAdmin}",
            guildId, userInfo.UserId, guild.Owner, guild.Permissions, requireAdminPermission);

        if (guild.Owner)
        {
            _logger.LogInformation("User {UserId} is owner of guild {GuildId}", userInfo.UserId, guildId);
            return true;
        }

        if (!requireAdminPermission)
        {
            _logger.LogInformation(
                "Read-only permission check: User {UserId} has access to guild {GuildId} (guild is in list)",
                userInfo.UserId, guildId);
            return true;
        }

        // Yazma işlemleri için yönetim yetkisi kontrolü (ADMINISTRATOR permission = 0x8)
        // veya MANAGE_GUILD permission = 0x20
        const long ADMINISTRATOR_PERMISSION = 0x8;
        const long MANAGE_GUILD_PERMISSION = 0x20;

        var hasAdmin = (guild.Permissions & ADMINISTRATOR_PERMISSION) == ADMINISTRATOR_PERMISSION;
        var hasManageGuild = (guild.Permissions & MANAGE_GUILD_PERMISSION) == MANAGE_GUILD_PERMISSION;

        var hasPermission = hasAdmin || hasManageGuild;

        _logger.LogInformation(
            "Write permission check result for guild {GuildId}, user {UserId}: HasAdmin={HasAdmin}, HasManageGuild={HasManageGuild}, Result={Result}",
            guildId, userInfo.UserId, hasAdmin, hasManageGuild, hasPermission);

        return hasPermission;
    }
}