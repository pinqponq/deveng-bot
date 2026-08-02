import { apiClient } from './client'

export interface PanelAuditLogDto {
  id: number
  guildId: string
  actorType: string
  actorUserId?: string | null
  actorUsernameSnapshot?: string | null
  actorAvatarSnapshot?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  beforeJson?: string | null
  afterJson?: string | null
  changedFieldsJson?: string | null
  result: string
  errorCode?: string | null
  createdAtUtc: string
}

export interface PanelAuditLogQueryDto {
  action?: string
  resourceType?: string
  actorUserId?: string
  from?: string
  to?: string
  limit?: number
}

export const panelAuditLogApi = {
  query: async (guildId: string, query: PanelAuditLogQueryDto): Promise<PanelAuditLogDto[]> => {
    const { data } = await apiClient.get<PanelAuditLogDto[]>(`/api/PanelAuditLog/guild/${guildId}`, { params: query })
    return data
  },
}
