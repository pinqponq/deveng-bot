import { apiClient } from './client'

export interface ModerationActionLogDto {
  id: number
  guildId: string
  source: string
  ruleType: string
  userIdHash?: string | null
  channelId?: string | null
  messageId?: string | null
  action: string
  actionStatus: string
  reasonKey?: string | null
  reasonParamsJson?: string | null
  scoreSnapshotJson?: string | null
  actorType: string
  actorUserId?: string | null
  reviewId?: number | null
  errorCode?: string | null
  createdAt: string
}

export interface ModerationLogQueryDto {
  source?: string
  userIdHash?: string
  channelId?: string
  action?: string
  ruleType?: string
  from?: string
  to?: string
  limit?: number
}

export const moderationLogsApi = {
  query: async (
    guildId: string,
    query: ModerationLogQueryDto
  ): Promise<ModerationActionLogDto[]> => {
    const { data } = await apiClient.get<ModerationActionLogDto[]>(
      `/api/ModerationLogs/guild/${guildId}`,
      { params: query }
    )
    return data
  },

  getById: async (guildId: string, id: number): Promise<ModerationActionLogDto> => {
    const { data } = await apiClient.get<ModerationActionLogDto>(
      `/api/ModerationLogs/guild/${guildId}/${id}`
    )
    return data
  },
}
