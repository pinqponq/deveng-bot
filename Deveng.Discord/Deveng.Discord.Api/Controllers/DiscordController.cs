using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/discord")]
[DiscordAuth]
public class DiscordController : ControllerBase
{
    private const string DiscordApiBase = "https://discord.com/api";
    private static readonly TimeSpan CacheCountTtl = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan CacheRolesTtl = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan CacheMembersTtl = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan CacheChannelsTtl = TimeSpan.FromMinutes(2);

    private readonly HttpClient _httpClient;
    private readonly ILogger<DiscordController> _logger;
    private readonly IRedisCacheService _cache;
    private readonly ILogChannelService _logChannelService;
    private readonly string _botToken;

    public DiscordController(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<DiscordController> logger,
        IRedisCacheService cache,
        ILogChannelService logChannelService)
    {
        _botToken = configuration["BotToken"] ?? string.Empty;
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
        _cache = cache;
        _logChannelService = logChannelService;
    }

    /// <summary>
    /// Sunucu üye sayısını döndürür (Discord API guild with_counts - hafif endpoint).
    /// </summary>
    [HttpGet("guilds/{guildId}/member-count")]
    public async Task<ActionResult<GuildMemberCountResponse>> GetGuildMemberCount(string guildId, [FromQuery] bool live = false)
    {
        var cacheKey = $"discord:guild:{guildId}:count";
        if (!live)
        {
            var cached = await _cache.GetAsync<GuildMemberCountResponse>(cacheKey);
            if (cached != null)
                return Ok(cached);
        }

        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}?with_counts=true");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bot", _botToken);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errorText = await response.Content.ReadAsStringAsync();
            _logger.LogError("Discord guild member count hatası: {Status} {Body}", response.StatusCode, errorText);
            return StatusCode((int)response.StatusCode, new { error = "Discord sunucu bilgisi alınamadı" });
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var memberCount = 0;
        var presenceCount = 0;
        if (root.TryGetProperty("approximate_member_count", out var mc))
            memberCount = mc.GetInt32();
        if (root.TryGetProperty("approximate_presence_count", out var pc))
            presenceCount = pc.GetInt32();

        var result = new GuildMemberCountResponse { MemberCount = memberCount, PresenceCount = presenceCount };
        await _cache.SetAsync(cacheKey, result, CacheCountTtl);
        return Ok(result);
    }

    /// <summary>
    /// Sunucu üyelerini ve rolleri döndürür (Discord API'den Bot token ile).
    /// </summary>
    [HttpGet("guilds/{guildId}/members")]
    public async Task<ActionResult<GuildMembersResponse>> GetGuildMembers(string guildId, [FromQuery] bool live = false)
    {
        var cacheKey = $"discord:guild:{guildId}:members";
        if (!live)
        {
            var cached = await _cache.GetAsync<GuildMembersResponse>(cacheKey);
            if (cached != null)
                return Ok(cached);
        }

        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        var authHeader = new AuthenticationHeaderValue("Bot", _botToken);

        using var membersRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/members?limit=1000");
        membersRequest.Headers.Authorization = authHeader;
        var membersResponse = await _httpClient.SendAsync(membersRequest);
        if (!membersResponse.IsSuccessStatusCode)
        {
            var errorText = await membersResponse.Content.ReadAsStringAsync();
            _logger.LogError("Discord members hatası: {Status} {Body}", membersResponse.StatusCode, errorText);
            return StatusCode((int)membersResponse.StatusCode, new { error = "Discord üyeleri alınamadı" });
        }

        var membersJson = await membersResponse.Content.ReadAsStringAsync();
        var members = JsonSerializer.Deserialize<List<DiscordMemberRaw>>(membersJson) ?? new List<DiscordMemberRaw>();

        using var rolesRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/roles");
        rolesRequest.Headers.Authorization = authHeader;
        var rolesResponse = await _httpClient.SendAsync(rolesRequest);
        var roles = new List<DiscordRoleDto>();
        if (rolesResponse.IsSuccessStatusCode)
        {
            var rolesJson = await rolesResponse.Content.ReadAsStringAsync();
            roles = JsonSerializer.Deserialize<List<DiscordRoleRaw>>(rolesJson)?
                .Select(r => new DiscordRoleDto { Id = r.Id ?? "", Name = r.Name ?? "", Color = r.Color, Position = r.Position, Managed = r.Managed, Mentionable = r.Mentionable })
                .ToList() ?? new List<DiscordRoleDto>();
        }

        var membersWithRoles = members.Select(m =>
        {
            var memberRoles = (m.Roles ?? Array.Empty<string>())
                .Select(roleId => roles.FirstOrDefault(r => r.Id == roleId))
                .Where(r => r != null)
                .Cast<DiscordRoleDto>()
                .ToList();
            var user = m.User;
            var discriminator = user?.Discriminator ?? "0";
            var defaultAvatarIndex = int.TryParse(discriminator, out var d) ? d % 5 : 0;
            var avatarUrl = user?.Avatar != null && user.Id != null
                ? $"https://cdn.discordapp.com/avatars/{user.Id}/{user.Avatar}.png?size=256"
                : $"https://cdn.discordapp.com/embed/avatars/{defaultAvatarIndex}.png";
            return new GuildMemberDto
            {
                Id = user?.Id ?? m.Id ?? "",
                Username = user?.Username ?? m.Nick ?? "Unknown",
                Discriminator = user?.Discriminator ?? "0",
                GlobalName = user?.GlobalName ?? m.Nick,
                Avatar = user?.Avatar,
                AvatarUrl = avatarUrl,
                Nick = m.Nick,
                Roles = memberRoles,
                JoinedAt = m.JoinedAt,
                Bot = user?.Bot ?? false
            };
        }).ToList();

        var membersResult = new GuildMembersResponse { Members = membersWithRoles, Roles = roles };
        await _cache.SetAsync(cacheKey, membersResult, CacheMembersTtl);
        return Ok(membersResult);
    }

    /// <summary>
    /// Sunucu rollerini döndürür (Discord API'den Bot token ile).
    /// </summary>
    [HttpGet("guilds/{guildId}/roles")]
    public async Task<ActionResult<GuildRolesResponse>> GetGuildRoles(string guildId)
    {
        var cacheKey = $"discord:guild:{guildId}:roles";
        var cached = await _cache.GetAsync<GuildRolesResponse>(cacheKey);
        if (cached != null)
            return Ok(cached);

        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/roles");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errorText = await response.Content.ReadAsStringAsync();
            _logger.LogError("Discord roles hatası: {Status} {Body}", response.StatusCode, errorText);
            return StatusCode((int)response.StatusCode, new { error = "Discord rolleri alınamadı" });
        }

        var json = await response.Content.ReadAsStringAsync();
        var raw = JsonSerializer.Deserialize<List<DiscordRoleRaw>>(json) ?? new List<DiscordRoleRaw>();
        var roles = raw
            .Select(r => new DiscordRoleDto
            {
                Id = r.Id ?? "",
                Name = r.Name ?? "",
                Color = r.Color,
                Position = r.Position,
                Managed = r.Managed,
                Mentionable = r.Mentionable
            })
            .OrderByDescending(r => r.Position)
            .ToList();

        var rolesResult = new GuildRolesResponse { Roles = roles };
        await _cache.SetAsync(cacheKey, rolesResult, CacheRolesTtl);
        return Ok(rolesResult);
    }

    /// <summary>
    /// Sunucu kanallarını döndürür (sadece metin kanalları, son mesaj ile).
    /// </summary>
    [HttpGet("guilds/{guildId}/channels")]
    public async Task<ActionResult<GuildChannelsResponse>> GetGuildChannels(string guildId)
    {
        var cacheKey = $"discord:guild:{guildId}:channels:v3";
        var cached = await _cache.GetAsync<GuildChannelsResponse>(cacheKey);
        if (cached != null)
            return Ok(cached);

        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        var authHeader = new AuthenticationHeaderValue("Bot", _botToken);

        using var channelsRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/channels");
        channelsRequest.Headers.Authorization = authHeader;
        var channelsResponse = await _httpClient.SendAsync(channelsRequest);
        if (!channelsResponse.IsSuccessStatusCode)
        {
            var errorText = await channelsResponse.Content.ReadAsStringAsync();
            _logger.LogError("Discord channels hatası: {Status} {Body}", channelsResponse.StatusCode, errorText);
            return StatusCode((int)channelsResponse.StatusCode, new { error = "Discord kanalları alınamadı" });
        }

        var channelsJson = await channelsResponse.Content.ReadAsStringAsync();
        var allChannels = JsonSerializer.Deserialize<List<DiscordChannelRaw>>(channelsJson) ?? new List<DiscordChannelRaw>();
        // Discord: 0 = GUILD_TEXT, 2 = GUILD_VOICE, 4 = GUILD_CATEGORY, 13 = GUILD_STAGE_VOICE.
        var categoryDtos = allChannels
            .Where(c => c.Type == 4)
            .OrderBy(c => c.Position)
            .Select(c => new DiscordCategoryDto
            {
                Id = c.Id ?? "",
                Name = c.Name ?? "",
                Position = c.Position
            })
            .ToList();

        var voiceChannelDtos = allChannels
            .Where(c => c.Type == 2 || c.Type == 13)
            .OrderBy(c => c.Position)
            .Select(c => new DiscordVoiceChannelDto
            {
                Id = c.Id ?? "",
                Name = c.Name ?? "",
                Position = c.Position,
                ParentId = c.ParentId,
                Type = c.Type
            })
            .ToList();

        var textChannels = allChannels.Where(c => c.Type == 0).ToList();

        var channelsWithMessages = new List<DiscordChannelDto>();
        foreach (var ch in textChannels)
        {
            object? lastMessage = null;
            try
            {
                using var msgRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/channels/{ch.Id}/messages?limit=1");
                msgRequest.Headers.Authorization = authHeader;
                var msgResponse = await _httpClient.SendAsync(msgRequest);
                if (msgResponse.IsSuccessStatusCode)
                {
                    var msgJson = await msgResponse.Content.ReadAsStringAsync();
                    var messages = JsonSerializer.Deserialize<List<DiscordMessageRaw>>(msgJson);
                    if (messages != null && messages.Count > 0)
                    {
                        var msg = messages[0];
                        var author = msg.Author;
                        var displayName = msg.Member?.Nick ?? author?.GlobalName ?? author?.Username ?? "Unknown";
                        var avatarUrl = author?.Avatar != null && author?.Id != null
                            ? $"https://cdn.discordapp.com/avatars/{author.Id}/{author.Avatar}.png?size=256"
                            : $"https://cdn.discordapp.com/embed/avatars/0.png";
                        lastMessage = new
                        {
                            id = msg.Id,
                            content = msg.Content ?? (msg.Attachments?.Count > 0 ? "📎 Dosya" : ""),
                            author = new
                            {
                                id = author?.Id,
                                username = author?.Username,
                                globalName = author?.GlobalName,
                                nick = msg.Member?.Nick,
                                displayName,
                                avatar = author?.Avatar,
                                avatarUrl
                            },
                            timestamp = msg.Timestamp,
                            editedTimestamp = msg.EditedTimestamp
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Kanal {ChannelId} için son mesaj alınamadı", ch.Id);
            }

            channelsWithMessages.Add(new DiscordChannelDto
            {
                Id = ch.Id ?? "",
                Name = ch.Name ?? "",
                Topic = ch.Topic,
                Position = ch.Position,
                Nsfw = ch.Nsfw,
                ParentId = ch.ParentId,
                LastMessage = lastMessage
            });
        }

        channelsWithMessages.Sort((a, b) => a.Position.CompareTo(b.Position));

        var channelsResult = new GuildChannelsResponse
        {
            Channels = channelsWithMessages,
            Categories = categoryDtos,
            VoiceChannels = voiceChannelDtos
        };
        await _cache.SetAsync(cacheKey, channelsResult, CacheChannelsTtl);
        return Ok(channelsResult);
    }

    /// <summary>
    /// Kanal türlerine göre sayım (tek GET /channels; son mesaj çekilmez).
    /// </summary>
    [HttpGet("guilds/{guildId}/channel-stats")]
    public async Task<ActionResult<GuildChannelStatsResponse>> GetGuildChannelStats(string guildId, [FromQuery] bool live = false)
    {
        var cacheKey = $"discord:guild:{guildId}:channel-stats";
        if (!live)
        {
            var cached = await _cache.GetAsync<GuildChannelStatsResponse>(cacheKey);
            if (cached != null)
                return Ok(cached);
        }

        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        using var channelsRequest = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/channels");
        channelsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
        var channelsResponse = await _httpClient.SendAsync(channelsRequest);
        if (!channelsResponse.IsSuccessStatusCode)
        {
            var errorText = await channelsResponse.Content.ReadAsStringAsync();
            _logger.LogError("Discord channel-stats hatası: {Status} {Body}", channelsResponse.StatusCode, errorText);
            return StatusCode((int)channelsResponse.StatusCode, new { error = "Discord kanalları alınamadı" });
        }

        var channelsJson = await channelsResponse.Content.ReadAsStringAsync();
        var allChannels = JsonSerializer.Deserialize<List<DiscordChannelRaw>>(channelsJson) ?? new List<DiscordChannelRaw>();

        var text = 0;
        var voice = 0;
        var stage = 0;
        var category = 0;
        var forum = 0;
        var announcement = 0;
        var other = 0;
        foreach (var c in allChannels)
        {
            switch (c.Type)
            {
                case 0:
                    text++;
                    break;
                case 2:
                    voice++;
                    break;
                case 4:
                    category++;
                    break;
                case 5:
                    announcement++;
                    break;
                case 13:
                    stage++;
                    break;
                case 15:
                    forum++;
                    break;
                default:
                    other++;
                    break;
            }
        }

        var stats = new GuildChannelStatsResponse
        {
            TextChannels = text,
            VoiceChannels = voice,
            StageChannels = stage,
            Categories = category,
            ForumChannels = forum,
            AnnouncementChannels = announcement,
            OtherChannels = other,
            TotalChannels = allChannels.Count
        };
        await _cache.SetAsync(cacheKey, stats, CacheChannelsTtl);
        return Ok(stats);
    }

    /// <summary>
    /// Sunucuya ait Discord cache anahtarlarını anlık temizler.
    /// </summary>
    [HttpPost("guilds/{guildId}/cache/invalidate")]
    public async Task<IActionResult> InvalidateGuildDiscordCache(string guildId)
    {
        await _cache.DeleteByPrefixAsync($"discord:guild:{guildId}:");
        _logger.LogInformation("Discord cache invalidated for GuildId={GuildId}", guildId);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Loglar için kategori (isteğe bağlı) + her log türüne bir metin kanalı oluşturur; DB kayıtlarını yazar.
    /// Sadece sunucuda henüz <see cref="ILogChannelService.GetLogChannelByGuildIdAsync"/> kaydı yokken.
    /// </summary>
    [HttpPost("guilds/{guildId}/log-channels/provision")]
    public async Task<ActionResult<ProvisionLogChannelsResponse>> ProvisionLogChannels(
        string guildId,
        [FromBody] ProvisionLogChannelsRequest? request,
        CancellationToken cancellationToken = default)
    {
        request ??= new ProvisionLogChannelsRequest();
        if (string.IsNullOrEmpty(_botToken))
        {
            _logger.LogWarning("BotToken yapılandırılmamış");
            return StatusCode(500, new { error = "Bot yapılandırması eksik" });
        }

        var existing = await _logChannelService.GetLogChannelByGuildIdAsync(guildId);
        if (existing != null)
        {
            return Conflict(new
            {
                error =
                    "Bu sunucu için zaten log kanalı kaydı var. Hızlı kurulum yalnızca log yapılandırması olmayan sunucularda kullanılır. Gerekirse mevcut kaydı silip tekrar deneyin."
            });
        }

        var mode = (request.Mode ?? "auto").Trim().ToLowerInvariant();
        if (mode is not ("auto" or "existing"))
            return BadRequest(new { error = "mode: auto veya existing olmalı" });

        if (mode == "existing" && string.IsNullOrWhiteSpace(request.ParentId))
            return BadRequest(new { error = "Mevcut kategori kullanımı için parentId (kategori) gerekli" });

        var auth = new AuthenticationHeaderValue("Bot", _botToken);
        var categoryId = string.Empty;
        if (mode == "auto")
        {
            var (catOk, catBody, catStatus) = await PostCreateGuildChannelAsync(
                guildId,
                new GuildChannelCreateModel { Name = "deveng-logs", Type = 4 },
                auth,
                cancellationToken);
            if (!catOk)
            {
                _logger.LogError("Discord create category: {Status} {Body}", catStatus, catBody);
                return StatusCode(catStatus, new { error = "Kategori Discord'da açılamadı" });
            }

            if (!TryParseChannelId(catBody, out var newCatId, out _))
                return StatusCode(502, new { error = "Discord yanıtı geçersiz" });

            categoryId = newCatId;
        }
        else
        {
            if (!await IsGuildCategoryChannelAsync(guildId, request.ParentId!, auth, cancellationToken))
                return BadRequest(new { error = "parentId bu sunucuda geçerli bir kategori değil" });

            categoryId = request.ParentId!;
        }

        var createdList = new List<ProvisionedLogTypeChannelDto>();
        foreach (var entry in LogChannelProvisionData.Entries)
        {
            try
            {
                await Task.Delay(350, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }

            var (chOk, chBody, chStatus) = await PostCreateGuildChannelAsync(
                guildId,
                new GuildChannelCreateModel
                {
                    Name = entry.ChannelSlug,
                    Type = 0,
                    ParentId = categoryId
                },
                auth,
                cancellationToken);
            if (!chOk)
            {
                _logger.LogError("Discord create log channel: {Status} {Body}", chStatus, chBody);
                return StatusCode(chStatus, new { error = "Bir log kanalı Discord'da açılamadı" });
            }

            if (!TryParseChannelId(chBody, out var chId, out var chName))
                return StatusCode(502, new { error = "Discord yanıtı geçersiz" });

            createdList.Add(new ProvisionedLogTypeChannelDto
            {
                LogType = entry.LogType,
                ChannelId = chId,
                ChannelName = chName
            });
        }

        if (createdList.Count == 0)
            return StatusCode(500, new { error = "Kanal oluşturulamadı" });

        var defaultChannelId = createdList[0].ChannelId;
        var defaultEmbed = new LogChannelEmbedSettingsDto { IsEmbed = true };
        try
        {
            await _logChannelService.CreateLogChannelAsync(new CreateLogChannelDto
            {
                GuildId = guildId,
                ChannelId = defaultChannelId,
                Enabled = true,
                EmbedSettings = defaultEmbed
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateLogChannel after Discord provision failed: GuildId={GuildId}", guildId);
            return StatusCode(500, new
            {
                error = "Discord kanalları açıldı; veritabanı kaydı oluşturulamadı. Lütfen yöneticiyle iletişime geçin veya yinelenen kanalları sunucudan silebilirsiniz."
            });
        }

        try
        {
            foreach (var item in createdList)
            {
                var entry = LogChannelProvisionData.Entries.First(e => e.LogType == item.LogType);
                await _logChannelService.CreateLogChannelTypeAsync(new CreateLogChannelTypeDto
                {
                    GuildId = guildId,
                    LogType = item.LogType,
                    ChannelId = item.ChannelId,
                    Enabled = true,
                    EmbedSettings = new LogChannelEmbedSettingsDto
                    {
                        IsEmbed = true,
                        EmbedTitle = entry.EmbedTitle,
                        EmbedDescription = entry.EmbedDescription,
                        EmbedColor = entry.EmbedColor
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateLogChannelType batch failed: GuildId={GuildId}", guildId);
            return StatusCode(500, new
            {
                error = "Ana log kaydı oluştu; log türü satırları kısmen eksik. Yönetim panelinden kontrol edin."
            });
        }

        try
        {
            await _cache.DeleteByPrefixAsync($"discord:guild:{guildId}:", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache invalidate after provision (non-fatal) GuildId={GuildId}", guildId);
        }

        return Ok(new ProvisionLogChannelsResponse
        {
            CategoryId = categoryId,
            DefaultChannelId = defaultChannelId,
            LogTypes = createdList
        });
    }

    private static bool TryParseChannelId(string json, out string id, out string name)
    {
        id = string.Empty;
        name = string.Empty;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("id", out var idEl) || idEl.GetString() is not { } s || string.IsNullOrEmpty(s))
                return false;
            id = s;
            if (root.TryGetProperty("name", out var nEl))
                name = nEl.GetString() ?? s;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<(bool success, string body, int statusCode)> PostCreateGuildChannelAsync(
        string guildId,
        GuildChannelCreateModel body,
        AuthenticationHeaderValue auth,
        CancellationToken cancellationToken)
    {
        var options = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        var payload = new StringContent(JsonSerializer.Serialize(body, options), Encoding.UTF8, "application/json");
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{DiscordApiBase}/guilds/{guildId}/channels");
        req.Headers.Authorization = auth;
        req.Content = payload;
        var response = await _httpClient.SendAsync(req, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        return (response.IsSuccessStatusCode, text, (int)response.StatusCode);
    }

    private async Task<bool> IsGuildCategoryChannelAsync(
        string guildId,
        string parentId,
        AuthenticationHeaderValue auth,
        CancellationToken cancellationToken)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{DiscordApiBase}/guilds/{guildId}/channels");
        req.Headers.Authorization = auth;
        var response = await _httpClient.SendAsync(req, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("IsGuildCategoryChannelAsync GET channels failed: {Status}", response.StatusCode);
            return false;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var all = JsonSerializer.Deserialize<List<DiscordChannelRaw>>(json) ?? new List<DiscordChannelRaw>();
        return all.Any(c => c.Type == 4 && c.Id == parentId);
    }

    private sealed class GuildChannelCreateModel
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        [JsonPropertyName("type")]
        public int Type { get; set; }
        [JsonPropertyName("parent_id")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ParentId { get; set; }
    }

    private class DiscordMemberRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("roles")]
        public string[]? Roles { get; set; }
        [JsonPropertyName("nick")]
        public string? Nick { get; set; }
        [JsonPropertyName("joined_at")]
        public string? JoinedAt { get; set; }
        [JsonPropertyName("user")]
        public DiscordUserRaw? User { get; set; }
    }

    private class DiscordUserRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("username")]
        public string? Username { get; set; }
        [JsonPropertyName("discriminator")]
        public string? Discriminator { get; set; }
        [JsonPropertyName("global_name")]
        public string? GlobalName { get; set; }
        [JsonPropertyName("avatar")]
        public string? Avatar { get; set; }
        [JsonPropertyName("bot")]
        public bool? Bot { get; set; }
    }

    private class DiscordRoleRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("name")]
        public string? Name { get; set; }
        [JsonPropertyName("color")]
        public int Color { get; set; }
        [JsonPropertyName("position")]
        public int Position { get; set; }
        [JsonPropertyName("managed")]
        public bool Managed { get; set; }
        [JsonPropertyName("mentionable")]
        public bool Mentionable { get; set; }
    }

    private class DiscordChannelRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("name")]
        public string? Name { get; set; }
        [JsonPropertyName("topic")]
        public string? Topic { get; set; }
        [JsonPropertyName("type")]
        public int Type { get; set; }
        [JsonPropertyName("position")]
        public int Position { get; set; }
        [JsonPropertyName("nsfw")]
        public bool Nsfw { get; set; }
        [JsonPropertyName("parent_id")]
        public string? ParentId { get; set; }
    }

    private class DiscordMessageRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("content")]
        public string? Content { get; set; }
        [JsonPropertyName("timestamp")]
        public string? Timestamp { get; set; }
        [JsonPropertyName("edited_timestamp")]
        public string? EditedTimestamp { get; set; }
        [JsonPropertyName("author")]
        public DiscordMessageAuthorRaw? Author { get; set; }
        [JsonPropertyName("member")]
        public DiscordMessageMemberRaw? Member { get; set; }
        [JsonPropertyName("attachments")]
        public List<object>? Attachments { get; set; }
    }

    private class DiscordMessageAuthorRaw
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
        [JsonPropertyName("username")]
        public string? Username { get; set; }
        [JsonPropertyName("global_name")]
        public string? GlobalName { get; set; }
        [JsonPropertyName("avatar")]
        public string? Avatar { get; set; }
    }

    private class DiscordMessageMemberRaw
    {
        [JsonPropertyName("nick")]
        public string? Nick { get; set; }
    }
}

public class GuildMemberCountResponse
{
    public int MemberCount { get; set; }
    public int PresenceCount { get; set; }
}

public class GuildMembersResponse
{
    public List<GuildMemberDto> Members { get; set; } = new();
    public List<DiscordRoleDto> Roles { get; set; } = new();
}

public class GuildMemberDto
{
    public string Id { get; set; } = "";
    public string Username { get; set; } = "";
    public string Discriminator { get; set; } = "";
    public string? GlobalName { get; set; }
    public string? Avatar { get; set; }
    public string AvatarUrl { get; set; } = "";
    public string? Nick { get; set; }
    public List<DiscordRoleDto> Roles { get; set; } = new();
    public string? JoinedAt { get; set; }
    public bool Bot { get; set; }
}

public class GuildChannelStatsResponse
{
    public int TextChannels { get; set; }
    public int VoiceChannels { get; set; }
    public int StageChannels { get; set; }
    public int Categories { get; set; }
    public int ForumChannels { get; set; }
    public int AnnouncementChannels { get; set; }
    public int OtherChannels { get; set; }
    public int TotalChannels { get; set; }
}

public class DiscordRoleDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Color { get; set; }
    public int Position { get; set; }
    public bool Managed { get; set; }
    public bool Mentionable { get; set; }
}

public class GuildRolesResponse
{
    public List<DiscordRoleDto> Roles { get; set; } = new();
}

public class GuildChannelsResponse
{
    public List<DiscordChannelDto> Channels { get; set; } = new();
    /// <summary>Sunucu kategorileri (GUILD_CATEGORY); ticket panel kategori seçimi için.</summary>
    public List<DiscordCategoryDto> Categories { get; set; } = new();
    /// <summary>Sunucu ses kanalları (GUILD_VOICE / GUILD_STAGE_VOICE); müzik paneli için.</summary>
    public List<DiscordVoiceChannelDto> VoiceChannels { get; set; } = new();
}

public class DiscordCategoryDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Position { get; set; }
}

public class DiscordChannelDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Topic { get; set; }
    public int Position { get; set; }
    public bool Nsfw { get; set; }
    public string? ParentId { get; set; }
    public object? LastMessage { get; set; }
}

public class DiscordVoiceChannelDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Position { get; set; }
    public string? ParentId { get; set; }
    public int Type { get; set; }
}
