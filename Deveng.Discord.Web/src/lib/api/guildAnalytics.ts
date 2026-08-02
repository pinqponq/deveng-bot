import { apiClient } from './client'

export interface GuildAnalyticsSummary {
  guildId: string
  rangeFromUtc: string
  rangeToUtc: string
  approximateMemberCount?: number | null
  approximatePresenceCount?: number | null
  joinCount: number
  leaveCount: number
  netMemberDeltaInRange: number
  inviteJoinsInRange: number
  moderationActionsInRange: number
  messagesInRange: number
  distinctActiveUsersInRange: number
  dauToday: number
  wau7: number
  mau30: number
  openTickets: number
  pendingStaffReplyTickets: number
  unreadTicketsForStaff: number
}

export const guildAnalyticsApi = {
  getSummary: async (
    guildId: string,
    opts?: { fromUtc?: string; toUtc?: string; includeMyUnreadTickets?: boolean }
  ): Promise<GuildAnalyticsSummary> => {
    const { data } = await apiClient.get<GuildAnalyticsSummary>(`/api/GuildAnalytics/guild/${guildId}/summary`, {
      params: {
        fromUtc: opts?.fromUtc,
        toUtc: opts?.toUtc,
        includeMyUnreadTickets: opts?.includeMyUnreadTickets === true ? true : undefined,
      },
    })
    return data
  },
}
