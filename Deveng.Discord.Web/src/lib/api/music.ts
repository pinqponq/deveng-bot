import { apiClient } from './client'

export interface MusicRequester {
  id: string
  username?: string
}

export interface MusicTrack {
  id: string
  encodedTrack?: string
  title: string
  author?: string
  durationMs?: number
  isStream?: boolean
  uri?: string
  source: string
  thumbnailUrl?: string
  externalProvider?: string
  spotifyTrackId?: string
  spotifyUrl?: string
  popularity?: number
  genres?: string[]
  releaseDate?: string
  requester?: MusicRequester
  confidence?: number
}

export interface MusicQueueItem extends MusicTrack {
  queueItemId: string
  position: number
  addedAt: string
}

export interface MusicState {
  guildId: string
  status: string
  voiceChannelId?: string
  textChannelId?: string
  nowPlaying?: MusicQueueItem
  queue: MusicQueueItem[]
  volume: number
  loopMode: string
  paused: boolean
  positionMs: number
  autoplay: boolean
  updatedAt: string
  errorMessage?: string
}

export interface MusicSettings {
  guildId: string
  enabled: boolean
  defaultVolume: number
  maxQueueSize: number
  djRoleId?: string
  requireDjRole: boolean
  setupCompleted: boolean
  allowEveryoneToPlay: boolean
  allowedTextChannelId?: string
  autoLeaveSeconds: number
  announceNowPlaying: boolean
  autoplay: boolean
  preventDuplicates: boolean
  djOnly: boolean
  djPlaylists: boolean
  maxUserSongs: number
  playlistLimit: number
  playlistTrackLimit: number
  favoriteLimit: number
  importTrackLimit: number
  radioEnabled: boolean
  /** Spotify Client ID/Secret sunucuda tanımlı mı */
  spotifyConfigured?: boolean
}

export interface SpotifyLinkStatus {
  appConfigured: boolean
  connected: boolean
  isPremium: boolean
  premiumRequired: boolean
  spotifyUserId?: string
  displayName?: string
  product?: string
  connectedAt?: string
  warning?: string
  guildId?: string
  returnPath?: string
}

export interface SpotifyConnectUrl {
  authorizeUrl: string
  state: string
}

export interface SpotifyRemotePlaylist {
  id: string
  name: string
  description?: string
  coverUrl?: string
  externalUrl?: string
  trackCount?: number
  collaborative?: boolean
  ownsPlaylist?: boolean
}

export interface MusicPlaylistPreview {
  provider: string
  url: string
  name: string
  description?: string
  coverUrl?: string
  trackCount?: number
}

export interface MusicLyricsResponse {
  track?: MusicTrack
  lyrics?: string
  source?: string
  provider?: string
}

export interface MusicHistoryItem extends MusicTrack {
  historyId: number
  playedAt: string
  guildId: string
  userId?: string
  requesterUsername?: string
  voiceChannelId?: string
  textChannelId?: string
}

export interface MusicFavoriteResponse {
  liked: boolean
  tracks: MusicTrack[]
}

export interface MusicPlaylist {
  id: number
  guildId?: string
  ownerUserId?: string
  name: string
  scope: string
  description?: string
  coverUrl?: string
  externalProvider?: string
  externalPlaylistId?: string
  externalUrl?: string
  totalTracks: number
  importedTracks: number
  failedTracks: number
  lastImportStatus?: string
  lastImportError?: string
  lastImportedAt?: string
  tracks?: MusicTrack[]
}

export interface MusicImportJob {
  id: number
  guildId: string
  userId?: string
  playlistId?: number
  provider: string
  sourceUrl: string
  status: string
  totalTracks: number
  processedTracks: number
  importedTracks: number
  failedTracks: number
  errorMessage?: string
  startedAt: string
  completedAt?: string
}

export interface MusicRadioStation {
  id: number
  name: string
  streamUrl: string
  country?: string
  genre?: string
  imageUrl?: string
}

export const musicApi = {
  getSettings: async (guildId: string): Promise<MusicSettings> => {
    const { data } = await apiClient.get<MusicSettings>(`/api/Music/guild/${guildId}/settings`)
    return data
  },

  updateSettings: async (guildId: string, settings: Partial<MusicSettings>): Promise<MusicSettings> => {
    const { data } = await apiClient.put<MusicSettings>(`/api/Music/guild/${guildId}/settings`, settings)
    return data
  },

  getState: async (guildId: string): Promise<MusicState> => {
    const { data } = await apiClient.get<MusicState>(`/api/Music/guild/${guildId}/state`)
    return data
  },

  search: async (guildId: string, query: string, source = 'auto'): Promise<MusicTrack[]> => {
    const { data } = await apiClient.get<{ tracks: MusicTrack[] }>(`/api/Music/guild/${guildId}/search`, {
      params: { query, source },
    })
    return data.tracks
  },

  play: async (
    guildId: string,
    query: string,
    options?: {
      source?: string
      playNext?: boolean
      track?: MusicTrack
      voiceChannelId?: string
      textChannelId?: string
      requester?: MusicRequester
    }
  ): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/play`, {
      query,
      source: options?.source ?? 'auto',
      playNext: options?.playNext ?? false,
      track: options?.track,
      voiceChannelId: options?.voiceChannelId,
      textChannelId: options?.textChannelId,
      requester: options?.requester,
    })
    return data
  },

  bulkPlay: async (
    guildId: string,
    body: {
      mode: 'start' | 'shuffle-start' | 'enqueue' | 'play-next'
      tracks: MusicTrack[]
      requester?: MusicRequester
      textChannelId?: string
    }
  ): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/play/bulk`, body)
    return data
  },

  control: async (
    guildId: string,
    action: string,
    payload?: { volume?: number; seekMs?: number; deltaMs?: number; position?: number }
  ): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/control`, {
      action,
      ...payload,
    })
    return data
  },

  removeQueueItem: async (guildId: string, queueItemId: string): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/queue`, {
      operation: 'remove',
      queueItemId,
    })
    return data
  },

  moveQueueItem: async (guildId: string, queueItemId: string, position: number): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/queue`, {
      operation: 'move',
      queueItemId,
      position,
    })
    return data
  },

  queueOperation: async (guildId: string, operation: string): Promise<MusicState> => {
    const { data } = await apiClient.post<MusicState>(`/api/Music/guild/${guildId}/queue`, {
      operation,
    })
    return data
  },

  getLyrics: async (guildId: string, query?: string): Promise<MusicLyricsResponse> => {
    const { data } = await apiClient.get<MusicLyricsResponse>(`/api/Music/guild/${guildId}/lyrics`, {
      params: query ? { query } : undefined,
    })
    return data
  },

  toggleFavorite: async (guildId: string, userId: string, track?: MusicTrack): Promise<MusicFavoriteResponse> => {
    const { data } = await apiClient.post<MusicFavoriteResponse>(`/api/Music/guild/${guildId}/favorite`, {
      userId,
      track,
    })
    return data
  },

  getFavorites: async (guildId: string, userId: string): Promise<MusicTrack[]> => {
    const { data } = await apiClient.get<{ tracks: MusicTrack[] }>(`/api/Music/guild/${guildId}/favorites`, {
      params: { userId },
    })
    return data.tracks
  },

  getHistory: async (guildId: string, userId?: string): Promise<MusicHistoryItem[]> => {
    const { data } = await apiClient.get<{ tracks: MusicHistoryItem[] }>(`/api/Music/guild/${guildId}/history`, {
      params: userId ? { userId } : undefined,
    })
    return data.tracks
  },

  getPlaylists: async (guildId: string, userId?: string): Promise<MusicPlaylist[]> => {
    const { data } = await apiClient.get<{ playlists: MusicPlaylist[] }>(`/api/Music/guild/${guildId}/playlists`, {
      params: userId ? { userId } : undefined,
    })
    return data.playlists
  },

  getPlaylist: async (guildId: string, playlistId: number): Promise<MusicPlaylist> => {
    const { data } = await apiClient.get<MusicPlaylist>(`/api/Music/guild/${guildId}/playlists/${playlistId}`)
    return data
  },

  previewPlaylist: async (guildId: string, url: string): Promise<MusicPlaylistPreview> => {
    const { data } = await apiClient.get<MusicPlaylistPreview>(`/api/Music/guild/${guildId}/playlist-preview`, {
      params: { url },
    })
    return data
  },

  importPlaylist: async (
    guildId: string,
    body: { url: string; provider: string; name?: string; scope?: string; ownerUserId?: string; replaceExisting?: boolean }
  ): Promise<MusicImportJob> => {
    const { data } = await apiClient.post<MusicImportJob>(`/api/Music/guild/${guildId}/import`, body)
    return data
  },

  getImportJob: async (guildId: string, jobId: number): Promise<MusicImportJob> => {
    const { data } = await apiClient.get<MusicImportJob>(`/api/Music/guild/${guildId}/import/${jobId}`)
    return data
  },

  getRadioStations: async (guildId: string, query?: string): Promise<MusicRadioStation[]> => {
    const { data } = await apiClient.get<{ stations: MusicRadioStation[] }>(`/api/Music/guild/${guildId}/radio`, {
      params: query ? { query } : undefined,
    })
    return data.stations
  },

  getSpotifyStatus: async (): Promise<SpotifyLinkStatus> => {
    const { data } = await apiClient.get<SpotifyLinkStatus>('/api/Music/spotify/status')
    return data
  },

  connectSpotify: async (guildId?: string, returnPath?: string): Promise<SpotifyConnectUrl> => {
    const { data } = await apiClient.get<SpotifyConnectUrl>('/api/Music/spotify/connect', {
      params: { guildId, returnPath },
    })
    return data
  },

  completeSpotifyOAuth: async (code: string, state: string): Promise<SpotifyLinkStatus> => {
    // BFF auth/spotify/callback — Discord session istemez; 401 refresh interceptor’ına takılmaz
    const { data } = await apiClient.post<SpotifyLinkStatus>('/api/auth/spotify/callback', { code, state })
    return data
  },

  disconnectSpotify: async (): Promise<void> => {
    await apiClient.delete('/api/Music/spotify/disconnect')
  },

  listSpotifyPlaylists: async (): Promise<SpotifyRemotePlaylist[]> => {
    const { data } = await apiClient.get<{ playlists: SpotifyRemotePlaylist[] }>('/api/Music/spotify/playlists')
    return data.playlists ?? []
  },
}
