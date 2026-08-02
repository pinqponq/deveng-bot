namespace Deveng.Discord.Api.Messaging;

/// <summary>
/// RabbitMQ (veya benzeri) üzerinden komut/etkinlik yayınlama sözleşmesi — worker tüketimi için temel model.
/// </summary>
public interface IMessageBus
{
    Task PublishAsync(string exchange, string routingKey, ReadOnlyMemory<byte> body, CancellationToken cancellationToken = default);
}
