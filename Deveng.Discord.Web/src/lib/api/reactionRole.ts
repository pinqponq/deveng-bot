import { apiClient } from './client'
import type {
  ReactionRoleDto,
  CreateReactionRoleDto,
} from './types'

export const reactionRoleApi = {
  getAll: async (): Promise<ReactionRoleDto[]> => {
    const { data } = await apiClient.get<ReactionRoleDto[]>('/api/ReactionRole')
    return data
  },

  /** Guild’deki tüm tepki rol panelleri */
  listByGuildId: async (guildId: string): Promise<ReactionRoleDto[]> => {
    const { data } = await apiClient.get<ReactionRoleDto[]>(
      `/api/ReactionRole/guild/${guildId}`
    )
    return data ?? []
  },

  create: async (
    createDto: CreateReactionRoleDto
  ): Promise<ReactionRoleDto> => {
    const { data } = await apiClient.post<ReactionRoleDto>(
      '/api/ReactionRole',
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    id: number,
    updateDto: CreateReactionRoleDto
  ): Promise<ReactionRoleDto> => {
    const { data } = await apiClient.put<ReactionRoleDto>(
      `/api/ReactionRole/guild/${guildId}/${id}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/ReactionRole/guild/${guildId}/${id}`)
  },

  sendToChannel: async (
    guildId: string,
    id: number
  ): Promise<{ message: string; guildId: string; id?: number }> => {
    const { data } = await apiClient.post<{ message: string; guildId: string; id?: number }>(
      `/api/ReactionRole/guild/${guildId}/${id}/send`
    )
    return data
  },

  /** Kanaldaki gönderilmiş mesajı siler; sunucudaki MessageId temizlenir */
  removeSentMessage: async (
    guildId: string,
    id: number
  ): Promise<{ message: string; guildId: string; id?: number }> => {
    const { data } = await apiClient.post<{ message: string; guildId: string; id?: number }>(
      `/api/ReactionRole/guild/${guildId}/${id}/remove-sent-message`
    )
    return data
  },
}
