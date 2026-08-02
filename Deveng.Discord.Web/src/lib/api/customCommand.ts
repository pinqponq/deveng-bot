import { apiClient } from './client'
import type {
  CustomCommandDto,
  CreateCustomCommandDto,
  UpdateCustomCommandDto,
} from './types'

export const customCommandApi = {
  getByGuildId: async (guildId: string): Promise<CustomCommandDto[]> => {
    const { data } = await apiClient.get<CustomCommandDto[]>(
      `/api/CustomCommand/guild/${guildId}`
    )
    return data
  },

  getByName: async (
    guildId: string,
    commandName: string
  ): Promise<CustomCommandDto | null> => {
    try {
      const { data } = await apiClient.get<CustomCommandDto>(
        `/api/CustomCommand/guild/${guildId}/command/${commandName}`
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
    createDto: CreateCustomCommandDto
  ): Promise<CustomCommandDto> => {
    const { data } = await apiClient.post<CustomCommandDto>(
      `/api/CustomCommand/guild/${guildId}`,
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdateCustomCommandDto
  ): Promise<CustomCommandDto> => {
    const { data } = await apiClient.put<CustomCommandDto>(
      `/api/CustomCommand/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/CustomCommand/guild/${guildId}/${id}`)
  },
}

