import { apiClient } from './client'

export interface GuildInviteLeaderboardEntryDto {
  guildId: string
  userId: string
  periodKey: string
  count: number
  lastContributedAt?: string | null
}

export interface GuildInviteContributionDto {
  id: number
  guildId: string
  joinedUserId: string
  inviterUserId?: string | null
  inviteCode?: string | null
  joinedAt: string
  sourceType: string
}

export interface GuildInviteSnapshotDto {
  guildId: string
  inviteCode: string
  inviterId?: string | null
  uses: number
  channelId?: string | null
  expiresAt?: string | null
  lastSeenAt: string
}

export const inviteLeaderboardApi = {
  getLeaderboard: async (
    guildId: string,
    periodKey: string
  ): Promise<GuildInviteLeaderboardEntryDto[]> => {
    const { data } = await apiClient.get<GuildInviteLeaderboardEntryDto[]>(
      `/api/InviteLeaderboard/guild/${guildId}/leaderboard`,
      { params: { periodKey, limit: 50 } }
    )
    return data
  },

  getContributions: async (guildId: string): Promise<GuildInviteContributionDto[]> => {
    const { data } = await apiClient.get<GuildInviteContributionDto[]>(
      `/api/InviteLeaderboard/guild/${guildId}/contributions`
    )
    return data
  },

  getSnapshots: async (guildId: string): Promise<GuildInviteSnapshotDto[]> => {
    const { data } = await apiClient.get<GuildInviteSnapshotDto[]>(
      `/api/InviteLeaderboard/guild/${guildId}/snapshots`
    )
    return data
  },
}
