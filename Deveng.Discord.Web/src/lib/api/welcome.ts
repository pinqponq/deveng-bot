import { apiClient } from './client'
import type {
  WelcomeDto,
  CreateWelcomeDto,
  UpdateWelcomeDto,
} from './types'

export const welcomeApi = {
  getAll: async (): Promise<WelcomeDto[]> => {
    const { data } = await apiClient.get<WelcomeDto[]>('/api/Welcome')
    return data
  },

  getByGuildId: async (
    guildId: string,
    language: string = 'tr'
  ): Promise<WelcomeDto | null> => {
    try {
      const { data } = await apiClient.get<WelcomeDto>(
        `/api/Welcome/guild/${guildId}`,
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

  create: async (createDto: CreateWelcomeDto): Promise<WelcomeDto> => {
    const { data } = await apiClient.post<WelcomeDto>(
      '/api/Welcome',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: UpdateWelcomeDto
  ): Promise<WelcomeDto> => {
    const { data } = await apiClient.put<WelcomeDto>(
      `/api/Welcome/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Welcome/guild/${guildId}`)
  },
}

