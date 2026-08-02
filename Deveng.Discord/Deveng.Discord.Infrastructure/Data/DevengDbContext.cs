using Deveng.Discord.Infrastructure.Abstractions;
using Deveng.Discord.Infrastructure.Data.Configurations;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Infrastructure.Data;

public sealed class DevengDbContext : DbContext
{
    public DevengDbContext(DbContextOptions<DevengDbContext> options)
        : base(options)
    {
    }

    public DbSet<Guild> Guilds => Set<Guild>();
    public DbSet<GuildFeature> GuildFeatures => Set<GuildFeature>();
    public DbSet<GuildLocaleSetting> GuildLocaleSettings => Set<GuildLocaleSetting>();
    public DbSet<PanelAuditLog> PanelAuditLogs => Set<PanelAuditLog>();
    public DbSet<GuildEmbedTemplate> GuildEmbedTemplates => Set<GuildEmbedTemplate>();

    public DbSet<Giveaway> Giveaways => Set<Giveaway>();
    public DbSet<GiveawayRole> GiveawayRoles => Set<GiveawayRole>();
    public DbSet<GiveawayAllowedRole> GiveawayAllowedRoles => Set<GiveawayAllowedRole>();
    public DbSet<GiveawayParticipant> GiveawayParticipants => Set<GiveawayParticipant>();
    public DbSet<GiveawayWinner> GiveawayWinners => Set<GiveawayWinner>();
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();
    public DbSet<PollVote> PollVotes => Set<PollVote>();
    public DbSet<PollRolePermission> PollRolePermissions => Set<PollRolePermission>();
    public DbSet<TicketPanel> TicketPanels => Set<TicketPanel>();
    public DbSet<TicketPanelRole> TicketPanelRoles => Set<TicketPanelRole>();
    public DbSet<TicketType> TicketTypes => Set<TicketType>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketTranscript> TicketTranscripts => Set<TicketTranscript>();
    public DbSet<TicketStaffRead> TicketStaffReads => Set<TicketStaffRead>();
    public DbSet<ReactionRole> ReactionRoles => Set<ReactionRole>();
    public DbSet<ReactionRoleEmoji> ReactionRoleEmojis => Set<ReactionRoleEmoji>();
    public DbSet<ReactionRoleButton> ReactionRoleButtons => Set<ReactionRoleButton>();
    public DbSet<ReactionRoleMenu> ReactionRoleMenus => Set<ReactionRoleMenu>();
    public DbSet<ReactionRoleMenuOption> ReactionRoleMenuOptions => Set<ReactionRoleMenuOption>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<ReminderSettings> ReminderSettings => Set<ReminderSettings>();
    public DbSet<ReminderEmbedSetting> ReminderEmbedSettings => Set<ReminderEmbedSetting>();
    public DbSet<ApplicationForm> ApplicationForms => Set<ApplicationForm>();
    public DbSet<ApplicationResponse> ApplicationResponses => Set<ApplicationResponse>();
    public DbSet<ApplicationAudit> ApplicationAudits => Set<ApplicationAudit>();

    public DbSet<Moderator> Moderators => Set<Moderator>();
    public DbSet<ModeratorRule> ModeratorRules => Set<ModeratorRule>();
    public DbSet<ForbiddenWord> ForbiddenWords => Set<ForbiddenWord>();
    public DbSet<AIModerationSetting> AIModerationSettings => Set<AIModerationSetting>();
    public DbSet<AIModerationExcludedChannel> AIModerationExcludedChannels => Set<AIModerationExcludedChannel>();
    public DbSet<AIModerationPolicy> AIModerationPolicies => Set<AIModerationPolicy>();
    public DbSet<AIModerationQueue> AIModerationQueues => Set<AIModerationQueue>();
    public DbSet<AIModerationReview> AIModerationReviews => Set<AIModerationReview>();
    public DbSet<AIModerationCapacityUsage> AIModerationCapacityUsages => Set<AIModerationCapacityUsage>();
    public DbSet<ModerationActionLog> ModerationActionLogs => Set<ModerationActionLog>();
    public DbSet<ModerationUserNotice> ModerationUserNotices => Set<ModerationUserNotice>();

    public DbSet<MusicSettings> MusicSettings => Set<MusicSettings>();
    public DbSet<MusicBlacklistedTextChannel> MusicBlacklistedTextChannels => Set<MusicBlacklistedTextChannel>();
    public DbSet<MusicPlaylist> MusicPlaylists => Set<MusicPlaylist>();
    public DbSet<MusicPlaylistItem> MusicPlaylistItems => Set<MusicPlaylistItem>();
    public DbSet<MusicFavorite> MusicFavorites => Set<MusicFavorite>();
    public DbSet<MusicHistory> MusicHistories => Set<MusicHistory>();
    public DbSet<MusicPlaylistImportJob> MusicPlaylistImportJobs => Set<MusicPlaylistImportJob>();
    public DbSet<MusicSession> MusicSessions => Set<MusicSession>();
    public DbSet<MusicSessionParticipant> MusicSessionParticipants => Set<MusicSessionParticipant>();
    public DbSet<MusicRadioStation> MusicRadioStations => Set<MusicRadioStation>();
    public DbSet<MusicLyricsCache> MusicLyricsCaches => Set<MusicLyricsCache>();
    public DbSet<SpotifyUserLink> SpotifyUserLinks => Set<SpotifyUserLink>();
    public DbSet<TemporaryVoiceChannelLobby> TemporaryVoiceChannelLobbies => Set<TemporaryVoiceChannelLobby>();
    public DbSet<TemporaryVoiceChannelRole> TemporaryVoiceChannelRoles => Set<TemporaryVoiceChannelRole>();
    public DbSet<TemporaryVoiceChannelInstance> TemporaryVoiceChannelInstances => Set<TemporaryVoiceChannelInstance>();

    public DbSet<Level> Levels => Set<Level>();
    public DbSet<UserLevel> UserLevels => Set<UserLevel>();
    public DbSet<LevelIgnoredChannel> LevelIgnoredChannels => Set<LevelIgnoredChannel>();
    public DbSet<LevelIgnoredRole> LevelIgnoredRoles => Set<LevelIgnoredRole>();
    public DbSet<LevelRoleReward> LevelRoleRewards => Set<LevelRoleReward>();
    public DbSet<StatisticsChannel> StatisticsChannels => Set<StatisticsChannel>();
    public DbSet<StatisticsChannelRole> StatisticsChannelRoles => Set<StatisticsChannelRole>();
    public DbSet<GuildInviteSnapshot> GuildInviteSnapshots => Set<GuildInviteSnapshot>();
    public DbSet<GuildInviteContribution> GuildInviteContributions => Set<GuildInviteContribution>();
    public DbSet<GuildInviteStats> GuildInviteStats => Set<GuildInviteStats>();
    public DbSet<GuildMemberEvent> GuildMemberEvents => Set<GuildMemberEvent>();
    public DbSet<GuildUserActivityDay> GuildUserActivityDays => Set<GuildUserActivityDay>();

    public DbSet<Welcome> Welcomes => Set<Welcome>();
    public DbSet<WelcomeEmbedSettings> WelcomeEmbedSettings => Set<WelcomeEmbedSettings>();
    public DbSet<WelcomeCardSettings> WelcomeCardSettings => Set<WelcomeCardSettings>();
    public DbSet<WelcomeDMSettings> WelcomeDMSettings => Set<WelcomeDMSettings>();
    public DbSet<WelcomeDMEmbedSettings> WelcomeDMEmbedSettings => Set<WelcomeDMEmbedSettings>();
    public DbSet<WelcomeDMCardSettings> WelcomeDMCardSettings => Set<WelcomeDMCardSettings>();
    public DbSet<Goodbye> Goodbyes => Set<Goodbye>();
    public DbSet<GoodbyeEmbedSettings> GoodbyeEmbedSettings => Set<GoodbyeEmbedSettings>();
    public DbSet<LogChannel> LogChannels => Set<LogChannel>();
    public DbSet<LogChannelEmbedSettings> LogChannelEmbedSettings => Set<LogChannelEmbedSettings>();
    public DbSet<LogChannelType> LogChannelTypes => Set<LogChannelType>();
    public DbSet<HelpCommand> HelpCommands => Set<HelpCommand>();
    public DbSet<HelpCommandRole> HelpCommandRoles => Set<HelpCommandRole>();
    public DbSet<HelpCommandChannel> HelpCommandChannels => Set<HelpCommandChannel>();
    public DbSet<BirthdaySettings> BirthdaySettings => Set<BirthdaySettings>();
    public DbSet<BirthdayUser> BirthdayUsers => Set<BirthdayUser>();
    public DbSet<EmbedMessage> EmbedMessages => Set<EmbedMessage>();
    public DbSet<FeedSubscription> FeedSubscriptions => Set<FeedSubscription>();
    public DbSet<FeedItemDelivery> FeedItemDeliveries => Set<FeedItemDelivery>();
    public DbSet<ScheduledAnnouncement> ScheduledAnnouncements => Set<ScheduledAnnouncement>();
    public DbSet<ScheduledAnnouncementRun> ScheduledAnnouncementRuns => Set<ScheduledAnnouncementRun>();

    public DbSet<CustomBot> CustomBots => Set<CustomBot>();
    public DbSet<GuildAutomation> GuildAutomations => Set<GuildAutomation>();
    public DbSet<CustomCommand> CustomCommands => Set<CustomCommand>();
    public DbSet<GuildCustomCommandUsage> GuildCustomCommandUsages => Set<GuildCustomCommandUsage>();
    public DbSet<GuildReportJob> GuildReportJobs => Set<GuildReportJob>();
    public DbSet<GuildReportNotify> GuildReportNotifies => Set<GuildReportNotify>();
    public DbSet<GuildAutoRoleSetting> GuildAutoRoleSettings => Set<GuildAutoRoleSetting>();
    public DbSet<GuildAutoRoleRole> GuildAutoRoleRoles => Set<GuildAutoRoleRole>();
    public DbSet<GuildAutoRoleAudit> GuildAutoRoleAudits => Set<GuildAutoRoleAudit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DevengDbContext).Assembly);
        modelBuilder.ApplySnakeCaseColumnNames();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = utcNow;
            }

            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAt = utcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
