using Deveng.Discord.Infrastructure.Abstractions;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class GuildConfiguration : IEntityTypeConfiguration<Guild>
{
    public void Configure(EntityTypeBuilder<Guild> builder)
    {
        builder.ToTable("guilds");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.GuildName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.OwnerId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);

        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class GuildFeatureConfiguration : IEntityTypeConfiguration<GuildFeature>
{
    public void Configure(EntityTypeBuilder<GuildFeature> builder)
    {
        builder.ToTable("guild_features");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.FeatureName).HasMaxLength(50).IsRequired();

        builder.HasIndex(x => new { x.GuildId, x.FeatureName }).IsUnique();

        builder.HasOne(x => x.Guild)
            .WithMany(x => x.Features)
            .HasForeignKey(x => x.GuildId)
            .HasPrincipalKey(x => x.GuildId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GuildLocaleSettingConfiguration : IEntityTypeConfiguration<GuildLocaleSetting>
{
    public void Configure(EntityTypeBuilder<GuildLocaleSetting> builder)
    {
        builder.ToTable("guild_locale_setting");

        builder.HasKey(x => x.GuildId);

        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.DefaultLocale).HasMaxLength(16).IsRequired();
        builder.Property(x => x.FallbackLocale).HasMaxLength(16).IsRequired();
    }
}

internal sealed class PanelAuditLogConfiguration : IEntityTypeConfiguration<PanelAuditLog>
{
    public void Configure(EntityTypeBuilder<PanelAuditLog> builder)
    {
        builder.ToTable("panel_audit_log");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ActorType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ActorUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ActorUsernameSnapshot).HasMaxLength(256);
        builder.Property(x => x.ActorAvatarSnapshot).HasMaxLength(512);
        builder.Property(x => x.Action).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ResourceType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ResourceId).HasMaxLength(128);
        builder.Property(x => x.RequestId).HasMaxLength(128);
        builder.Property(x => x.IpHash).HasMaxLength(128);
        builder.Property(x => x.UserAgentHash).HasMaxLength(128);
        builder.Property(x => x.Result).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ErrorCode).HasMaxLength(64);

        builder.HasIndex(x => new { x.GuildId, x.CreatedAtUtc, x.Id })
            .IsDescending(false, true, true);
    }
}

internal sealed class GuildEmbedTemplateConfiguration : IEntityTypeConfiguration<GuildEmbedTemplate>
{
    public void Configure(EntityTypeBuilder<GuildEmbedTemplate> builder)
    {
        builder.ToTable("guild_embed_template");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Slot).HasMaxLength(64);
        builder.Property(x => x.Message).HasMaxLength(4000);
        builder.Property(x => x.EmbedTitle).HasMaxLength(256);
        builder.Property(x => x.EmbedDescription).HasMaxLength(4096);
        builder.Property(x => x.EmbedColor).HasMaxLength(16);
        builder.Property(x => x.EmbedThumbnail).HasMaxLength(2048);
        builder.Property(x => x.EmbedImage).HasMaxLength(2048);
        builder.Property(x => x.EmbedFooter).HasMaxLength(2048);
        builder.Property(x => x.EmbedAuthorName).HasMaxLength(256);
        builder.Property(x => x.EmbedAuthorIcon).HasMaxLength(2048);
        builder.Property(x => x.EmbedAuthorUrl).HasMaxLength(2048);

        builder.HasIndex(x => new { x.GuildId, x.Kind, x.ParentEntityId, x.Slot });
    }
}
