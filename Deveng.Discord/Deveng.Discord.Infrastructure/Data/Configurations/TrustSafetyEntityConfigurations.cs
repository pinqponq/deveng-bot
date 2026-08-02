using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class ModeratorConfiguration : IEntityTypeConfiguration<Moderator>
{
    public void Configure(EntityTypeBuilder<Moderator> builder)
    {
        builder.ToTable("moderator");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class ModeratorRuleConfiguration : IEntityTypeConfiguration<ModeratorRule>
{
    public void Configure(EntityTypeBuilder<ModeratorRule> builder)
    {
        builder.ToTable("moderator_rule");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RuleType).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => new { x.ModeratorId, x.RuleType }).IsUnique();
        builder.HasOne(x => x.Moderator).WithMany(x => x.Rules).HasForeignKey(x => x.ModeratorId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ForbiddenWordConfiguration : IEntityTypeConfiguration<ForbiddenWord>
{
    public void Configure(EntityTypeBuilder<ForbiddenWord> builder)
    {
        builder.ToTable("forbidden_word");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Word).HasMaxLength(256).IsRequired();
        builder.HasOne(x => x.Moderator).WithMany(x => x.ForbiddenWords).HasForeignKey(x => x.ModeratorId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AIModerationSettingConfiguration : IEntityTypeConfiguration<AIModerationSetting>
{
    public void Configure(EntityTypeBuilder<AIModerationSetting> builder)
    {
        builder.ToTable("ai_moderation_setting");
        builder.HasKey(x => x.GuildId);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Mode).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ThresholdLog).HasPrecision(4, 3);
        builder.Property(x => x.ThresholdDelete).HasPrecision(4, 3);
        builder.Property(x => x.ThresholdTimeout).HasPrecision(4, 3);
        builder.Property(x => x.SampleRate).HasPrecision(4, 3);
    }
}

internal sealed class AIModerationExcludedChannelConfiguration : IEntityTypeConfiguration<AIModerationExcludedChannel>
{
    public void Configure(EntityTypeBuilder<AIModerationExcludedChannel> builder)
    {
        builder.ToTable("ai_moderation_excluded_channel");
        builder.HasKey(x => new { x.GuildId, x.ChannelId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.Setting).WithMany(x => x.ExcludedChannels).HasForeignKey(x => x.GuildId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AIModerationPolicyConfiguration : IEntityTypeConfiguration<AIModerationPolicy>
{
    public void Configure(EntityTypeBuilder<AIModerationPolicy> builder)
    {
        builder.ToTable("ai_moderation_policy");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(64).IsRequired();
        builder.Property(x => x.LogThreshold).HasPrecision(4, 3);
        builder.Property(x => x.DeleteThreshold).HasPrecision(4, 3);
        builder.Property(x => x.TimeoutThreshold).HasPrecision(4, 3);
        builder.Property(x => x.Action).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.Category }).IsUnique();
    }
}

internal sealed class AIModerationQueueConfiguration : IEntityTypeConfiguration<AIModerationQueue>
{
    public void Configure(EntityTypeBuilder<AIModerationQueue> builder)
    {
        builder.ToTable("ai_moderation_queue");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.UserIdHash).HasMaxLength(128);
        builder.Property(x => x.ContentHash).HasMaxLength(128);
        builder.Property(x => x.Status).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ErrorCode).HasMaxLength(64);
        builder.HasIndex(x => new { x.Status, x.NextAttemptAt });
        builder.HasIndex(x => new { x.GuildId, x.MessageId }).IsUnique()
            .HasFilter("\"message_id\" IS NOT NULL");
    }
}

internal sealed class AIModerationReviewConfiguration : IEntityTypeConfiguration<AIModerationReview>
{
    public void Configure(EntityTypeBuilder<AIModerationReview> builder)
    {
        builder.ToTable("ai_moderation_review");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.MatchedCategory).HasMaxLength(64);
        builder.Property(x => x.Score).HasPrecision(4, 3);
        builder.Property(x => x.Provider).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ModelName).HasMaxLength(128);
        builder.Property(x => x.RecommendedAction).HasMaxLength(64);
        builder.Property(x => x.AppliedAction).HasMaxLength(64);
        builder.Property(x => x.DecisionReasonKey).HasMaxLength(128);
        builder.Property(x => x.ModeratorDecision).HasMaxLength(64);
        builder.HasOne(x => x.Queue).WithMany(x => x.Reviews).HasForeignKey(x => x.QueueId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => new { x.GuildId, x.CreatedAt, x.Id }).IsDescending(false, true, true);
    }
}

internal sealed class AIModerationCapacityUsageConfiguration : IEntityTypeConfiguration<AIModerationCapacityUsage>
{
    public void Configure(EntityTypeBuilder<AIModerationCapacityUsage> builder)
    {
        builder.ToTable("ai_moderation_capacity_usage");
        builder.HasKey(x => new { x.GuildId, x.PeriodKey });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.PeriodKey).HasMaxLength(32).IsRequired();
    }
}

internal sealed class ModerationActionLogConfiguration : IEntityTypeConfiguration<ModerationActionLog>
{
    public void Configure(EntityTypeBuilder<ModerationActionLog> builder)
    {
        builder.ToTable("moderation_action_log");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.Property(x => x.RuleType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.UserIdHash).HasMaxLength(128);
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Action).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ActionStatus).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ReasonKey).HasMaxLength(128);
        builder.Property(x => x.ActorType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ActorUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ErrorCode).HasMaxLength(64);
        builder.HasIndex(x => new { x.GuildId, x.CreatedAt, x.Id }).IsDescending(false, true, true);
    }
}

internal sealed class ModerationUserNoticeConfiguration : IEntityTypeConfiguration<ModerationUserNotice>
{
    public void Configure(EntityTypeBuilder<ModerationUserNotice> builder)
    {
        builder.ToTable("moderation_user_notice");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserIdHash).HasMaxLength(128);
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.NoticeType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.NoticeTextKey).HasMaxLength(128);
        builder.Property(x => x.DeliveryStatus).HasMaxLength(32).IsRequired();
        builder.Property(x => x.DiscordNoticeMessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasOne(x => x.ActionLog).WithMany(x => x.UserNotices).HasForeignKey(x => x.ActionLogId).OnDelete(DeleteBehavior.Cascade);
    }
}
