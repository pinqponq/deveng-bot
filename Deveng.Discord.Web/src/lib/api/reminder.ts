import { apiClient } from './client'
import type {
  ReminderDto,
  CreateReminderDto,
  UpdateReminderDto,
} from './types'

export const reminderApi = {
  getAllByGuildId: async (guildId: string): Promise<ReminderDto[]> => {
    const { data } = await apiClient.get<ReminderDto[]>(
      `/api/Reminder/guild/${guildId}`
    )
    return data
  },

  getByUserId: async (guildId: string, userId: string): Promise<ReminderDto[]> => {
    const { data } = await apiClient.get<ReminderDto[]>(
      `/api/Reminder/guild/${guildId}/user/${userId}`
    )
    return data
  },

  getPending: async (): Promise<ReminderDto[]> => {
    const { data } = await apiClient.get<ReminderDto[]>(
      '/api/Reminder/pending'
    )
    return data
  },

  getById: async (id: number): Promise<ReminderDto | null> => {
    try {
      const { data } = await apiClient.get<ReminderDto>(
        `/api/Reminder/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreateReminderDto): Promise<ReminderDto> => {
    const { data } = await apiClient.post<ReminderDto>(
      '/api/Reminder',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdateReminderDto
  ): Promise<ReminderDto> => {
    const { data } = await apiClient.put<ReminderDto>(
      `/api/Reminder/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/Reminder/guild/${guildId}/${id}`)
  },

  markAsSent: async (guildId: string, id: number): Promise<void> => {
    await apiClient.post(`/api/Reminder/guild/${guildId}/${id}/mark-sent`)
  },
}
