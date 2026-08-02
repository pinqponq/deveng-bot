import { apiClient } from './client'

export interface GuildReportJobDto {
  id: number
  guildId: string
  createdByUserId?: string | null
  reportRange: string
  status: string
  summaryJson?: string | null
  fileRef?: string | null
  error?: string | null
  createdAt: string
  completedAt?: string | null
  expiresAt?: string | null
  emailTo?: string | null
  emailSentAt?: string | null
  emailStatus?: string | null
  emailError?: string | null
}

export interface GuildReportNotifyDto {
  guildId: string
  notifyEmail?: string | null
  sendOnComplete: boolean
  updatedAt?: string | null
}

export interface UpsertGuildReportNotifyDto {
  notifyEmail?: string | null
  sendOnComplete: boolean
}

export interface GuildReportEmailSendResultDto {
  outcome: string
  detail?: string | null
}

export const guildReportApi = {
  getByGuildId: async (guildId: string): Promise<GuildReportJobDto[]> => {
    const { data } = await apiClient.get<GuildReportJobDto[]>(`/api/GuildReport/guild/${guildId}`)
    return data
  },

  getNotify: async (guildId: string): Promise<GuildReportNotifyDto> => {
    const { data } = await apiClient.get<GuildReportNotifyDto>(`/api/GuildReport/guild/${guildId}/notify`)
    return data
  },

  upsertNotify: async (guildId: string, body: UpsertGuildReportNotifyDto): Promise<GuildReportNotifyDto> => {
    const { data } = await apiClient.put<GuildReportNotifyDto>(`/api/GuildReport/guild/${guildId}/notify`, body)
    return data
  },

  create: async (guildId: string, reportRange: string): Promise<GuildReportJobDto> => {
    const { data } = await apiClient.post<GuildReportJobDto>(`/api/GuildReport/guild/${guildId}`, { reportRange })
    return data
  },

  resendEmail: async (guildId: string, jobId: number): Promise<GuildReportEmailSendResultDto> => {
    const { data } = await apiClient.post<GuildReportEmailSendResultDto>(
      `/api/GuildReport/guild/${guildId}/job/${jobId}/email`
    )
    return data
  },
}
