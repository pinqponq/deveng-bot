import { apiClient } from './client'
import type {
  StatisticsChannelDto,
  CreateStatisticsChannelDto,
  UpdateStatisticsChannelDto,
} from './types'

export const statisticsChannelApi = {
  getAll: async (): Promise<StatisticsChannelDto[]> => {
    const { data } = await apiClient.get<StatisticsChannelDto[]>('/api/StatisticsChannel')
    return data
  },

  getByGuildId: async (guildId: string): Promise<StatisticsChannelDto[]> => {
    if (!guildId || guildId.trim() === '') {
      throw new Error('GuildId is required')
    }
    const { data } = await apiClient.get<StatisticsChannelDto[]>(
      `/api/StatisticsChannel/guild/${guildId}`
    )
    return data
  },

  getByGuildIdAndType: async (
    guildId: string,
    counterType: string
  ): Promise<StatisticsChannelDto | null> => {
    try {
      const { data } = await apiClient.get<StatisticsChannelDto>(
        `/api/StatisticsChannel/guild/${guildId}/type/${encodeURIComponent(counterType)}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getById: async (id: number): Promise<StatisticsChannelDto | null> => {
    try {
      const { data } = await apiClient.get<StatisticsChannelDto>(
        `/api/StatisticsChannel/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreateStatisticsChannelDto): Promise<StatisticsChannelDto> => {
    const { data } = await apiClient.post<StatisticsChannelDto>(
      '/api/StatisticsChannel',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdateStatisticsChannelDto
  ): Promise<StatisticsChannelDto> => {
    const { data } = await apiClient.put<StatisticsChannelDto>(
      `/api/StatisticsChannel/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    if (!guildId || guildId.trim() === '') {
      throw new Error('GuildId is required')
    }
    const res = await apiClient.delete(`/api/StatisticsChannel/guild/${guildId}/${id}`, {
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 404,
    })
    if (res.status === 404) return
    if (res.status < 200 || res.status >= 300) {
      const data = res.data as { message?: string } | string | undefined
      const msg =
        typeof data === 'object' && data?.message
          ? data.message
          : typeof data === 'string' && data
            ? data
            : `HTTP ${res.status}`
      throw new Error(msg || 'Silinemedi')
    }
  },
}




