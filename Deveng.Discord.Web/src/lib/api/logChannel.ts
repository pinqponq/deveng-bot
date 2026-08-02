import { apiClient } from './client'

export interface LogChannelDto {
  id: number
  guildId: string
  channelId: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
  isEmbed: boolean
  embedTitle?: string | null
  embedDescription?: string | null
  embedColor?: string | null
  embedThumbnail?: string | null
  embedImage?: string | null
  embedFooter?: string | null
}

export interface LogChannelTypeDto {
  id: number
  logChannelId: number
  logType: string
  channelId?: string | null // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)
  enabled: boolean
  // Embed Ayarları (Her log türü için ayrı)
  isEmbed: boolean
  embedTitle?: string | null
  embedDescription?: string | null
  embedColor?: string | null
  embedThumbnail?: string | null
  embedImage?: string | null
  embedFooter?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface LogChannelEmbedSettingsDto {
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
}

export interface CreateLogChannelDto {
  guildId: string
  channelId?: string // Opsiyonel - boş string gönderilebilir
  enabled?: boolean
  embedSettings?: LogChannelEmbedSettingsDto
}

export interface UpdateLogChannelDto {
  channelId?: string
  enabled?: boolean
  embedSettings?: LogChannelEmbedSettingsDto
}

export interface CreateLogChannelTypeDto {
  guildId: string
  logType: string
  channelId?: string | null // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)
  enabled?: boolean
  embedSettings?: LogChannelEmbedSettingsDto
}

export interface UpdateLogChannelTypeDto {
  channelId?: string | null
  enabled?: boolean
  embedSettings?: LogChannelEmbedSettingsDto
}

export const logChannelApi = {
  getAll: () => apiClient.get<LogChannelDto[]>('/api/LogChannel'),
  
  getByGuildId: (guildId: string) =>
    apiClient.get<LogChannelDto>(`/api/LogChannel/guild/${guildId}`),
  
  getTypesByGuildId: (guildId: string) =>
    apiClient.get<LogChannelTypeDto[]>(`/api/LogChannel/guild/${guildId}/types`),
  
  getTypeByGuildIdAndType: (guildId: string, logType: string) =>
    apiClient.get<LogChannelTypeDto>(`/api/LogChannel/guild/${guildId}/types/${logType}`),
  
  create: (data: CreateLogChannelDto) =>
    apiClient.post<LogChannelDto>('/api/LogChannel', data),
  
  update: (guildId: string, data: UpdateLogChannelDto) =>
    apiClient.put<LogChannelDto>(`/api/LogChannel/guild/${guildId}`, data),
  
  delete: (guildId: string) =>
    apiClient.delete(`/api/LogChannel/guild/${guildId}`),
  
  createType: (data: CreateLogChannelTypeDto) =>
    apiClient.post<LogChannelTypeDto>('/api/LogChannel/types', data),
  
  updateType: (guildId: string, logType: string, data: UpdateLogChannelTypeDto) =>
    apiClient.put<LogChannelTypeDto>(`/api/LogChannel/guild/${guildId}/types/${logType}`, data),
  
  deleteType: (guildId: string, logType: string) =>
    apiClient.delete(`/api/LogChannel/guild/${guildId}/types/${logType}`),
}
