import { apiClient } from './client'
import type {
  ModeratorDto,
  CreateModeratorDto,
  UpdateModeratorDto,
  UpdateModeratorRuleDto,
  AddForbiddenWordDto,
  ForbiddenWordDto,
  ModeratorRuleDto,
} from './types'

export const moderatorApi = {
  getAll: async (): Promise<ModeratorDto[]> => {
    const { data } = await apiClient.get<ModeratorDto[]>('/api/Moderator')
    return data
  },

  getByGuildId: async (guildId: string): Promise<ModeratorDto | null> => {
    try {
      const { data } = await apiClient.get<ModeratorDto>(
        `/api/Moderator/guild/${guildId}`
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
    createDto: CreateModeratorDto
  ): Promise<ModeratorDto> => {
    const { data } = await apiClient.post<ModeratorDto>(
      `/api/Moderator/guild/${guildId}`,
      createDto
    )
    return data
  },

  update: async (
    guildId: string,
    updateDto: UpdateModeratorDto
  ): Promise<ModeratorDto> => {
    const { data } = await apiClient.put<ModeratorDto>(
      `/api/Moderator/guild/${guildId}`,
      updateDto
    )
    return data
  },

  delete: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/Moderator/guild/${guildId}`)
  },

  updateRule: async (
    guildId: string,
    ruleType: string,
    updateDto: UpdateModeratorRuleDto
  ): Promise<ModeratorRuleDto> => {
    const { data } = await apiClient.put<ModeratorRuleDto>(
      `/api/Moderator/guild/${guildId}/rule/${ruleType}`,
      updateDto
    )
    return data
  },

  addForbiddenWord: async (
    guildId: string,
    addDto: AddForbiddenWordDto
  ): Promise<ForbiddenWordDto> => {
    const { data } = await apiClient.post<ForbiddenWordDto>(
      `/api/Moderator/guild/${guildId}/forbidden-word`,
      addDto
    )
    return data
  },

  deleteForbiddenWord: async (guildId: string, wordId: number): Promise<void> => {
    await apiClient.delete(`/api/Moderator/guild/${guildId}/forbidden-word/${wordId}`)
  },

  getForbiddenWords: async (guildId: string): Promise<ForbiddenWordDto[]> => {
    const { data } = await apiClient.get<ForbiddenWordDto[]>(
      `/api/Moderator/guild/${guildId}/forbidden-words`
    )
    return data
  },
}

