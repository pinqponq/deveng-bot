import { apiClient } from './client'
import type {
  CustomBotDto,
  CreateCustomBotDto,
  UpdateCustomBotDto,
  UpdateCustomBotPersonalizationDto,
  ApplyPersonalizationResult,
} from './types'

export const customBotApi = {
  getAll: async (): Promise<CustomBotDto[]> => {
    const { data } = await apiClient.get<CustomBotDto[]>('/api/CustomBot')
    return data
  },

  getActive: async (): Promise<CustomBotDto[]> => {
    const { data } = await apiClient.get<CustomBotDto[]>('/api/CustomBot/active')
    return data
  },

  getById: async (id: number): Promise<CustomBotDto | null> => {
    try {
      const { data } = await apiClient.get<CustomBotDto>(
        `/api/CustomBot/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getByClientId: async (clientId: string): Promise<CustomBotDto | null> => {
    try {
      const { data } = await apiClient.get<CustomBotDto>(
        `/api/CustomBot/client/${clientId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getByOwnerId: async (ownerId: string): Promise<CustomBotDto[]> => {
    const { data } = await apiClient.get<CustomBotDto[]>(
      `/api/CustomBot/owner/${ownerId}`
    )
    return data
  },

  create: async (createDto: CreateCustomBotDto): Promise<CustomBotDto> => {
    const { data } = await apiClient.post<CustomBotDto>(
      '/api/CustomBot',
      createDto
    )
    return data
  },

  update: async (
    id: number,
    updateDto: UpdateCustomBotDto
  ): Promise<CustomBotDto> => {
    const { data } = await apiClient.put<CustomBotDto>(
      `/api/CustomBot/${id}`,
      updateDto
    )
    return data
  },

  updatePersonalization: async (
    id: number,
    updateDto: UpdateCustomBotPersonalizationDto
  ): Promise<CustomBotDto> => {
    const { data } = await apiClient.put<CustomBotDto>(
      `/api/CustomBot/${id}/personalization`,
      updateDto
    )
    return data
  },

  applyProfile: async (id: number): Promise<ApplyPersonalizationResult> => {
    const { data } = await apiClient.post<ApplyPersonalizationResult>(
      `/api/Bot/custom-bot/apply-profile/${id}`
    )
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/CustomBot/${id}`)
  },

  start: async (id: number, botToken: string, clientId: string, ownerId: string, botName?: string): Promise<void> => {
    await apiClient.post(`/api/Bot/custom-bot/start/${id}`, {
      botToken,
      clientId,
      ownerId,
      botName,
    })
  },

  stop: async (id: number): Promise<void> => {
    await apiClient.post(`/api/Bot/custom-bot/stop/${id}`)
  },

  getStatus: async (id: number): Promise<{
    success: boolean
    id: number
    clientId: string
    ownerId: string
    botName?: string
    status: string
    errorMessage?: string
    isReady: boolean
  }> => {
    const { data } = await apiClient.get(`/api/Bot/custom-bot/status/${id}`)
    return data as {
      success: boolean
      id: number
      clientId: string
      ownerId: string
      botName?: string
      status: string
      errorMessage?: string
      isReady: boolean
    }
  },
}
