using System.Text.Json;
using Deveng.Shared.Redis.Interfaces;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Deveng.Discord.Api.Services;

/// <summary>
///     Redis üzerinde JSON serialize/deserialize ile cache işlemleri.
/// </summary>
public interface IRedisCacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default) where T : class;
    Task DeleteAsync(string key, CancellationToken ct = default);
    Task DeleteByPrefixAsync(string prefix, CancellationToken ct = default);

    /// <summary>SET key NX with TTL — dağıtık kilit için.</summary>
    Task<bool> TryAcquireDistributedLockAsync(string key, TimeSpan ttl, CancellationToken ct = default);
}

public class RedisCacheService : IRedisCacheService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private readonly IRedisConnectionService _redis;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(IRedisConnectionService redis, ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    private IDatabase Db => _redis.GetConnection().GetDatabase();

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        try
        {
            var db = Db;
            var json = await db.StringGetAsync(key);
            if (json.IsNullOrEmpty) return null;
            return JsonSerializer.Deserialize<T>(json.ToString(), JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache get failed for key {CacheKey}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default) where T : class
    {
        try
        {
            var db = Db;
            var json = JsonSerializer.Serialize(value, JsonOptions);
            if (ttl.HasValue)
                await db.StringSetAsync(key, json, new Expiration(ttl.Value));
            else
                await db.StringSetAsync(key, json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache set failed for key {CacheKey}", key);
        }
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await Db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache delete failed for key {CacheKey}", key);
        }
    }

    public async Task<bool> TryAcquireDistributedLockAsync(string key, TimeSpan ttl, CancellationToken ct = default)
    {
        try
        {
            return await Db.StringSetAsync(key, "1", new Expiration(ttl), When.NotExists);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis distributed lock failed for key {CacheKey}", key);
            return false;
        }
    }

    public async Task DeleteByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        try
        {
            var endpoints = _redis.GetConnection().GetEndPoints();
            if (endpoints.Length == 0) return;
            var server = _redis.GetConnection().GetServer(endpoints[0]);
            if (server == null) return;

            await foreach (var key in server.KeysAsync(pattern: prefix + "*").WithCancellation(ct))
            {
                await Db.KeyDeleteAsync(key);
            }
        }
        catch (Exception ex)
        {
            // Redis Cluster veya bazı cloud Redis'lerde SCAN/KEYS desteklenmeyebilir
            _logger.LogWarning(ex, "Redis cache delete-by-prefix failed for prefix {CachePrefix}", prefix);
        }
    }
}
