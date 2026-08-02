import { apiClient } from './client'
import type {
  TicketPanelDto,
  CreateTicketPanelDto,
} from './types'

export const ticketPanelApi = {
  getAll: async (): Promise<TicketPanelDto[]> => {
    const { data } = await apiClient.get<TicketPanelDto[]>('/api/TicketPanel')
    return data
  },

  getByGuildId: async (guildId: string): Promise<TicketPanelDto | null> => {
    try {
      const { data } = await apiClient.get<TicketPanelDto>(
        `/api/TicketPanel/guild/${guildId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (
    createDto: CreateTicketPanelDto
  ): Promise<TicketPanelDto> => {
    const { data } = await apiClient.post<TicketPanelDto>(
      '/api/TicketPanel',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: CreateTicketPanelDto
  ): Promise<TicketPanelDto> => {
    const { data } = await apiClient.put<TicketPanelDto>(
      `/api/TicketPanel/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/TicketPanel/guild/${guildId}`)
  },

  sendToChannel: async (guildId: string): Promise<{ message: string; guildId: string }> => {
    const { data } = await apiClient.post<{ message: string; guildId: string }>(
      `/api/TicketPanel/guild/${guildId}/send`
    )
    return data
  },
}




