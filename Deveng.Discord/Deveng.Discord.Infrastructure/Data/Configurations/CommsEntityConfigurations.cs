using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class WelcomeConfiguration : IEntityTypeConfiguration<Welcome>
{
    public void Configure(EntityTypeBuilder<Welcome> builder)
    {
        builder.ToTable("welcome");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Language).HasMaxLength(16).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => new { x.GuildId, x.Language }).IsUnique();
        builder.HasOne(x => x.EmbedSettings).WithOne(x => x.Welcome).HasForeignKey<WelcomeEmbedSettings>(x => x.WelcomeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.CardSettings).WithOne(x => x.Welcome).HasForeignKey<WelcomeCardSettings>(x => x.WelcomeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.DMSettings).WithOne(x => x.Welcome).HasForeignKey<WelcomeDMSettings>(x => x.WelcomeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.DMEmbedSettings).WithOne(x => x.Welcome).HasForeignKey<WelcomeDMEmbedSettings>(x => x.WelcomeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.DMCardSettings).WithOne(x => x.Welcome).HasForeignKey<WelcomeDMCardSettings>(x => x.WelcomeId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class WelcomeEmbedSettingsConfiguration : IEntityTypeConfiguration<WelcomeEmbedSettings>
{
    public void Configure(EntityTypeBuilder<WelcomeEmbedSettings> builder)
    {
        builder.ToTable("welcome_embed_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.WelcomeId).IsUnique();
    }
}

internal sealed class WelcomeCardSettingsConfiguration : IEntityTypeConfiguration<WelcomeCardSettings>
{
    public void Configure(EntityTypeBuilder<WelcomeCardSettings> builder)
    {
        builder.ToTable("welcome_card_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.WelcomeId).IsUnique();
    }
}

internal sealed class WelcomeDMSettingsConfiguration : IEntityTypeConfiguration<WelcomeDMSettings>
{
    public void Configure(EntityTypeBuilder<WelcomeDMSettings> builder)
    {
        builder.ToTable("welcome_dm_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.WelcomeId).IsUnique();
    }
}

internal sealed class WelcomeDMEmbedSettingsConfiguration : IEntityTypeConfiguration<WelcomeDMEmbedSettings>
{
    public void Configure(EntityTypeBuilder<WelcomeDMEmbedSettings> builder)
    {
        builder.ToTable("welcome_dm_embed_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.WelcomeId).IsUnique();
    }
}

internal sealed class WelcomeDMCardSettingsConfiguration : IEntityTypeConfiguration<WelcomeDMCardSettings>
{
    public void Configure(EntityTypeBuilder<WelcomeDMCardSettings> builder)
    {
        builder.ToTable("welcome_dm_card_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.WelcomeId).IsUnique();
    }
}

internal sealed class GoodbyeConfiguration : IEntityTypeConfiguration<Goodbye>
{
    public void Configure(EntityTypeBuilder<Goodbye> builder)
    {
        builder.ToTable("goodbye");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Language).HasMaxLength(16).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.Language }).IsUnique();
        builder.HasOne(x => x.EmbedSettings).WithOne(x => x.Goodbye).HasForeignKey<GoodbyeEmbedSettings>(x => x.GoodbyeId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GoodbyeEmbedSettingsConfiguration : IEntityTypeConfiguration<GoodbyeEmbedSettings>
{
    public void Configure(EntityTypeBuilder<GoodbyeEmbedSettings> builder)
    {
        builder.ToTable("goodbye_embed_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.GoodbyeId).IsUnique();
    }
}

internal sealed class LogChannelConfiguration : IEntityTypeConfiguration<LogChannel>
{
    public void Configure(EntityTypeBuilder<LogChannel> builder)
    {
        builder.ToTable("log_channel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => x.GuildId).IsUnique();
        builder.HasOne(x => x.EmbedSettings).WithOne(x => x.LogChannel).HasForeignKey<LogChannelEmbedSettings>(x => x.LogChannelId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class LogChannelEmbedSettingsConfiguration : IEntityTypeConfiguration<LogChannelEmbedSettings>
{
    public void Configure(EntityTypeBuilder<LogChannelEmbedSettings> builder)
    {
        builder.ToTable("log_channel_embed_settings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.LogChannelId).IsUnique();
    }
}

internal sealed class LogChannelTypeConfiguration : IEntityTypeConfiguration<LogChannelType>
{
    public void Configure(EntityTypeBuilder<LogChannelType> builder)
    {
        builder.ToTable("log_channel_type");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.LogType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => new { x.LogChannelId, x.LogType }).IsUnique();
        builder.HasOne(x => x.LogChannel).WithMany(x => x.LogTypes).HasForeignKey(x => x.LogChannelId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class HelpCommandConfiguration : IEntityTypeConfiguration<HelpCommand>
{
    public void Configure(EntityTypeBuilder<HelpCommand> builder)
    {
        builder.ToTable("help_command");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.CommandName).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.CommandName }).IsUnique();
    }
}

internal sealed class HelpCommandRoleConfiguration : IEntityTypeConfiguration<HelpCommandRole>
{
    public void Configure(EntityTypeBuilder<HelpCommandRole> builder)
    {
        builder.ToTable("help_command_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.HelpCommandId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.HelpCommand).WithMany(x => x.Roles).HasForeignKey(x => x.HelpCommandId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class HelpCommandChannelConfiguration : IEntityTypeConfiguration<HelpCommandChannel>
{
    public void Configure(EntityTypeBuilder<HelpCommandChannel> builder)
    {
        builder.ToTable("help_command_channel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.HelpCommandId, x.ChannelId }).IsUnique();
        builder.HasOne(x => x.HelpCommand).WithMany(x => x.Channels).HasForeignKey(x => x.HelpCommandId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class BirthdaySettingsConfiguration : IEntityTypeConfiguration<BirthdaySettings>
{
    public void Configure(EntityTypeBuilder<BirthdaySettings> builder)
    {
        builder.ToTable("birthday_settings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class BirthdayUserConfiguration : IEntityTypeConfiguration<BirthdayUser>
{
    public void Configure(EntityTypeBuilder<BirthdayUser> builder)
    {
        builder.ToTable("birthday_user");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.UserId }).IsUnique();
    }
}

internal sealed class EmbedMessageConfiguration : IEntityTypeConfiguration<EmbedMessage>
{
    public void Configure(EntityTypeBuilder<EmbedMessage> builder)
    {
        builder.ToTable("embed_message");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.Name }).IsUnique();
        builder.HasIndex(x => new { x.GuildId, x.Enabled, x.Name });
    }
}

internal sealed class FeedSubscriptionConfiguration : IEntityTypeConfiguration<FeedSubscription>
{
    public void Configure(EntityTypeBuilder<FeedSubscription> builder)
    {
        builder.ToTable("feed_subscription");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(2048).IsRequired();
        builder.Property(x => x.ExternalId).HasMaxLength(256);
        builder.Property(x => x.TargetChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MentionRoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => x.GuildId);
    }
}

internal sealed class FeedItemDeliveryConfiguration : IEntityTypeConfiguration<FeedItemDelivery>
{
    public void Configure(EntityTypeBuilder<FeedItemDelivery> builder)
    {
        builder.ToTable("feed_item_delivery");
        builder.HasKey(x => new { x.SubscriptionId, x.ItemId });
        builder.Property(x => x.ItemId).HasMaxLength(512).IsRequired();
        builder.Property(x => x.ItemHash).HasMaxLength(128);
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasOne(x => x.Subscription).WithMany(x => x.Deliveries).HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ScheduledAnnouncementConfiguration : IEntityTypeConfiguration<ScheduledAnnouncement>
{
    public void Configure(EntityTypeBuilder<ScheduledAnnouncement> builder)
    {
        builder.ToTable("scheduled_announcement");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MentionPolicy).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Timezone).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ScheduleType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
    }
}

internal sealed class ScheduledAnnouncementRunConfiguration : IEntityTypeConfiguration<ScheduledAnnouncementRun>
{
    public void Configure(EntityTypeBuilder<ScheduledAnnouncementRun> builder)
    {
        builder.ToTable("scheduled_announcement_run");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.SentMessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ErrorCode).HasMaxLength(64);
        builder.HasIndex(x => new { x.AnnouncementId, x.PlannedRunAtUtc }).IsUnique();
        builder.HasOne(x => x.Announcement).WithMany(x => x.Runs).HasForeignKey(x => x.AnnouncementId).OnDelete(DeleteBehavior.Cascade);
    }
}
