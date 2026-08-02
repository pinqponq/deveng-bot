import { apiClient } from './client'

export interface ScheduledAnnouncementDto {
  id: number
  guildId: string
  channelId: string
  title?: string | null
  content?: string | null
  mentionPolicy: string
  timezone: string
  scheduleType: string
  sendAtUtc?: string | null
  nextRunAtUtc?: string | null
  lastRunAtUtc?: string | null
  paused: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertScheduledAnnouncementDto {
  id?: number
  channelId: string
  title?: string | null
  content?: string | null
  mentionPolicy: string
  timezone: string
  scheduleType: string
  sendAtUtc?: string | null
  nextRunAtUtc?: string | null
  paused: boolean
  enabled: boolean
}

export interface ScheduledAnnouncementRunDto {
  id: number
  announcementId: number
  guildId: string
  title?: string | null
  channelId: string
  plannedRunAtUtc: string
  status: string
  sentMessageId?: string | null
  errorCode?: string | null
  attemptCount: number
  createdAt: string
  completedAt?: string | null
}

export const scheduledAnnouncementApi = {
  getByGuildId: async (guildId: string): Promise<ScheduledAnnouncementDto[]> => {
    const { data } = await apiClient.get<ScheduledAnnouncementDto[]>(`/api/ScheduledAnnouncement/guild/${guildId}`)
    return data
  },

  getRuns: async (guildId: string): Promise<ScheduledAnnouncementRunDto[]> => {
    const { data } = await apiClient.get<ScheduledAnnouncementRunDto[]>(`/api/ScheduledAnnouncement/guild/${guildId}/runs`)
    return data
  },

  upsert: async (guildId: string, dto: UpsertScheduledAnnouncementDto): Promise<ScheduledAnnouncementDto> => {
    const { data } = await apiClient.post<ScheduledAnnouncementDto>(`/api/ScheduledAnnouncement/guild/${guildId}`, dto)
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/ScheduledAnnouncement/guild/${guildId}/${id}`)
  },
}
