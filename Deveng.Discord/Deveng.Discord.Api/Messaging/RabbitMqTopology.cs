namespace Deveng.Discord.Api.Messaging;

/// <summary>
/// RabbitMQ exchange / kuyruk adlandırma — retry ve DLQ politikası docs/RMQ-OPERATIONS.md içinde.
/// </summary>
public static class RabbitMqTopology
{
    public const string CommandsExchange = Deveng.Discord.Scheduling.Contracts.SchedulingExchanges.Commands;
    public const string EventsExchange = "deveng.events";
    public const string DeadLetterSuffix = ".dlq";
}
