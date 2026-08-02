namespace Deveng.Discord.Scheduling.Contracts;

/// <summary>RabbitMQ exchange adları — worker ve API yayıncıları aynı sabiti kullanır.</summary>
public static class SchedulingExchanges
{
    public const string Commands = "deveng.commands";

    /// <summary>Fanout: DLQ ve operasyon izleme için dead-letter hedefi.</summary>
    public const string DeadLetter = "deveng.scheduling.dlx";
}
