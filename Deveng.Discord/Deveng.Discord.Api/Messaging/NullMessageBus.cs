namespace Deveng.Discord.Api.Messaging;

/// <summary>
/// RABBITMQ_URI tanımlı değilken güvenli no-op — üretimde gerçek bağlantıyı etkinleştirmek için ortam değişkeni kullanın.
/// </summary>
public sealed class NullMessageBus : IMessageBus
{
    public Task PublishAsync(string exchange, string routingKey, ReadOnlyMemory<byte> body, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
