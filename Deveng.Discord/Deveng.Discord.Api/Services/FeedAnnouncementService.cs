using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace Deveng.Discord.Api.Services;

public class FeedAnnouncementService : IFeedAnnouncementService
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "rss",
        "youtube",
        "twitch"
    };

    private readonly DevengDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public FeedAnnouncementService(DevengDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<List<FeedSubscriptionDto>> GetByGuildIdAsync(string guildId)
    {
        var subscriptions = await _db.FeedSubscriptions.AsNoTracking()
            .Where(s => s.GuildId == guildId)
            .OrderByDescending(s => s.CreatedAt)
            .ThenByDescending(s => s.Id)
            .ToListAsync();

        return subscriptions.Select(MapSubscription).ToList();
    }

    public async Task<FeedSubscriptionDto?> GetByIdAsync(long id)
    {
        var subscription = await _db.FeedSubscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        return subscription == null ? null : MapSubscription(subscription);
    }

    public async Task<FeedSubscriptionDto> UpsertAsync(string guildId, UpsertFeedSubscriptionDto dto)
    {
        ValidateUpsert(dto);
        await EnsureSafeFeedUrlAsync(dto.Url);

        FeedSubscription subscription;
        if (dto.Id is null or 0)
        {
            subscription = new FeedSubscription { GuildId = guildId };
            _db.FeedSubscriptions.Add(subscription);
        }
        else
        {
            subscription = await _db.FeedSubscriptions
                .FirstOrDefaultAsync(s => s.Id == dto.Id && s.GuildId == guildId)
                ?? throw new InvalidOperationException("Feed aboneligi bulunamadi.");
        }

        subscription.Type = dto.Type.Trim().ToLowerInvariant();
        subscription.Url = dto.Url.Trim();
        subscription.ExternalId = NullIfWhiteSpace(dto.ExternalId);
        subscription.TargetChannelId = dto.TargetChannelId.Trim();
        subscription.MentionRoleId = NullIfWhiteSpace(dto.MentionRoleId);
        subscription.Enabled = dto.Enabled;
        subscription.PollIntervalSeconds = dto.PollIntervalSeconds;

        await _db.SaveChangesAsync();
        return MapSubscription(subscription);
    }

    public async Task DeleteAsync(string guildId, long id)
    {
        var subscription = await _db.FeedSubscriptions
            .Include(s => s.Deliveries)
            .FirstOrDefaultAsync(s => s.GuildId == guildId && s.Id == id);

        if (subscription == null) return;

        _db.FeedSubscriptions.Remove(subscription);
        await _db.SaveChangesAsync();
    }

    public async Task<List<FeedDeliveryDto>> GetDeliveriesAsync(string guildId, int take)
    {
        var limit = Math.Clamp(take, 1, 200);
        return await _db.FeedItemDeliveries.AsNoTracking()
            .Where(d => d.Subscription.GuildId == guildId)
            .OrderByDescending(d => d.DeliveredAt)
            .Take(limit)
            .Select(d => new FeedDeliveryDto
            {
                SubscriptionId = d.SubscriptionId,
                ItemId = d.ItemId,
                ItemHash = d.ItemHash,
                DeliveredAt = d.DeliveredAt,
                MessageId = d.MessageId,
                GuildId = d.Subscription.GuildId,
                Type = d.Subscription.Type,
                Url = d.Subscription.Url,
                TargetChannelId = d.Subscription.TargetChannelId
            })
            .ToListAsync();
    }

    public async Task<List<FeedSubscriptionDto>> GetDueAsync(int batchSize)
    {
        var nowUtc = DateTime.UtcNow;
        var limit = Math.Clamp(batchSize, 1, 100);

        var subscriptions = await _db.FeedSubscriptions.AsNoTracking()
            .Where(s => s.Enabled &&
                (s.LastSuccessAt == null ||
                 s.LastSuccessAt.Value.AddSeconds(s.PollIntervalSeconds) <= nowUtc ||
                 (s.LastErrorAt != null && s.LastErrorAt.Value.AddSeconds(s.PollIntervalSeconds) <= nowUtc)))
            .OrderBy(s => s.LastSuccessAt ?? s.LastErrorAt ?? s.CreatedAt)
            .ThenBy(s => s.Id)
            .Take(limit)
            .ToListAsync();

        return subscriptions.Select(MapSubscription).ToList();
    }

    public async Task RecordDeliveryAsync(long subscriptionId, RecordFeedDeliveryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ItemId)) throw new ArgumentException("ItemId zorunludur.");

        var itemId = dto.ItemId.Trim();
        var exists = await _db.FeedItemDeliveries
            .AnyAsync(d => d.SubscriptionId == subscriptionId && d.ItemId == itemId);

        if (!exists)
        {
            _db.FeedItemDeliveries.Add(new FeedItemDelivery
            {
                SubscriptionId = subscriptionId,
                ItemId = itemId,
                ItemHash = NullIfWhiteSpace(dto.ItemHash),
                MessageId = NullIfWhiteSpace(dto.MessageId),
                DeliveredAt = DateTime.UtcNow
            });
        }

        var subscription = await _db.FeedSubscriptions.FindAsync(subscriptionId)
            ?? throw new InvalidOperationException("Feed aboneligi bulunamadi.");

        subscription.LastItemId = itemId;
        if (!string.IsNullOrWhiteSpace(dto.LastEtag)) subscription.LastEtag = dto.LastEtag.Trim();
        if (!string.IsNullOrWhiteSpace(dto.LastModified)) subscription.LastModified = dto.LastModified.Trim();
        subscription.LastSuccessAt = DateTime.UtcNow;
        subscription.LastErrorAt = null;
        subscription.ErrorCount = 0;

        await _db.SaveChangesAsync();
    }

    public async Task RecordErrorAsync(long subscriptionId)
    {
        var subscription = await _db.FeedSubscriptions.FindAsync(subscriptionId);
        if (subscription == null) return;

        subscription.ErrorCount++;
        subscription.LastErrorAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<FeedPreviewDto> PreviewAsync(string url)
    {
        await EnsureSafeFeedUrlAsync(url);

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);
        using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();

        var contentType = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
        if (!contentType.Contains("xml", StringComparison.OrdinalIgnoreCase) &&
            !contentType.Contains("rss", StringComparison.OrdinalIgnoreCase) &&
            !contentType.Contains("atom", StringComparison.OrdinalIgnoreCase) &&
            !contentType.Contains("text", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Feed yaniti XML/RSS formatinda degil.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync();
        var doc = await XDocument.LoadAsync(stream, LoadOptions.None, CancellationToken.None);
        return ParsePreview(doc);
    }

    private static void ValidateUpsert(UpsertFeedSubscriptionDto dto)
    {
        if (!AllowedTypes.Contains(dto.Type)) throw new ArgumentException("Feed turu rss, youtube veya twitch olmalidir.");
        if (string.IsNullOrWhiteSpace(dto.Url)) throw new ArgumentException("Feed URL zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.TargetChannelId)) throw new ArgumentException("Hedef kanal zorunludur.");
        if (dto.PollIntervalSeconds is < 300 or > 86400)
            throw new ArgumentException("Kontrol araligi 300-86400 saniye araliginda olmalidir.");
    }

    private static FeedSubscriptionDto MapSubscription(FeedSubscription s) =>
        new()
        {
            Id = s.Id,
            GuildId = s.GuildId,
            Type = s.Type,
            Url = s.Url,
            ExternalId = s.ExternalId,
            TargetChannelId = s.TargetChannelId,
            MentionRoleId = s.MentionRoleId,
            Enabled = s.Enabled,
            PollIntervalSeconds = s.PollIntervalSeconds,
            LastEtag = s.LastEtag,
            LastModified = s.LastModified,
            LastItemId = s.LastItemId,
            ErrorCount = s.ErrorCount,
            LastSuccessAt = s.LastSuccessAt,
            LastErrorAt = s.LastErrorAt,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        };

    private static FeedPreviewDto ParsePreview(XDocument doc)
    {
        var channel = doc.Descendants().FirstOrDefault(e => e.Name.LocalName.Equals("channel", StringComparison.OrdinalIgnoreCase));
        var feedTitle = channel?.Elements().FirstOrDefault(e => e.Name.LocalName == "title")?.Value
            ?? doc.Root?.Elements().FirstOrDefault(e => e.Name.LocalName == "title")?.Value
            ?? "Feed";

        var items = doc.Descendants()
            .Where(e => e.Name.LocalName is "item" or "entry")
            .Take(5)
            .Select(e =>
            {
                var title = e.Elements().FirstOrDefault(x => x.Name.LocalName == "title")?.Value?.Trim() ?? "Baslik yok";
                var link = e.Elements().FirstOrDefault(x => x.Name.LocalName == "link")?.Attribute("href")?.Value
                    ?? e.Elements().FirstOrDefault(x => x.Name.LocalName == "link")?.Value?.Trim();
                var id = e.Elements().FirstOrDefault(x => x.Name.LocalName is "guid" or "id")?.Value?.Trim()
                    ?? link
                    ?? Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(title)));
                var publishedAt = e.Elements().FirstOrDefault(x => x.Name.LocalName is "pubDate" or "published" or "updated")?.Value?.Trim();
                return new FeedPreviewItemDto { Id = id, Title = title, Link = link, PublishedAt = publishedAt };
            })
            .ToList();

        return new FeedPreviewDto { Title = feedTitle.Trim(), Items = items };
    }

    private static async Task EnsureSafeFeedUrlAsync(string url)
    {
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
            throw new ArgumentException("Gecerli bir feed URL girilmelidir.");
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            throw new ArgumentException("Sadece http/https feed URL'leri desteklenir.");
        if (string.IsNullOrWhiteSpace(uri.Host) || uri.IsLoopback)
            throw new ArgumentException("Loopback feed adresleri desteklenmez.");
        if (!string.IsNullOrEmpty(uri.UserInfo))
            throw new ArgumentException("Kimlik bilgisi (kullanıcı:şifre) içeren feed URL'leri desteklenmez.");

        var host = uri.Host.TrimEnd('.');
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Localhost feed adresleri desteklenmez.");

        var addresses = await Dns.GetHostAddressesAsync(host);
        if (addresses.Length == 0 || addresses.Any(IsPrivateAddress))
            throw new ArgumentException("Private/internal feed adresleri desteklenmez.");
    }

    private static bool IsPrivateAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return true;
        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return b[0] == 10 ||
                   (b[0] == 172 && b[1] >= 16 && b[1] <= 31) ||
                   (b[0] == 192 && b[1] == 168) ||
                   (b[0] == 169 && b[1] == 254) ||
                   b[0] == 127;
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || (address.GetAddressBytes()[0] & 0xfe) == 0xfc;
        }

        return true;
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
