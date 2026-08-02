import { apiClient } from './client'
import type {
  LevelDto,
  CreateLevelDto,
  UpdateLevelDto,
  UserLevelDto,
} from './types'

export const levelApi = {
  getByGuildId: async (guildId: string): Promise<LevelDto | null> => {
    try {
      const { data } = await apiClient.get<LevelDto>(
        `/api/Level/guild/${guildId}`
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
    createDto: CreateLevelDto
  ): Promise<LevelDto> => {
    const { data } = await apiClient.post<LevelDto>(
      `/api/Level/guild/${guildId}`,
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: UpdateLevelDto
  ): Promise<LevelDto> => {
    const { data } = await apiClient.put<LevelDto>(
      `/api/Level/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Level/guild/${guildId}`)
  },

  getUserLevel: async (
    guildId: string,
    userId: string
  ): Promise<UserLevelDto | null> => {
    try {
      const { data } = await apiClient.get<UserLevelDto>(
        `/api/Level/guild/${guildId}/user/${userId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getUserLevels: async (
    guildId: string,
    limit?: number
  ): Promise<UserLevelDto[]> => {
    const { data } = await apiClient.get<UserLevelDto[]>(
      `/api/Level/guild/${guildId}/users`,
      { params: { limit } }
    )
    return data
  },

  getLeaderboard: async (
    guildId: string,
    limit: number = 10
  ): Promise<UserLevelDto[]> => {
    const { data } = await apiClient.get<UserLevelDto[]>(
      `/api/Level/guild/${guildId}/leaderboard`,
      { params: { limit } }
    )
    return data
  },
}
