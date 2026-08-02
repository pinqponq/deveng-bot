using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Deveng.Discord.Api.Controllers;

public class DiscordCallbackRequest
{
    public string Code { get; set; } = string.Empty;
    public string? RedirectUri { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly IWebHostEnvironment _env;

    private readonly string _discordClientId;
    private readonly string _discordClientSecret;
    private readonly string _discordRedirectUri;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthController> _logger;

    private readonly int _tokenExpiryMinutes;

    public AuthController(
        IDiscordAuthService discordAuthService,
        ILogger<AuthController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IWebHostEnvironment env)
    {
        _discordAuthService = discordAuthService;
        _logger = logger;
        _configuration = configuration;
        _env = env;
        _httpClient = httpClientFactory.CreateClient();

        _tokenExpiryMinutes = _configuration.GetValue("Auth:TokenExpiryMinutes", 1);

        _discordClientId = _configuration["Auth:Discord:ClientId"] ?? string.Empty;
        _discordClientSecret = _configuration["Auth:Discord:ClientSecret"] ?? string.Empty;
        _discordRedirectUri = _configuration["Auth:Discord:RedirectUri"]?.Trim() ?? string.Empty;
    }

    /// <summary>
    /// İstemci RedirectUri gönderse bile yalnızca yapılandırılmış allowlist ile eşleşen URI Discord'a iletilir (open redirect önlemi).
    /// </summary>
    private bool TryResolveAllowedRedirectUri(string? requestRedirectUri, out string redirectUri)
    {
        redirectUri = string.Empty;
        var allowed = new List<string>();
        if (!string.IsNullOrEmpty(_discordRedirectUri))
            allowed.Add(_discordRedirectUri);
        var extras = _configuration.GetSection("Auth:Discord:AllowedRedirectUris").Get<string[]>() ?? [];
        foreach (var u in extras)
        {
            var t = u?.Trim();
            if (!string.IsNullOrEmpty(t)) allowed.Add(t);
        }

        if (allowed.Count == 0)
            return false;

        var candidate = !string.IsNullOrWhiteSpace(requestRedirectUri)
            ? requestRedirectUri.Trim()
            : _discordRedirectUri;

        if (string.IsNullOrEmpty(candidate))
            return false;

        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var candUri))
            return false;

        foreach (var a in allowed)
        {
            if (!Uri.TryCreate(a, UriKind.Absolute, out var allowedUri))
                continue;

            if (Uri.Compare(candUri, allowedUri,
                    UriComponents.SchemeAndServer | UriComponents.Path,
                    UriFormat.SafeUnescaped, StringComparison.OrdinalIgnoreCase) != 0)
                continue;

            redirectUri = allowedUri.GetLeftPart(UriPartial.Path);
            return true;
        }

        return false;
    }

    /// <summary>
    ///     Discord OAuth callback - code ile token ve kullanıcı bilgilerini döndürür
    /// </summary>
    [HttpPost("discord/callback")]
    public async Task<ActionResult<object>> DiscordCallback([FromBody] DiscordCallbackRequest request)
    {
        if (string.IsNullOrEmpty(request.Code)) return BadRequest(new { message = "Code parametresi gerekli" });

        if (string.IsNullOrEmpty(_discordClientId) || string.IsNullOrEmpty(_discordClientSecret))
        {
#if DEBUG
            _logger.LogWarning("Discord OAuth2 credentials not configured, using mock data (DEBUG build only)");

            var callbackTokenExpiryMs = _tokenExpiryMinutes * 60 * 1000;
            var callbackExpiresAt =
                DateTimeOffset.UtcNow.AddMilliseconds(callbackTokenExpiryMs).ToUnixTimeMilliseconds();

            return Ok(new
            {
                user = new
                {
                    id = "123456789012345678",
                    username = "TestUser",
                    discriminator = "0001",
                    avatar = (string?)null,
                    globalName = "Test User",
                    verified = true,
                    email = "test@discord.app"
                },
                guilds = new[]
                {
                    new { id = "987654321098765432", name = "Test Sunucu 1", icon = (string?)null, permissions = "8", owner = false },
                    new
                    {
                        id = "876543210987654321",
                        name = "Test Sunucu 2",
                        icon = (string?)"a1b2c3d4e5f6g7h8",
                        permissions = "8",
                        owner = false
                    }
                },
                expiresAt = callbackExpiresAt,
                expiresInMs = callbackTokenExpiryMs
            });
#else
            return BadRequest(new { message = "Discord OAuth2 credentials yapılandırılmamış." });
#endif
        }

        try
        {
            if (!TryResolveAllowedRedirectUri(request.RedirectUri, out var redirectUri))
            {
                _logger.LogWarning("Discord OAuth2 callback: RedirectUri allowlist eşleşmedi veya yapılandırma eksik.");
                return BadRequest(new { message = "Geçersiz veya izin verilmeyen RedirectUri." });
            }

            _logger.LogInformation(
                "Discord OAuth2 callback received. Code: {Code}, ClientId: {ClientId}, RedirectUri: {RedirectUri}",
                request.Code, _discordClientId, redirectUri);

            var oauthResponse = await _discordAuthService.ExchangeCodeForTokenAsync(
                request.Code,
                _discordClientId,
                _discordClientSecret,
                redirectUri
            );

            if (oauthResponse == null || string.IsNullOrEmpty(oauthResponse.AccessToken))
            {
                _logger.LogError(
                    "Failed to exchange Discord OAuth2 code for token. Code: {Code}, ClientId: {ClientId}, RedirectUri: {RedirectUri}",
                    request.Code, _discordClientId, _discordRedirectUri);
                return BadRequest(new
                {
                    message = "Discord token exchange başarısız oldu. Lütfen Discord OAuth2 ayarlarınızı kontrol edin.",
                    details = "ClientId ve ClientSecret doğru mu? RedirectUri Discord Developer Portal'da kayıtlı mı?"
                });
            }

            var userInfo = await _discordAuthService.ValidateTokenAsync(oauthResponse.AccessToken, true, true);

            if (userInfo == null)
            {
                _logger.LogError("Failed to get Discord user info after token exchange");
                return BadRequest(new
                {
                    message = "Discord kullanıcı bilgileri alınamadı"
                });
            }

            var userDetails = await GetDiscordUserDetailsAsync(oauthResponse.AccessToken);

            var callbackTokenExpiryMs = _tokenExpiryMinutes * 60 * 1000;
            var callbackExpiresAt =
                DateTimeOffset.UtcNow.AddMilliseconds(callbackTokenExpiryMs).ToUnixTimeMilliseconds();

            var guilds = userInfo.Guilds.Select(g => new
            {
                id = g.Id,
                name = g.Name,
                icon = g.Icon,
                permissions = g.Permissions.ToString(),
                owner = g.Owner
            }).ToArray();

            return Ok(new
            {
                user = new
                {
                    id = userInfo.UserId,
                    username = userDetails?.Username ?? userInfo.Username,
                    discriminator = userDetails?.Discriminator ?? "0000",
                    avatar = userDetails?.Avatar,
                    globalName = userDetails?.GlobalName ?? userInfo.Username,
                    verified = userDetails?.Verified ?? false,
                    email = userDetails?.Email ?? string.Empty
                },
                guilds,
                expiresAt = callbackExpiresAt,
                expiresInMs = callbackTokenExpiryMs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discord callback error");
            return StatusCode(500, new
            {
                message = "Discord callback sırasında bir hata oluştu",
                traceId = HttpContext.TraceIdentifier
            });
        }
    }

    /// <summary>
    ///     Discord token'ının geçerliliğini kontrol eder
    /// </summary>
    [HttpGet("validate-token")]
    public async Task<ActionResult<object>> ValidateToken()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            return Unauthorized(new
            {
                valid = false,
                message = "Token bulunamadı"
            });

        var token = authHeader.Substring("Bearer ".Length).Trim();

        if (string.IsNullOrEmpty(token))
            return Unauthorized(new
            {
                valid = false,
                message = "Token boş"
            });

        var userInfo = await _discordAuthService.ValidateTokenAsync(token);

        if (userInfo == null)
            return Unauthorized(new
            {
                valid = false,
                message = "Token geçersiz veya süresi dolmuş"
            });

        var realTokenExpiryMs = _tokenExpiryMinutes * 60 * 1000;
        var realExpiresAt = DateTimeOffset.UtcNow.AddMilliseconds(realTokenExpiryMs).ToUnixTimeMilliseconds();

        return Ok(new
        {
            valid = true,
            userId = userInfo.UserId,
            username = userInfo.Username,
            message = "Token geçerli",
            expiresAt = realExpiresAt,
            expiresInMs = realTokenExpiryMs,
            expiresInMinutes = (int)Math.Ceiling(realTokenExpiryMs / (60.0 * 1000)),
            expiresAtFormatted = DateTimeOffset.FromUnixTimeMilliseconds(realExpiresAt)
                .ToString("yyyy-MM-dd HH:mm:ss UTC")
        });
    }

    /// <summary>
    ///     Token'ı yeniler - Mevcut token'ı validate edip yeni expiry süresi döndürür
    ///     Kullanıcı aktifken token süresini uzatmak için kullanılır
    /// </summary>
    [HttpPost("refresh-token")]
    public async Task<ActionResult<object>> RefreshToken()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            return Unauthorized(new
            {
                valid = false,
                message = "Token bulunamadı"
            });

        var token = authHeader.Substring("Bearer ".Length).Trim();

        if (string.IsNullOrEmpty(token))
            return Unauthorized(new
            {
                valid = false,
                message = "Token boş"
            });

        try
        {
            var userInfo = await _discordAuthService.ValidateTokenAsync(token);

            if (userInfo == null)
                return Unauthorized(new
                {
                    valid = false,
                    message = "Token geçersiz veya süresi dolmuş"
                });

            var newTokenExpiryMs = _tokenExpiryMinutes * 60 * 1000;
            var newExpiresAt = DateTimeOffset.UtcNow.AddMilliseconds(newTokenExpiryMs).ToUnixTimeMilliseconds();

            _logger.LogInformation("Token refreshed for user {UserId}. New expiry: {ExpiresAt} ({ExpiresAtFormatted})",
                userInfo.UserId,
                newExpiresAt,
                DateTimeOffset.FromUnixTimeMilliseconds(newExpiresAt).ToString("yyyy-MM-dd HH:mm:ss UTC"));

            return Ok(new
            {
                valid = true,
                userId = userInfo.UserId,
                username = userInfo.Username,
                message = "Token yenilendi",
                expiresAt = newExpiresAt,
                expiresInMs = newTokenExpiryMs,
                expiresInMinutes = (int)Math.Ceiling(newTokenExpiryMs / (60.0 * 1000)),
                expiresAtFormatted = DateTimeOffset.FromUnixTimeMilliseconds(newExpiresAt)
                    .ToString("yyyy-MM-dd HH:mm:ss UTC")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token refresh error");
            return StatusCode(500, new
            {
                valid = false,
                message = "Token yenileme sırasında bir hata oluştu",
                traceId = HttpContext.TraceIdentifier
            });
        }
    }

    /// <summary>
    ///     Discord kullanıcı detaylarını al (avatar, email vb.)
    /// </summary>
    private async Task<DiscordUserDetails?> GetDiscordUserDetailsAsync(string accessToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "https://discord.com/api/v10/users/@me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get Discord user details. Status: {Status}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            return new DiscordUserDetails
            {
                Id = data.TryGetProperty("id", out var idElement)
                    ? idElement.GetString() ?? string.Empty
                    : string.Empty,
                Username = data.TryGetProperty("username", out var usernameElement)
                    ? usernameElement.GetString() ?? string.Empty
                    : string.Empty,
                Discriminator = data.TryGetProperty("discriminator", out var discriminatorElement)
                    ? discriminatorElement.GetString() ?? "0000"
                    : "0000",
                Avatar = data.TryGetProperty("avatar", out var avatarElement) ? avatarElement.GetString() : null,
                GlobalName = data.TryGetProperty("global_name", out var globalNameElement)
                    ? globalNameElement.GetString()
                    : null,
                Verified = data.TryGetProperty("verified", out var verifiedElement) && verifiedElement.GetBoolean(),
                Email = data.TryGetProperty("email", out var emailElement) ? emailElement.GetString() : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Discord user details");
            return null;
        }
    }

    private class DiscordUserDetails
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Discriminator { get; set; } = "0000";
        public string? Avatar { get; set; }
        public string? GlobalName { get; set; }
        public bool Verified { get; set; }
        public string? Email { get; set; }
    }
}