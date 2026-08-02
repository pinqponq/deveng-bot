import { apiClient } from './client'

export interface FeedSubscriptionDto {
  id: number
  guildId: string
  type: 'rss' | 'youtube' | 'twitch'
  url: string
  externalId?: string | null
  targetChannelId: string
  mentionRoleId?: string | null
  enabled: boolean
  pollIntervalSeconds: number
  lastEtag?: string | null
  lastModified?: string | null
  lastItemId?: string | null
  errorCount: number
  lastSuccessAt?: string | null
  lastErrorAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertFeedSubscriptionDto {
  id?: number
  type: 'rss' | 'youtube' | 'twitch'
  url: string
  externalId?: string | null
  targetChannelId: string
  mentionRoleId?: string | null
  enabled: boolean
  pollIntervalSeconds: number
}

export interface FeedDeliveryDto {
  subscriptionId: number
  itemId: string
  itemHash?: string | null
  deliveredAt: string
  messageId?: string | null
  guildId: string
  type: string
  url: string
  targetChannelId: string
}

export interface FeedPreviewDto {
  title: string
  items: Array<{
    id: string
    title: string
    link?: string | null
    publishedAt?: string | null
  }>
}

export const feedAnnouncementApi = {
  getByGuildId: async (guildId: string): Promise<FeedSubscriptionDto[]> => {
    const { data } = await apiClient.get<FeedSubscriptionDto[]>(
      `/api/FeedAnnouncement/guild/${guildId}`
    )
    return data
  },

  getDeliveries: async (guildId: string): Promise<FeedDeliveryDto[]> => {
    const { data } = await apiClient.get<FeedDeliveryDto[]>(
      `/api/FeedAnnouncement/guild/${guildId}/deliveries`
    )
    return data
  },

  preview: async (guildId: string, url: string): Promise<FeedPreviewDto> => {
    const { data } = await apiClient.post<FeedPreviewDto>(
      `/api/FeedAnnouncement/guild/${guildId}/preview`,
      { url }
    )
    return data
  },

  upsert: async (
    guildId: string,
    dto: UpsertFeedSubscriptionDto
  ): Promise<FeedSubscriptionDto> => {
    const { data } = await apiClient.post<FeedSubscriptionDto>(
      `/api/FeedAnnouncement/guild/${guildId}`,
      dto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/FeedAnnouncement/guild/${guildId}/${id}`)
  },
}
