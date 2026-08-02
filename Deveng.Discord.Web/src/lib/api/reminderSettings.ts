import { apiClient } from './client'
import type {
  ReminderSettingsDto,
  CreateOrUpdateReminderSettingsDto,
} from './types'

export const reminderSettingsApi = {
  getByGuildId: async (guildId: string): Promise<ReminderSettingsDto | null> => {
    try {
      const { data } = await apiClient.get<ReminderSettingsDto>(
        `/api/ReminderSettings/guild/${guildId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  createOrUpdate: async (
    guildId: string,
    dto: CreateOrUpdateReminderSettingsDto
  ): Promise<ReminderSettingsDto> => {
    const { data } = await apiClient.post<ReminderSettingsDto>(
      `/api/ReminderSettings/guild/${guildId}`,
      dto
    )
    return data
  },
}
