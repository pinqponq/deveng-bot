import { apiClient } from './client'
import type {
  BirthdaySettingsDto,
  BirthdayUserDto,
  CreateBirthdaySettingsDto,
  UpdateBirthdaySettingsDto,
  CreateBirthdayUserDto,
  UpdateBirthdayUserDto,
} from './types'

export const birthdayApi = {
  // Settings
  getSettingsByGuildId: async (
    guildId: string
  ): Promise<BirthdaySettingsDto | null> => {
    try {
      const { data } = await apiClient.get<BirthdaySettingsDto>(
        `/api/Birthday/settings/guild/${guildId}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  createOrUpdateSettings: async (
    createDto: CreateBirthdaySettingsDto
  ): Promise<BirthdaySettingsDto> => {
    const { data } = await apiClient.post<BirthdaySettingsDto>(
      '/api/Birthday/settings',
      createDto
    )
    return data
  },

  updateSettings: async (
    guildId: string,
    updateDto: UpdateBirthdaySettingsDto
  ): Promise<BirthdaySettingsDto> => {
    const { data } = await apiClient.put<BirthdaySettingsDto>(
      `/api/Birthday/settings/guild/${guildId}`,
      updateDto
    )
    return data
  },

  deleteSettings: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Birthday/settings/guild/${guildId}`)
  },

  // Users
  getUsersByGuildId: async (
    guildId: string
  ): Promise<BirthdayUserDto[]> => {
    const { data } = await apiClient.get<BirthdayUserDto[]>(
      `/api/Birthday/users/guild/${guildId}`
    )
    return data
  },

  getUsersByDate: async (
    month: number,
    day: number
  ): Promise<BirthdayUserDto[]> => {
    const { data } = await apiClient.get<BirthdayUserDto[]>(
      `/api/Birthday/users/date/${month}/${day}`
    )
    return data
  },

  createOrUpdateUser: async (
    createDto: CreateBirthdayUserDto
  ): Promise<BirthdayUserDto> => {
    const { data } = await apiClient.post<BirthdayUserDto>(
      '/api/Birthday/users',
      createDto
    )
    return data
  },

  updateUser: async (
    guildId: string,
    id: number,
    updateDto: UpdateBirthdayUserDto
  ): Promise<BirthdayUserDto> => {
    const { data } = await apiClient.put<BirthdayUserDto>(
      `/api/Birthday/users/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  deleteUser: async (guildId: string, userId: string): Promise<void> => {
    await apiClient.delete(
      `/api/Birthday/users/guild/${guildId}/user/${userId}`
    )
  },

  getUserById: async (id: number): Promise<BirthdayUserDto | null> => {
    try {
      const { data } = await apiClient.get<BirthdayUserDto>(
        `/api/Birthday/users/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
}
