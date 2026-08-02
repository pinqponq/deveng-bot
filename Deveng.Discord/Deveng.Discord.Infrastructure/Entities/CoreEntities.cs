using Deveng.Discord.Infrastructure.Abstractions;

namespace Deveng.Discord.Infrastructure.Entities;

public class Guild : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string GuildName { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public int MemberCount { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LastSeen { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<GuildFeature> Features { get; set; } = [];
}

public class GuildFeature : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string FeatureName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Guild? Guild { get; set; }
}

public class GuildLocaleSetting : IGuildScoped
{
    public string GuildId { get; set; } = string.Empty;
    public string DefaultLocale { get; set; } = "tr";
    public string FallbackLocale { get; set; } = "tr";
    public DateTime UpdatedAt { get; set; }
}

public class PanelAuditLog : IGuildScoped
{
    public long Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ActorType { get; set; } = "user";
    public string? ActorUserId { get; set; }
    public string? ActorUsernameSnapshot { get; set; }
    public string? ActorAvatarSnapshot { get; set; }
    public string? ActorRolesSnapshotJson { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? ChangedFieldsJson { get; set; }
    public string? RequestId { get; set; }
    public string? IpHash { get; set; }
    public string? UserAgentHash { get; set; }
    public string Result { get; set; } = "success";
    public string? ErrorCode { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

/// <summary>Normalize edilmiş guild embed şablonu — Kind + ParentEntityId ile parent kayda bağlanır.</summary>
public class GuildEmbedTemplate : IGuildScoped, IAuditableEntity
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public GuildEmbedTemplateKind Kind { get; set; }
    public int? ParentEntityId { get; set; }
    public string? Slot { get; set; }

    public bool IsEmbed { get; set; }
    public string? Message { get; set; }
    public string? EmbedTitle { get; set; }
    public string? EmbedDescription { get; set; }
    public string? EmbedColor { get; set; }
    public string? EmbedThumbnail { get; set; }
    public string? EmbedImage { get; set; }
    public string? EmbedFooter { get; set; }
    public string? EmbedAuthorName { get; set; }
    public string? EmbedAuthorIcon { get; set; }
    public string? EmbedAuthorUrl { get; set; }
    public string? EmbedTitleUrl { get; set; }
    public string? EmbedFooterIcon { get; set; }
    public bool EmbedUseTimestamp { get; set; } = true;
    public string? EmbedFieldsJson { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
