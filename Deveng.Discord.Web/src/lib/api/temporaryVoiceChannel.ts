import { apiClient } from './client'
import type {
  TemporaryVoiceChannelLobbyDto,
  CreateTemporaryVoiceChannelLobbyDto,
} from './types'

export const temporaryVoiceChannelApi = {
  getAll: async (): Promise<TemporaryVoiceChannelLobbyDto[]> => {
    const { data } = await apiClient.get<TemporaryVoiceChannelLobbyDto[]>('/api/TemporaryVoiceChannel')
    return data
  },

  getById: async (id: number): Promise<TemporaryVoiceChannelLobbyDto | null> => {
    try {
      const { data } = await apiClient.get<TemporaryVoiceChannelLobbyDto>(
        `/api/TemporaryVoiceChannel/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getByGuildId: async (guildId: string): Promise<TemporaryVoiceChannelLobbyDto[]> => {
    const { data } = await apiClient.get<TemporaryVoiceChannelLobbyDto[]>(
      `/api/TemporaryVoiceChannel/guild/${guildId}`
    )
    return data
  },

  create: async (
    createDto: CreateTemporaryVoiceChannelLobbyDto
  ): Promise<TemporaryVoiceChannelLobbyDto> => {
    const { data } = await apiClient.post<TemporaryVoiceChannelLobbyDto>(
      '/api/TemporaryVoiceChannel',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: CreateTemporaryVoiceChannelLobbyDto
  ): Promise<TemporaryVoiceChannelLobbyDto> => {
    const { data } = await apiClient.put<TemporaryVoiceChannelLobbyDto>(
      `/api/TemporaryVoiceChannel/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/TemporaryVoiceChannel/guild/${guildId}/${id}`)
  },
}

