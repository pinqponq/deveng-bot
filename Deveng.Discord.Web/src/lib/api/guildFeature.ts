import { apiClient } from './client'

export interface GuildFeatureStatus {
  featureName: string
  isEnabled: boolean
}

export interface GuildFeature {
  id: number
  guildId: string
  featureName: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export const guildFeatureApi = {
  // Tüm özellikleri getir
  getAll: async (guildId: string): Promise<GuildFeatureStatus[]> => {
    const response = await apiClient.get<GuildFeatureStatus[]>(
      `/api/GuildFeature/guild/${guildId}`
    )
    return response.data
  },

  // Belirli bir özelliği getir
  get: async (guildId: string, featureName: string): Promise<GuildFeature> => {
    const response = await apiClient.get<GuildFeature>(
      `/api/GuildFeature/guild/${guildId}/feature/${featureName}`
    )
    return response.data
  },

  // Özelliği etkinleştir
  enable: async (guildId: string, featureName: string): Promise<GuildFeature> => {
    const response = await apiClient.post<GuildFeature>(
      `/api/GuildFeature/guild/${guildId}/feature/${featureName}/enable`
    )
    return response.data
  },

  // Özelliği devre dışı bırak
  disable: async (guildId: string, featureName: string): Promise<GuildFeature> => {
    const response = await apiClient.post<GuildFeature>(
      `/api/GuildFeature/guild/${guildId}/feature/${featureName}/disable`
    )
    return response.data
  },

  // Aktif özellikleri getir
  getEnabled: async (guildId: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(
      `/api/GuildFeature/guild/${guildId}/enabled`
    )
    return response.data
  },

  // Özellik durumunu kontrol et
  isEnabled: async (guildId: string, featureName: string): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ isEnabled: boolean }>(
        `/api/GuildFeature/guild/${guildId}/feature/${featureName}/status`
      )
      return response.data.isEnabled
    } catch (error) {
      // 404 hatası özellik kapalı demektir
      return false
    }
  },

  reloadCommands: async (guildId: string): Promise<void> => {
    await apiClient.post(`/api/Bot/reload-commands/${guildId}`)
  },
}
