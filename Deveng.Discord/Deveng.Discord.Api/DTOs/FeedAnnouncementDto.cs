namespace Deveng.Discord.Api.DTOs;

public class FeedSubscriptionDto
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Type { get; set; } = "rss";
    public string Url { get; set; } = string.Empty;
    public string? ExternalId { get; set; }
    public string TargetChannelId { get; set; } = string.Empty;
    public string? MentionRoleId { get; set; }
    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 900;
    public string? LastEtag { get; set; }
    public string? LastModified { get; set; }
    public string? LastItemId { get; set; }
    public int ErrorCount { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastErrorAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertFeedSubscriptionDto
{
    public long? Id { get; set; }
    public string Type { get; set; } = "rss";
    public string Url { get; set; } = string.Empty;
    public string? ExternalId { get; set; }
    public string TargetChannelId { get; set; } = string.Empty;
    public string? MentionRoleId { get; set; }
    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 900;
}

public class FeedDeliveryDto
{
    public long SubscriptionId { get; set; }
    public string ItemId { get; set; } = string.Empty;
    public string? ItemHash { get; set; }
    public DateTime DeliveredAt { get; set; }
    public string? MessageId { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string TargetChannelId { get; set; } = string.Empty;
}

public class FeedPreviewRequestDto
{
    public string Url { get; set; } = string.Empty;
}

public class FeedPreviewItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Link { get; set; }
    public string? PublishedAt { get; set; }
}

public class FeedPreviewDto
{
    public string Title { get; set; } = string.Empty;
    public List<FeedPreviewItemDto> Items { get; set; } = new();
}

public class RecordFeedDeliveryDto
{
    public string ItemId { get; set; } = string.Empty;
    public string? ItemHash { get; set; }
    public string? MessageId { get; set; }
    public string? LastEtag { get; set; }
    public string? LastModified { get; set; }
}
