using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal sealed class GiveawayConfiguration : IEntityTypeConfiguration<Giveaway>
{
    public void Configure(EntityTypeBuilder<Giveaway> builder)
    {
        builder.ToTable("giveaway");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Prize).HasMaxLength(500).IsRequired();
        builder.Property(x => x.TimeZone).HasMaxLength(64);
        builder.HasIndex(x => new { x.IsActive, x.IsEnded, x.EndDate })
            .HasFilter("\"is_active\" = TRUE AND \"is_ended\" = FALSE");
    }
}

internal sealed class GiveawayRoleConfiguration : IEntityTypeConfiguration<GiveawayRole>
{
    public void Configure(EntityTypeBuilder<GiveawayRole> builder)
    {
        builder.ToTable("giveaway_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.WinChanceMultiplier).HasPrecision(5, 2);
        builder.HasIndex(x => new { x.GiveawayId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.Giveaway).WithMany(x => x.Roles).HasForeignKey(x => x.GiveawayId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GiveawayAllowedRoleConfiguration : IEntityTypeConfiguration<GiveawayAllowedRole>
{
    public void Configure(EntityTypeBuilder<GiveawayAllowedRole> builder)
    {
        builder.ToTable("giveaway_allowed_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GiveawayId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.Giveaway).WithMany(x => x.AllowedRoles).HasForeignKey(x => x.GiveawayId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GiveawayParticipantConfiguration : IEntityTypeConfiguration<GiveawayParticipant>
{
    public void Configure(EntityTypeBuilder<GiveawayParticipant> builder)
    {
        builder.ToTable("giveaway_participant");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GiveawayId, x.UserId }).IsUnique();
        builder.HasOne(x => x.Giveaway).WithMany(x => x.Participants).HasForeignKey(x => x.GiveawayId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class GiveawayWinnerConfiguration : IEntityTypeConfiguration<GiveawayWinner>
{
    public void Configure(EntityTypeBuilder<GiveawayWinner> builder)
    {
        builder.ToTable("giveaway_winner");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GiveawayId, x.UserId }).IsUnique();
        builder.HasOne(x => x.Giveaway).WithMany(x => x.Winners).HasForeignKey(x => x.GiveawayId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class PollConfiguration : IEntityTypeConfiguration<Poll>
{
    public void Configure(EntityTypeBuilder<Poll> builder)
    {
        builder.ToTable("poll");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Question).HasMaxLength(500).IsRequired();
        builder.Property(x => x.CreatedVia).HasMaxLength(32);
        builder.HasIndex(x => x.GuildId).HasFilter("\"is_active\" = TRUE");
        builder.HasIndex(x => new { x.GuildId, x.CreatedAt, x.Id }).IsDescending(false, true, true);
    }
}

internal sealed class PollOptionConfiguration : IEntityTypeConfiguration<PollOption>
{
    public void Configure(EntityTypeBuilder<PollOption> builder)
    {
        builder.ToTable("poll_option");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.OptionText).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(128);
        builder.HasOne(x => x.Poll).WithMany(x => x.Options).HasForeignKey(x => x.PollId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class PollVoteConfiguration : IEntityTypeConfiguration<PollVote>
{
    public void Configure(EntityTypeBuilder<PollVote> builder)
    {
        builder.ToTable("poll_vote");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.PollId, x.UserId, x.OptionId }).IsUnique();
        builder.HasOne(x => x.Poll).WithMany(x => x.Votes).HasForeignKey(x => x.PollId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Option).WithMany(x => x.Votes).HasForeignKey(x => x.OptionId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class PollRolePermissionConfiguration : IEntityTypeConfiguration<PollRolePermission>
{
    public void Configure(EntityTypeBuilder<PollRolePermission> builder)
    {
        builder.ToTable("poll_role_permission");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.PollId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.Poll).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PollId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TicketPanelConfiguration : IEntityTypeConfiguration<TicketPanel>
{
    public void Configure(EntityTypeBuilder<TicketPanel> builder)
    {
        builder.ToTable("ticket_panel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.TranscriptChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.OpenCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ClaimedCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ClosedCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class TicketPanelRoleConfiguration : IEntityTypeConfiguration<TicketPanelRole>
{
    public void Configure(EntityTypeBuilder<TicketPanelRole> builder)
    {
        builder.ToTable("ticket_panel_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.TicketPanelId, x.RoleId }).IsUnique();
        builder.HasOne(x => x.TicketPanel).WithMany(x => x.Roles).HasForeignKey(x => x.TicketPanelId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TicketTypeConfiguration : IEntityTypeConfiguration<TicketType>
{
    public void Configure(EntityTypeBuilder<TicketType> builder)
    {
        builder.ToTable("ticket_type");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Label).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(128);
        builder.Property(x => x.Placeholder).HasMaxLength(150);
        builder.Property(x => x.OpenCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ClaimedCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ClosedCategoryId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasOne(x => x.TicketPanel).WithMany(x => x.TicketTypes).HasForeignKey(x => x.TicketPanelId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TicketConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.ToTable("ticket");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.ClaimedBy).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ClosedBy).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.LastMessageAuthorId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => new { x.GuildId, x.CreatedAt }).IsDescending(false, true);
        builder.HasOne(x => x.TicketPanel).WithMany(x => x.Tickets).HasForeignKey(x => x.TicketPanelId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.TicketType).WithMany(x => x.Tickets).HasForeignKey(x => x.TicketTypeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.Transcript).WithOne(x => x.Ticket).HasForeignKey<TicketTranscript>(x => x.TicketId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TicketTranscriptConfiguration : IEntityTypeConfiguration<TicketTranscript>
{
    public void Configure(EntityTypeBuilder<TicketTranscript> builder)
    {
        builder.ToTable("ticket_transcript");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.TranscriptUrl).HasMaxLength(2048);
        builder.HasIndex(x => new { x.GuildId, x.CreatedAt }).IsDescending(false, true);
    }
}

internal sealed class TicketStaffReadConfiguration : IEntityTypeConfiguration<TicketStaffRead>
{
    public void Configure(EntityTypeBuilder<TicketStaffRead> builder)
    {
        builder.ToTable("ticket_staff_read");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.StaffUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.TicketId, x.StaffUserId }).IsUnique();
        builder.HasIndex(x => new { x.StaffUserId, x.TicketId });
        builder.HasOne(x => x.Ticket).WithMany(x => x.StaffReads).HasForeignKey(x => x.TicketId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ReactionRoleConfiguration : IEntityTypeConfiguration<ReactionRole>
{
    public void Configure(EntityTypeBuilder<ReactionRole> builder)
    {
        builder.ToTable("reaction_role");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.MessageId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
    }
}

internal sealed class ReactionRoleEmojiConfiguration : IEntityTypeConfiguration<ReactionRoleEmoji>
{
    public void Configure(EntityTypeBuilder<ReactionRoleEmoji> builder)
    {
        builder.ToTable("reaction_role_emoji");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Emoji).HasMaxLength(128).IsRequired();
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.ReactionRole).WithMany(x => x.Emojis).HasForeignKey(x => x.ReactionRoleId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ReactionRoleButtonConfiguration : IEntityTypeConfiguration<ReactionRoleButton>
{
    public void Configure(EntityTypeBuilder<ReactionRoleButton> builder)
    {
        builder.ToTable("reaction_role_button");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Label).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(128);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasOne(x => x.ReactionRole).WithMany(x => x.Buttons).HasForeignKey(x => x.ReactionRoleId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ReactionRoleMenuConfiguration : IEntityTypeConfiguration<ReactionRoleMenu>
{
    public void Configure(EntityTypeBuilder<ReactionRoleMenu> builder)
    {
        builder.ToTable("reaction_role_menu");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Placeholder).HasMaxLength(150);
        builder.HasOne(x => x.ReactionRole).WithMany(x => x.Menus).HasForeignKey(x => x.ReactionRoleId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ReactionRoleMenuOptionConfiguration : IEntityTypeConfiguration<ReactionRoleMenuOption>
{
    public void Configure(EntityTypeBuilder<ReactionRoleMenuOption> builder)
    {
        builder.ToTable("reaction_role_menu_option");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Label).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(100);
        builder.Property(x => x.RoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(128);
        builder.HasOne(x => x.Menu).WithMany(x => x.Options).HasForeignKey(x => x.MenuId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ReminderConfiguration : IEntityTypeConfiguration<Reminder>
{
    public void Configure(EntityTypeBuilder<Reminder> builder)
    {
        builder.ToTable("reminder");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.HasIndex(x => new { x.GuildId, x.IsSent, x.RemindDate });
    }
}

internal sealed class ReminderSettingsConfiguration : IEntityTypeConfiguration<ReminderSettings>
{
    public void Configure(EntityTypeBuilder<ReminderSettings> builder)
    {
        builder.ToTable("reminder_settings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.HasIndex(x => x.GuildId).IsUnique();
    }
}

internal sealed class ReminderEmbedSettingConfiguration : IEntityTypeConfiguration<ReminderEmbedSetting>
{
    public void Configure(EntityTypeBuilder<ReminderEmbedSetting> builder)
    {
        builder.ToTable("reminder_embed_setting");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Slot).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => new { x.ReminderSettingsId, x.Slot }).IsUnique();
        builder.HasOne(x => x.ReminderSettings).WithMany(x => x.EmbedSettings).HasForeignKey(x => x.ReminderSettingsId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ApplicationFormConfiguration : IEntityTypeConfiguration<ApplicationForm>
{
    public void Configure(EntityTypeBuilder<ApplicationForm> builder)
    {
        builder.ToTable("application_form");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.SubmitChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ReviewChannelId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.ApprovalRoleId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => x.GuildId);
    }
}

internal sealed class ApplicationResponseConfiguration : IEntityTypeConfiguration<ApplicationResponse>
{
    public void Configure(EntityTypeBuilder<ApplicationResponse> builder)
    {
        builder.ToTable("application_response");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.UserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.AssigneeUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.HasIndex(x => new { x.GuildId, x.Status });
        builder.HasOne(x => x.Form).WithMany(x => x.Responses).HasForeignKey(x => x.FormId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ApplicationAuditConfiguration : IEntityTypeConfiguration<ApplicationAudit>
{
    public void Configure(EntityTypeBuilder<ApplicationAudit> builder)
    {
        builder.ToTable("application_audit");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GuildId).HasMaxLength(EntityConfigurationExtensions.GuildIdMaxLength).IsRequired();
        builder.Property(x => x.ActorUserId).HasMaxLength(EntityConfigurationExtensions.DiscordIdMaxLength);
        builder.Property(x => x.Action).HasMaxLength(64).IsRequired();
        builder.HasOne(x => x.Response).WithMany(x => x.Audits).HasForeignKey(x => x.ResponseId).OnDelete(DeleteBehavior.Cascade);
    }
}
