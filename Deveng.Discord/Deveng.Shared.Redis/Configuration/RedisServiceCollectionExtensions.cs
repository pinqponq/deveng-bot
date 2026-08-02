using Deveng.Shared.Redis.Interfaces;
using Deveng.Shared.Redis.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Deveng.Shared.Redis.Configuration;

/// <summary>
///     Redis bağlantı servisini DI container'a eklemek için extension sınıfı.
/// </summary>
public static class RedisServiceCollectionExtensions
{
    /// <summary>
    ///     Redis bağlantı servisini DI container'a ekler.
    ///     Singleton olarak eklenir.
    /// </summary>
    /// <param name="services">DI container</param>
    /// <param name="configuration">Redis connection string içeren IConfiguration</param>
    /// <returns>IServiceCollection</returns>
    public static IServiceCollection AddRedisConnection(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IRedisConnectionService>(provider => new RedisConnectionService(configuration));
        return services;
    }
}
