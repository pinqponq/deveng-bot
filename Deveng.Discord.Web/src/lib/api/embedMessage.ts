import { apiClient } from './client'
import type {
  EmbedMessageDto,
  CreateEmbedMessageDto,
  UpdateEmbedMessageDto,
} from './types'

export const embedMessageApi = {
  getAllByGuildId: async (guildId: string): Promise<EmbedMessageDto[]> => {
    const { data } = await apiClient.get<EmbedMessageDto[]>(
      `/api/EmbedMessage/guild/${guildId}`
    )
    return data
  },

  getById: async (id: number): Promise<EmbedMessageDto | null> => {
    try {
      const { data } = await apiClient.get<EmbedMessageDto>(
        `/api/EmbedMessage/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getByGuildIdAndName: async (
    guildId: string,
    name: string
  ): Promise<EmbedMessageDto | null> => {
    try {
      const { data } = await apiClient.get<EmbedMessageDto>(
        `/api/EmbedMessage/guild/${guildId}/name/${encodeURIComponent(name)}`
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
    createDto: CreateEmbedMessageDto
  ): Promise<EmbedMessageDto> => {
    const { data } = await apiClient.post<EmbedMessageDto>(
      '/api/EmbedMessage',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdateEmbedMessageDto
  ): Promise<EmbedMessageDto> => {
    const { data } = await apiClient.put<EmbedMessageDto>(
      `/api/EmbedMessage/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/EmbedMessage/guild/${guildId}/${id}`)
  },

  sendToChannel: async (id: number): Promise<{ message: string; id: number }> => {
    const { data } = await apiClient.post<{ message: string; id: number }>(
      `/api/EmbedMessage/${id}/send`,
      undefined,
      { timeout: 15000 }
    )
    return data
  },
}

