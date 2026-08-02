using StackExchange.Redis;

namespace Deveng.Shared.Redis.Interfaces;

/// <summary>
///     Redis bağlantısı için temel interface.
///     Sadece bağlantı yönetimi sağlar, iş mantığı API tarafında kalır.
/// </summary>
public interface IRedisConnectionService
{
    /// <summary>
    ///     Redis bağlantısını (IConnectionMultiplexer) döner.
    ///     API tarafında GetDatabase() ile IDatabase alınarak işlemler yapılır.
    /// </summary>
    IConnectionMultiplexer GetConnection();
}
