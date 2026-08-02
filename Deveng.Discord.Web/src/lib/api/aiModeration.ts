import { apiClient } from './client'

export interface AIModerationSettingDto {
  guildId: string
  enabled: boolean
  mode: string
  thresholdLog: number
  thresholdDelete: number
  thresholdTimeout: number
  excludedChannelIdsJson?: string | null
  retentionDays: number
  sampleRate: number
  createdAt: string
  updatedAt: string
}

export interface UpsertAIModerationSettingDto {
  enabled: boolean
  mode: string
  thresholdLog: number
  thresholdDelete: number
  thresholdTimeout: number
  excludedChannelIdsJson?: string | null
  retentionDays: number
  sampleRate: number
}

export interface AIModerationPolicyDto {
  id: number
  guildId: string
  category: string
  logThreshold: number
  deleteThreshold: number
  timeoutThreshold: number
  action: string
  enabled: boolean
}

export interface AIModerationReviewDto {
  id: number
  queueId: number
  guildId: string
  messageId?: string | null
  labelsJson?: string | null
  matchedCategory?: string | null
  score?: number | null
  thresholdSnapshotJson?: string | null
  provider: string
  modelName?: string | null
  recommendedAction?: string | null
  appliedAction?: string | null
  decisionReasonKey?: string | null
  decisionReasonParamsJson?: string | null
  moderatorDecision?: string | null
  createdAt: string
  expiresAt?: string | null
}

export const aiModerationApi = {
  getSettings: async (guildId: string): Promise<AIModerationSettingDto | null> => {
    try {
      const { data } = await apiClient.get<AIModerationSettingDto>(
        `/api/AIModeration/guild/${guildId}/settings`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  upsertSettings: async (
    guildId: string,
    dto: UpsertAIModerationSettingDto
  ): Promise<AIModerationSettingDto> => {
    const { data } = await apiClient.put<AIModerationSettingDto>(
      `/api/AIModeration/guild/${guildId}/settings`,
      dto
    )
    return data
  },

  getPolicies: async (guildId: string): Promise<AIModerationPolicyDto[]> => {
    const { data } = await apiClient.get<AIModerationPolicyDto[]>(
      `/api/AIModeration/guild/${guildId}/policies`
    )
    return data
  },

  upsertPolicy: async (
    guildId: string,
    category: string,
    dto: Omit<AIModerationPolicyDto, 'id' | 'guildId' | 'category'>
  ): Promise<AIModerationPolicyDto> => {
    const { data } = await apiClient.put<AIModerationPolicyDto>(
      `/api/AIModeration/guild/${guildId}/policies/${category}`,
      { ...dto, category }
    )
    return data
  },

  getReviews: async (guildId: string): Promise<AIModerationReviewDto[]> => {
    const { data } = await apiClient.get<AIModerationReviewDto[]>(
      `/api/AIModeration/guild/${guildId}/reviews`
    )
    return data
  },

  decide: async (guildId: string, reviewId: number, decision: string): Promise<void> => {
    await apiClient.post(`/api/AIModeration/guild/${guildId}/reviews/${reviewId}/decision`, { decision })
  },
}
