import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  Command,
  PartyPopper,
  LogOut,
  MousePointerClick,
  Cake,
  Shield,
  Ticket,
  FileText,
  Mic,
  BarChart3,
  Calendar,
  ScrollText,
  Gift,
  Bot,
  Trophy,
  Music,
  Home,
  History,
  Heart,
  ListMusic,
  Radio,
  Settings,
  Workflow,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '',
    email: '',
    avatar: '/favicon.png',
  },
  teams: [
    {
      name: 'Deveng',
      logo: Command,
      plan: 'Deveng',
    },
  ],
  navGroups: [
    {
      title: 'General',
      titleKey: 'nav:general',
      items: [
        { title: 'Dashboard', titleKey: 'nav:dashboard', url: '/dashboard', icon: LayoutDashboard, descriptionKey: 'dashboard:cardDescDashboard' },
        { title: 'Analitik', titleKey: 'nav:guildAnalytics', url: '/guild-analytics', icon: BarChart3, descriptionKey: 'dashboard:cardDescGuildAnalytics' },
      ],
    },
    {
      title: 'Mesajlaşma',
      titleKey: 'nav:messaging',
      items: [
        { title: 'Welcome', titleKey: 'nav:welcome', url: '/bot-welcome', icon: PartyPopper, featureName: 'welcome', descriptionKey: 'dashboard:cardDescWelcome' },
        { title: 'Goodbye', titleKey: 'nav:goodbye', url: '/bot-goodbye', icon: LogOut, featureName: 'goodbye', descriptionKey: 'dashboard:cardDescGoodbye' },
        { title: 'Gömülü Mesaj', titleKey: 'nav:embedMessage', url: '/bot-embed-message', icon: FileText, featureName: 'embed-message', descriptionKey: 'dashboard:cardDescEmbedMessage' },
        { title: 'Reaction Role', titleKey: 'nav:reactionRole', url: '/bot-reaction-role', icon: MousePointerClick, featureName: 'reaction-role', descriptionKey: 'dashboard:cardDescReactionRole' },
        { title: 'Zamanlanmış Duyurular', titleKey: 'nav:scheduledAnnouncement', url: '/bot-scheduled-announcement', icon: Calendar, featureName: 'scheduled-announcement' },
        { title: 'Feed Duyuruları', titleKey: 'nav:feeds', url: '/bot-feeds', icon: Radio, featureName: 'feed-announcement' },
      ],
    },
    {
      title: 'Etkileşim',
      titleKey: 'nav:interaction',
      items: [
        { title: 'Anket', titleKey: 'nav:poll', url: '/bot-poll', icon: MessagesSquare, featureName: 'poll', descriptionKey: 'dashboard:cardDescPoll' },
        { title: 'Çekiliş', titleKey: 'nav:giveaway', url: '/bot-giveaway', icon: Gift, featureName: 'giveaway', descriptionKey: 'dashboard:cardDescGiveaway' },
        { title: 'Level Sistemi', titleKey: 'nav:levelSystem', url: '/bot-level', icon: Trophy, featureName: 'level', descriptionKey: 'dashboard:cardDescLevel' },
        { title: 'Davet Liderliği', titleKey: 'nav:inviteLeaderboard', url: '/bot-invite-leaderboard', icon: Users, featureName: 'invite-leaderboard' },
        {
          title: 'Müzik',
          titleKey: 'nav:music',
          icon: Music,
          featureName: 'music',
          descriptionKey: 'dashboard:cardDescMusic',
          items: [
            { title: 'Home', titleKey: 'nav:musicHome', url: '/bot-music?view=home', icon: Home, featureName: 'music' },
            { title: 'History', titleKey: 'nav:musicHistory', url: '/bot-music?view=history', icon: History, featureName: 'music' },
            { title: 'Liked Songs', titleKey: 'nav:musicLiked', url: '/bot-music?view=liked', icon: Heart, featureName: 'music' },
            { title: 'Playlists', titleKey: 'nav:musicPlaylists', url: '/bot-music?view=playlists', icon: ListMusic, featureName: 'music' },
            { title: 'Radio', titleKey: 'nav:musicRadio', url: '/bot-music?view=radio', icon: Radio, featureName: 'music' },
            { title: 'Settings', titleKey: 'nav:musicSettings', url: '/bot-music?view=settings', icon: Settings, featureName: 'music' },
          ],
        },
        { title: 'Talep Paneli', titleKey: 'nav:ticketPanel', url: '/bot-ticket-panel', icon: Ticket, featureName: 'ticket', descriptionKey: 'dashboard:cardDescTicketPanel' },
      ],
    },
    {
      title: 'Moderatör & Güvenlik',
      titleKey: 'nav:moderatorSecurity',
      items: [
        { title: 'Moderatör', titleKey: 'nav:moderator', url: '/bot-moderator', icon: Shield, featureName: 'moderator', descriptionKey: 'dashboard:cardDescModerator' },
        { title: 'AI Moderasyon', titleKey: 'nav:aiModeration', url: '/bot-ai-moderation', icon: Shield, featureName: 'ai-moderation' },
        { title: 'Moderasyon Kayıtları', titleKey: 'nav:moderationLogs', url: '/bot-moderation-logs', icon: ScrollText, featureName: 'moderation-logs' },
        { title: 'Denetim Kayıtları', titleKey: 'nav:auditLogs', url: '/bot-audit-logs', icon: ScrollText, featureName: 'audit-logs' },
        { title: 'Log Kanalı', titleKey: 'nav:logChannel', url: '/bot-log-channel', icon: ScrollText, featureName: 'log', descriptionKey: 'dashboard:cardDescLogChannel' },
      ],
    },
    {
      title: 'Komutlar',
      titleKey: 'nav:commands',
      items: [
        {
          title: 'Özel Komutlar',
          titleKey: 'nav:customCommands',
          url: '/bot-custom-command',
          icon: Command,
          featureName: 'custom-command',
          descriptionKey: 'dashboard:cardDescCustomCommands',
        },
        { title: 'Otomasyonlar', titleKey: 'nav:automation', url: '/bot-automation', icon: Workflow, featureName: 'automation', descriptionKey: 'dashboard:cardDescAutomation' },
      ],
    },
    {
      title: 'Kanal Yönetimi',
      titleKey: 'nav:channelManagement',
      items: [
        { title: 'Geçici Ses Kanalı', titleKey: 'nav:temporaryVoiceChannel', url: '/bot-temporary-voice-channel', icon: Mic, featureName: 'voice', descriptionKey: 'dashboard:cardDescTemporaryVoice' },
        { title: 'İstatistik Kanalları', titleKey: 'nav:statisticsChannels', url: '/bot-statistics-channel', icon: BarChart3, featureName: 'statistics', descriptionKey: 'dashboard:cardDescStatistics' },
        { title: 'Otomatik Rol', titleKey: 'nav:autoRole', url: '/bot-autorole', icon: Users, featureName: 'auto-role' },
      ],
    },
    {
      title: 'Diğer',
      titleKey: 'nav:other',
      items: [
        { title: 'Doğum Günü', titleKey: 'nav:birthday', url: '/bot-birthday', icon: Cake, featureName: 'birthday', descriptionKey: 'dashboard:cardDescBirthday' },
        { title: 'Hatırlatıcı', titleKey: 'nav:reminder', url: '/bot-reminder', icon: Calendar, featureName: 'reminder', descriptionKey: 'dashboard:cardDescReminder' },
        { title: 'Yönetim Raporları', titleKey: 'nav:reports', url: '/bot-reports', icon: BarChart3, featureName: 'guild-report' },
        { title: 'Sunucu Dili', titleKey: 'nav:serverLocale', url: '/bot-locale', icon: Settings, featureName: 'locale' },
        { title: 'Özel Bot', titleKey: 'nav:customBots', url: '/bot-private-bot', icon: Bot, descriptionKey: 'dashboard:cardDescCustomBots' },
      ],
    },
  ],
}
