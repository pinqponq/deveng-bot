import { apiClient } from './client'

export interface GuildLocaleDto {
  guildId: string
  defaultLocale: string
  fallbackLocale: string
  updatedAt: string
}

export interface UpsertGuildLocaleDto {
  defaultLocale: string
  fallbackLocale: string
}

export const localeApi = {
  get: async (guildId: string): Promise<GuildLocaleDto> => {
    const response = await apiClient.get<GuildLocaleDto>(`/api/Locale/guild/${guildId}`)
    return response.data
  },

  upsert: async (guildId: string, data: UpsertGuildLocaleDto): Promise<GuildLocaleDto> => {
    const response = await apiClient.put<GuildLocaleDto>(`/api/Locale/guild/${guildId}`, data)
    return response.data
  },
}
