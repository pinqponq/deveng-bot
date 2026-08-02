import { apiClient } from './client'
import type {
  GiveawayDto,
  CreateGiveawayDto,
  UpdateGiveawayDto,
} from './types'

export const giveawayApi = {
  getAllByGuildId: async (guildId: string): Promise<GiveawayDto[]> => {
    const { data } = await apiClient.get<GiveawayDto[]>(
      `/api/Giveaway/guild/${guildId}`
    )
    return data
  },

  getActive: async (guildId: string): Promise<GiveawayDto[]> => {
    const { data } = await apiClient.get<GiveawayDto[]>(
      `/api/Giveaway/active`,
      { params: { guildId } }
    )
    return data
  },

  getById: async (id: number): Promise<GiveawayDto | null> => {
    try {
      const { data } = await apiClient.get<GiveawayDto>(
        `/api/Giveaway/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreateGiveawayDto): Promise<GiveawayDto> => {
    const { data } = await apiClient.post<GiveawayDto>(
      '/api/Giveaway',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdateGiveawayDto
  ): Promise<GiveawayDto> => {
    const { data } = await apiClient.put<GiveawayDto>(
      `/api/Giveaway/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/Giveaway/guild/${guildId}/${id}`)
  },

  sendToChannel: async (id: number): Promise<{ message: string; id: number }> => {
    const { data } = await apiClient.post<{ message: string; id: number }>(
      `/api/Giveaway/${id}/send`
    )
    return data
  },

  endGiveaway: async (guildId: string, id: number): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(
      `/api/Giveaway/guild/${guildId}/${id}/end`
    )
    return data
  },
}
