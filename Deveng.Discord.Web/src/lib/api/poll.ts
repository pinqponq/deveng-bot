import { apiClient } from './client'
import type {
  PollDto,
  CreatePollDto,
  UpdatePollDto,
  PollResultDto,
} from './types'

export type PollSendToChannelResponse = {
  message: string
  id: number
  response?: string
  cooldownSeconds?: number
}

export const pollApi = {
  getAllByGuildId: async (
    guildId: string,
    params?: { offset?: number; limit?: number },
  ): Promise<PollDto[]> => {
    const { data } = await apiClient.get<PollDto[]>(
      `/api/Poll/guild/${guildId}`,
      { params },
    )
    return data
  },

  getById: async (id: number): Promise<PollDto | null> => {
    try {
      const { data } = await apiClient.get<PollDto>(
        `/api/Poll/${id}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getActiveByChannelId: async (channelId: string): Promise<PollDto | null> => {
    try {
      const { data } = await apiClient.get<PollDto>(
        `/api/Poll/channel/${channelId}/active`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (createDto: CreatePollDto): Promise<PollDto> => {
    const { data } = await apiClient.post<PollDto>(
      '/api/Poll',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: UpdatePollDto
  ): Promise<PollDto> => {
    const { data } = await apiClient.put<PollDto>(
      `/api/Poll/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/Poll/guild/${guildId}/${id}`)
  },

  sendToChannel: async (id: number): Promise<PollSendToChannelResponse> => {
    const { data } = await apiClient.post<PollSendToChannelResponse>(
      `/api/Poll/${id}/send`
    )
    return data
  },

  endPoll: async (guildId: string, id: number): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(
      `/api/Poll/guild/${guildId}/${id}/end`
    )
    return data
  },

  getResult: async (id: number): Promise<PollResultDto> => {
    const { data } = await apiClient.get<PollResultDto>(
      `/api/Poll/${id}/result`
    )
    return data
  },

  sendResult: async (id: number): Promise<{ message: string; id: number }> => {
    const { data } = await apiClient.post<{ message: string; id: number }>(
      `/api/Poll/${id}/send-result`
    )
    return data
  },
}

