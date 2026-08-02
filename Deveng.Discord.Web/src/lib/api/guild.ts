import { apiClient } from './client'
import type {
  GuildDto,
  CreateGuildDto,
  UpdateGuildDto,
} from './types'

export const guildApi = {
  getAll: async (): Promise<GuildDto[]> => {
    const { data } = await apiClient.get<GuildDto[]>('/api/Guild')
    return data
  },

  getByGuildId: async (guildId: string): Promise<GuildDto | null> => {
    try {
      const { data } = await apiClient.get<GuildDto>(
        `/api/Guild/guild/${guildId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreateGuildDto): Promise<GuildDto> => {
    const { data } = await apiClient.post<GuildDto>(
      '/api/Guild',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: UpdateGuildDto
  ): Promise<GuildDto> => {
    const { data } = await apiClient.put<GuildDto>(
      `/api/Guild/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Guild/guild/${guildId}`)
  },
}

