import { apiClient } from './client'
import type {
  CreateGuildAutomationDto,
  GuildAutomationDto,
  UpdateGuildAutomationDto,
} from './types'

export const automationApi = {
  getByGuildId: async (guildId: string): Promise<GuildAutomationDto[]> => {
    const { data } = await apiClient.get<GuildAutomationDto[]>(
      `/api/Automation/guild/${guildId}`
    )
    return data
  },

  getById: async (guildId: string, id: number): Promise<GuildAutomationDto | null> => {
    try {
      const { data } = await apiClient.get<GuildAutomationDto>(
        `/api/Automation/guild/${guildId}/${id}`
      )
      return data
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw error
    }
  },

  create: async (
    guildId: string,
    dto: CreateGuildAutomationDto
  ): Promise<GuildAutomationDto> => {
    const { data } = await apiClient.post<GuildAutomationDto>(
      `/api/Automation/guild/${guildId}`,
      dto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    dto: UpdateGuildAutomationDto
  ): Promise<GuildAutomationDto> => {
    const { data } = await apiClient.put<GuildAutomationDto>(
      `/api/Automation/guild/${guildId}/${id}`,
      dto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/Automation/guild/${guildId}/${id}`)
  },
}
