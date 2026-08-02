namespace Deveng.Discord.Scheduling.Contracts;

public static class SchedulingQueues
{
    /// <summary>Ana iş kuyruğu (varsayılan; Worker:SchedulingQueue ile override).</summary>
    public const string DefaultWork = "deveng.scheduling.work.v2";

    public const string DefaultDeadLetter = "deveng.scheduling.dlq";

    public static string RetryQueueName(string workQueueName) => $"{workQueueName}.retry";
}
