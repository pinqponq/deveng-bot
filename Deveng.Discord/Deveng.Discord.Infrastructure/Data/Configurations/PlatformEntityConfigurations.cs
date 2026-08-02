using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class CustomBotConfiguration : IEntityTypeConfiguration<CustomBot>
{
    public void Configure(EntityTypeBuilder<CustomBot> builder)
    {
        builder.ToTable("custom_bots");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.BotToken).HasMaxLength(256).IsRequired();
        builder.Property(x => x.ClientId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.OwnerId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.BotName).HasMaxLength(256);
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.AvatarUrl).HasColumnType("text");
        builder.Property(x => x.BannerUrl).HasColumnType("text");
        builder.Property(x => x.PresenceStatus).HasMaxLength(16).IsRequired();
        builder.Property(x => x.ActivityType).HasMaxLength(16).IsRequired();
        builder.Property(x => x.ActivityText).HasMaxLength(128);
        builder.Property(x => x.PersonalizationEnabled).HasDefaultValue(false);
        builder.HasIndex(x => x.BotToken).IsUnique();
        builder.HasIndex(x => x.ClientId).IsUnique();
    }
}

internal sealed class GuildAutomationConfiguration : IEntityTypeConfiguration<GuildAutomation>
{
    public void Configure(EntityTypeBuilder<GuildAutomation> builder)
    {
        builder.ToTable("guild_automation");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.Enabled });
    }
}

internal sealed class CustomCommandConfiguration : IEntityTypeConfiguration<CustomCommand>
{
    public void Configure(EntityTypeBuilder<CustomCommand> builder)
    {
        builder.ToTable("custom_command");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.CommandName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.TargetChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.TriggerPattern).HasMaxLength(512);
        builder.Property(x => x.Scope).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.CommandName }).IsUnique();
    }
}

internal sealed class GuildCustomCommandUsageConfiguration : IEntityTypeConfiguration<GuildCustomCommandUsage>
{
    public void Configure(EntityTypeBuilder<GuildCustomCommandUsage> builder)
    {
        builder.ToTable("guild_custom_command_usage");
        builder.HasKey(x => new { x.GuildId, x.CommandId, x.UserId });
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.Command).WithMany(x => x.UsageRecords).HasForeignKey(x => x.CommandId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GuildReportJobConfiguration : IEntityTypeConfiguration<GuildReportJob>
{
    public void Configure(EntityTypeBuilder<GuildReportJob> builder)
    {
        builder.ToTable("guild_report_job");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ReportRange).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(64).IsRequired();
        builder.Property(x => x.FileRef).HasMaxLength(512);
        builder.Property(x => x.EmailTo).HasMaxLength(320);
        builder.Property(x => x.EmailStatus).HasMaxLength(32);
    }
}

internal sealed class GuildReportNotifyConfiguration : IEntityTypeConfiguration<GuildReportNotify>
{
    public void Configure(EntityTypeBuilder<GuildReportNotify> builder)
    {
        builder.ToTable("guild_report_notify");
        builder.HasKey(x => x.GuildId);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.NotifyEmail).HasMaxLength(320);
    }
}

internal sealed class GuildAutoRoleSettingConfiguration : IEntityTypeConfiguration<GuildAutoRoleSetting>
{
    public void Configure(EntityTypeBuilder<GuildAutoRoleSetting> builder)
    {
        builder.ToTable("guild_auto_role_setting");
        builder.HasKey(x => x.GuildId);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
    }
}

internal sealed class GuildAutoRoleRoleConfiguration : IEntityTypeConfiguration<GuildAutoRoleRole>
{
    public void Configure(EntityTypeBuilder<GuildAutoRoleRole> builder)
    {
        builder.ToTable("guild_auto_role_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.Setting).WithMany(x => x.Roles).HasForeignKey(x => x.GuildId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GuildAutoRoleAuditConfiguration : IEntityTypeConfiguration<GuildAutoRoleAudit>
{
    public void Configure(EntityTypeBuilder<GuildAutoRoleAudit> builder)
    {
        builder.ToTable("guild_auto_role_audit");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserIdHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Result).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ErrorCode).HasMaxLength(64);
        builder.HasOne(x => x.Setting).WithMany(x => x.Audits).HasForeignKey(x => x.GuildId).OnDelete(DeleteBehavior.Cascade);
    }
}
