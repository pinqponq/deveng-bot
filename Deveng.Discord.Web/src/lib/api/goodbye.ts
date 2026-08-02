import { apiClient } from './client'
import type {
  GoodbyeDto,
  CreateGoodbyeDto,
  UpdateGoodbyeDto,
} from './types'

export const goodbyeApi = {
  getAll: async (): Promise<GoodbyeDto[]> => {
    const { data } = await apiClient.get<GoodbyeDto[]>('/api/Goodbye')
    return data
  },

  getByGuildId: async (
    guildId: string,
    language: string = 'tr'
  ): Promise<GoodbyeDto | null> => {
    try {
      const { data } = await apiClient.get<GoodbyeDto>(
        `/api/Goodbye/guild/${guildId}`,
        { params: { language } }
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreateGoodbyeDto): Promise<GoodbyeDto> => {
    const { data } = await apiClient.post<GoodbyeDto>(
      '/api/Goodbye',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: UpdateGoodbyeDto
  ): Promise<GoodbyeDto> => {
    const { data } = await apiClient.put<GoodbyeDto>(
      `/api/Goodbye/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Goodbye/guild/${guildId}`)
  },
}

