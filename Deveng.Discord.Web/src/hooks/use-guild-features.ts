import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { guildFeatureApi } from '@/lib/api'

/**
 * API/DB'deki FeatureName (PascalCase) -> Sidebar'daki featureName (sidebar-data.ts) eşlemesi.
 * Yeşil nokta sadece GuildFeatures tablosunda kaydı olan ve IsEnabled=true olan özelliklerde görünür.
 */
const API_FEATURE_NAME_TO_SIDEBAR: Record<string, string> = {
  Welcome: 'welcome',
  Goodbye: 'goodbye',
  EmbedMessage: 'embed-message',
  ReactionRole: 'reaction-role',
  Level: 'level',
  TicketPanel: 'ticket',
  Moderator: 'moderator',
  LogChannel: 'log',
  HelpCommand: 'help',
  CustomCommand: 'custom-command',
  TemporaryVoiceChannel: 'voice',
  StatisticsChannel: 'statistics',
  Birthday: 'birthday',
  Poll: 'poll',
  Giveaway: 'giveaway',
  Reminder: 'reminder',
  Music: 'music',
  AutoRole: 'auto-role',
  InviteLeaderboard: 'invite-leaderboard',
  ScheduledAnnouncement: 'scheduled-announcement',
  FeedAnnouncement: 'feed-announcement',
  AIModeration: 'ai-moderation',
  GuildReport: 'guild-report',
  Locale: 'locale',
  Automation: 'automation',
  ModerationLogs: 'moderation-logs',
  AuditLogs: 'audit-logs',
}

/** Sidebar featureName -> API/DB FeatureName (PascalCase). Enable/disable çağrılarında tabloya doğru isimle yazılsın. */
export const SIDEBAR_TO_API_FEATURE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(API_FEATURE_NAME_TO_SIDEBAR).map(([api, sidebar]) => [sidebar, api])
)

/**
 * Seçili sunucunun tüm özellik durumlarını getirir.
 * Sidebar'da özelliklerin aktif/pasif göstergesini göstermek için kullanılır.
 * Kaynak: Sadece GuildFeatures tablosu (API GetGuildFeatures).
 */
export function useGuildFeatures(guildId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['guild-features', guildId],
    queryFn: () => guildFeatureApi.getAll(guildId!),
    enabled: !!guildId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  })

  const enabledFeatureNames = useMemo(() => {
    const list = data ?? []
    // Canonical (PascalCase) isimle grupla; aynı özellik "help" ve "HelpCommand" diye iki gelirse canonical (HelpCommand) kazanır
    const byCanonical = new Map<string, boolean>()
    const toCanonical = (name: string) =>
      name in API_FEATURE_NAME_TO_SIDEBAR ? name : (SIDEBAR_TO_API_FEATURE_NAME[name] ?? null)
    for (const f of list) {
      const canonical = toCanonical(f.featureName)
      if (canonical == null) continue
      if (f.featureName in API_FEATURE_NAME_TO_SIDEBAR) byCanonical.set(canonical, f.isEnabled)
    }
    for (const f of list) {
      const canonical = toCanonical(f.featureName)
      if (canonical == null || byCanonical.has(canonical)) continue
      byCanonical.set(canonical, f.isEnabled)
    }
    const sidebarNames = Array.from(byCanonical.entries())
      .filter(([, enabled]) => enabled)
      .map(([canonical]) => API_FEATURE_NAME_TO_SIDEBAR[canonical])
    return new Set(sidebarNames)
  }, [data])

  return { enabledFeatureNames, isLoading }
}
