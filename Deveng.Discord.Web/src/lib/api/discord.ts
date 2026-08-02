import { API_BASE_URL } from '@/lib/env'
import { csrfHeadersForMethod } from '@/lib/csrf'

/** BFF: Authorization node proxy + session cookie ile eklenir; client Bearer göndermez. */
const jsonHeaders: HeadersInit = {
  'Content-Type': 'application/json',
}

/** Discord GUILD_CATEGORY (type 4) */
export interface DiscordCategory {
  id: string
  name: string
  position: number
}

export interface DiscordChannel {
  id: string
  name: string
  /** Discord kanal tipi (BFF yanıtında varsa) */
  type?: number
  topic?: string
  position: number
  nsfw: boolean
  parentId?: string
  lastMessage?: {
    id: string
    content: string
    author: {
      id: string
      username: string
      globalName?: string
      nick?: string
      displayName: string
      avatar?: string
      avatarUrl: string
    }
    timestamp: string
    editedTimestamp?: string
  }
}

export interface DiscordVoiceChannel {
  id: string
  name: string
  position: number
  parentId?: string
  type: number
}

export interface DiscordChannelsResponse {
  channels: DiscordChannel[]
  /** Sunucu kategorileri (API v2 yanıtı) */
  categories?: DiscordCategory[]
  /** Sunucu ses kanalları (API v3 yanıtı) */
  voiceChannels?: DiscordVoiceChannel[]
}

export interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
  managed: boolean
  mentionable: boolean
}

export interface DiscordRolesResponse {
  roles: DiscordRole[]
}

export interface DiscordMember {
  id: string
  username: string
  discriminator: string
  globalName?: string
  avatar?: string
  avatarUrl: string
  nick?: string
  roles: DiscordRole[]
  joinedAt?: string
}

export interface GuildMembersResponse {
  members: DiscordMember[]
  roles: DiscordRole[]
}

export interface ProvisionLogChannelsRequest {
  mode: 'auto' | 'existing'
  parentId?: string
}

export interface ProvisionedLogTypeChannelDto {
  logType: string
  channelId: string
  channelName: string
}

export interface ProvisionLogChannelsResponse {
  categoryId: string
  defaultChannelId: string
  logTypes: ProvisionedLogTypeChannelDto[]
}

export const discordApi = {
  // Sunucudaki kanalları getir
  getChannels: async (guildId: string): Promise<DiscordChannelsResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/discord/guilds/${guildId}/channels`, {
      headers: jsonHeaders,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Discord kanalları alınamadı')
    }

    return response.json()
  },

  // Sunucudaki rolleri getir
  getRoles: async (guildId: string): Promise<DiscordRolesResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/discord/guilds/${guildId}/roles`, {
      headers: jsonHeaders,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Discord rolleri alınamadı')
    }

    return response.json()
  },

  // Sunucudaki üyeleri getir (Redis cache'den veya Discord API'den)
  getMembers: async (guildId: string): Promise<GuildMembersResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/discord/guilds/${guildId}/members`, {
      headers: jsonHeaders,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Discord üyeleri alınamadı')
    }

    const data = await response.json()
    return { members: data.members ?? [], roles: data.roles ?? [] }
  },

  /**
   * Yeni kategori (veya seçilen kategori) altında her log türü için metin kanalı + DB kayıtlarını tek seferde oluşturur.
   * Yalnızca sunucuda henüz ana log kaydı yokken (409 aksi hâlde).
   */
  provisionLogChannels: async (
    guildId: string,
    body: ProvisionLogChannelsRequest
  ): Promise<ProvisionLogChannelsResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/discord/guilds/${guildId}/log-channels/provision`,
      {
        method: 'POST',
        headers: { ...jsonHeaders, ...csrfHeadersForMethod('POST') },
        credentials: 'include',
        body: JSON.stringify({
          mode: body.mode,
          parentId: body.parentId,
        }),
      }
    )
    if (!response.ok) {
      let errMsg = 'Hızlı kurulum tamamlanamadı'
      try {
        const j = (await response.json()) as { error?: string; details?: unknown }
        if (typeof j?.error === 'string') errMsg = j.error
      } catch {
        // ignore
      }
      const err = new Error(errMsg) as Error & { status?: number }
      err.status = response.status
      throw err
    }
    return response.json()
  },
}

