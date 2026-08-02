using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class LevelConfiguration : IEntityTypeConfiguration<Level>
{
    public void Configure(EntityTypeBuilder<Level> builder)
    {
        builder.ToTable("level");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.XpMultiplier).HasPrecision(4, 2);
        builder.Property(x => x.NotificationChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class UserLevelConfiguration : IEntityTypeConfiguration<UserLevel>
{
    public void Configure(EntityTypeBuilder<UserLevel> builder)
    {
        builder.ToTable("user_level");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.UserId }).IsUnique();
        builder.HasIndex(x => new { x.GuildId, x.TotalXp }).IsDescending(false, true);
    }
}

internal sealed class LevelIgnoredChannelConfiguration : IEntityTypeConfiguration<LevelIgnoredChannel>
{
    public void Configure(EntityTypeBuilder<LevelIgnoredChannel> builder)
    {
        builder.ToTable("level_ignored_channel");
        builder.HasKey(x => new { x.GuildId, x.ChannelId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
    }
}

internal sealed class LevelIgnoredRoleConfiguration : IEntityTypeConfiguration<LevelIgnoredRole>
{
    public void Configure(EntityTypeBuilder<LevelIgnoredRole> builder)
    {
        builder.ToTable("level_ignored_role");
        builder.HasKey(x => new { x.GuildId, x.RoleId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
    }
}

internal sealed class LevelRoleRewardConfiguration : IEntityTypeConfiguration<LevelRoleReward>
{
    public void Configure(EntityTypeBuilder<LevelRoleReward> builder)
    {
        builder.ToTable("level_role_reward");
        builder.HasKey(x => new { x.GuildId, x.Level, x.RoleId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
    }
}

internal sealed class StatisticsChannelConfiguration : IEntityTypeConfiguration<StatisticsChannel>
{
    public void Configure(EntityTypeBuilder<StatisticsChannel> builder)
    {
        builder.ToTable("statistics_channel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.CounterType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelName).HasMaxLength(100);
        builder.HasIndex(x => new { x.GuildId, x.CounterType }).IsUnique();
    }
}

internal sealed class StatisticsChannelRoleConfiguration : IEntityTypeConfiguration<StatisticsChannelRole>
{
    public void Configure(EntityTypeBuilder<StatisticsChannelRole> builder)
    {
        builder.ToTable("statistics_channel_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.RoleName).HasMaxLength(100);
        builder.HasIndex(x => new { x.StatisticsChannelId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.StatisticsChannel).WithMany(x => x.Roles).HasForeignKey(x => x.StatisticsChannelId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GuildInviteSnapshotConfiguration : IEntityTypeConfiguration<GuildInviteSnapshot>
{
    public void Configure(EntityTypeBuilder<GuildInviteSnapshot> builder)
    {
        builder.ToTable("guild_invite_snapshot");
        builder.HasKey(x => new { x.GuildId, x.InviteCode });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.InviteCode).HasMaxLength(128).IsRequired();
        builder.Property(x => x.InviterId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
    }
}

internal sealed class GuildInviteContributionConfiguration : IEntityTypeConfiguration<GuildInviteContribution>
{
    public void Configure(EntityTypeBuilder<GuildInviteContribution> builder)
    {
        builder.ToTable("guild_invite_contribution");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.JoinedUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.InviterUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.InviteCode).HasMaxLength(128);
        builder.Property(x => x.SourceType).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.JoinedUserId }).IsUnique();
    }
}

internal sealed class GuildInviteStatsConfiguration : IEntityTypeConfiguration<GuildInviteStats>
{
    public void Configure(EntityTypeBuilder<GuildInviteStats> builder)
    {
        builder.ToTable("guild_invite_stats");
        builder.HasKey(x => new { x.GuildId, x.UserId, x.PeriodKey });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.PeriodKey).HasMaxLength(16).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.PeriodKey, x.Count }).IsDescending(false, false, true);
    }
}

internal sealed class GuildMemberEventConfiguration : IEntityTypeConfiguration<GuildMemberEvent>
{
    public void Configure(EntityTypeBuilder<GuildMemberEvent> builder)
    {
        builder.ToTable("guild_member_event");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
    }
}

internal sealed class GuildUserActivityDayConfiguration : IEntityTypeConfiguration<GuildUserActivityDay>
{
    public void Configure(EntityTypeBuilder<GuildUserActivityDay> builder)
    {
        builder.ToTable("guild_user_activity_day");
        builder.HasKey(x => new { x.GuildId, x.UserId, x.ActivityDate });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
    }
}
