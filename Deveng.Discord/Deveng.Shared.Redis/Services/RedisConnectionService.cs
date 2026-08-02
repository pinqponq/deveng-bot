using Deveng.Shared.Redis.Interfaces;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;

namespace Deveng.Shared.Redis.Services;

/// <summary>
///     Redis bağlantısını yöneten servis.
///     Singleton olarak IConnectionMultiplexer instance'ı tutar.
///     Konfigürasyon: Redis:Host, Redis:Port, Redis:User, Redis:Password, Redis:Database
///     veya ConnectionStrings:Redis (geriye dönük uyumluluk).
/// </summary>
public class RedisConnectionService : IRedisConnectionService
{
    private readonly Lazy<IConnectionMultiplexer> _connection;

    public RedisConnectionService(IConfiguration configuration)
    {
        _connection = new Lazy<IConnectionMultiplexer>(() =>
        {
            var redisSection = configuration.GetSection("Redis");
            var host = redisSection["Host"] ?? redisSection["host"];

            if (!string.IsNullOrWhiteSpace(host))
            {
                var port = int.TryParse(redisSection["Port"], out var p) ? p : 6379;
                var user = redisSection["User"] ?? redisSection["user"];
                var password = redisSection["Password"] ?? redisSection["password"];
                var database = int.TryParse(redisSection["Database"], out var db) ? db : 0;
                var abortOnConnectFail = bool.TryParse(redisSection["AbortOnConnectFail"], out var abort) && abort;

                var options = new ConfigurationOptions
                {
                    EndPoints = { { host, port } },
                    DefaultDatabase = database,
                    AbortOnConnectFail = abortOnConnectFail
                };
                if (!string.IsNullOrEmpty(user)) options.User = user;
                if (!string.IsNullOrEmpty(password)) options.Password = password;

                return ConnectionMultiplexer.Connect(options);
            }

            var connectionString = configuration.GetConnectionString("Redis")
                ?? throw new InvalidOperationException(
                    "Redis yapılandırması bulunamadı. appsettings.json içinde 'Redis' bölümü (Host, Port, User, Password, Database) veya ConnectionStrings:Redis kullanın.");

            var parsed = ConfigurationOptions.Parse(connectionString);
            parsed.AbortOnConnectFail = false;
            return ConnectionMultiplexer.Connect(parsed);
        });
    }

    public IConnectionMultiplexer GetConnection() => _connection.Value;
}
