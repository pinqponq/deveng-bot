import { apiClient } from './client'

export interface AutoRoleRoleDto {
  roleId: string
  sortOrder: number
  enabled: boolean
}

export interface AutoRoleDto {
  guildId: string
  enabled: boolean
  delaySeconds: number
  minAccountAgeDays?: number | null
  roles: AutoRoleRoleDto[]
  createdAt: string
  updatedAt: string
}

export interface UpsertAutoRoleDto {
  enabled: boolean
  delaySeconds: number
  minAccountAgeDays?: number | null
  roles: AutoRoleRoleDto[]
}

export interface AutoRoleAuditLogDto {
  id: number
  guildId: string
  userIdHash: string
  roleId: string
  result: string
  errorCode?: string | null
  createdAt: string
}

export const autoRoleApi = {
  get: async (guildId: string): Promise<AutoRoleDto | null> => {
    try {
      const { data } = await apiClient.get<AutoRoleDto>(`/api/AutoRole/guild/${guildId}`)
      return data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  upsert: async (guildId: string, dto: UpsertAutoRoleDto): Promise<AutoRoleDto> => {
    const { data } = await apiClient.put<AutoRoleDto>(`/api/AutoRole/guild/${guildId}`, dto)
    return data
  },

  getAudit: async (guildId: string): Promise<AutoRoleAuditLogDto[]> => {
    const { data } = await apiClient.get<AutoRoleAuditLogDto[]>(`/api/AutoRole/guild/${guildId}/audit`)
    return data
  },
}
