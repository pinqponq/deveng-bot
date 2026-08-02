import { apiClient } from './client'

export interface ValidateTokenResponse {
  valid: boolean
  userId?: string
  username?: string
  message: string
  error?: string
  expiresAt?: number // Unix timestamp milliseconds
  absoluteExpiresAt?: number // Unix timestamp milliseconds
  expiresInMs?: number // Milliseconds cinsinden expiry süresi
  expiresInMinutes?: number // Dakika cinsinden expiry süresi
  expiresAtFormatted?: string // Okunabilir format (yyyy-MM-dd HH:mm:ss UTC)
}

export interface RefreshTokenResponse {
  valid: boolean
  userId?: string
  username?: string
  message: string
  error?: string
  expiresAt?: number // Unix timestamp milliseconds
  absoluteExpiresAt?: number // Unix timestamp milliseconds
  expiresInMs?: number // Milliseconds cinsinden expiry süresi
  expiresInMinutes?: number // Dakika cinsinden expiry süresi
  expiresAtFormatted?: string // Okunabilir format (yyyy-MM-dd HH:mm:ss UTC)
}

export interface DiscordCallbackResponse {
  user: {
    id: string
    username: string
    discriminator: string
    avatar: string | null
    globalName: string | null
    verified: boolean
    email?: string
  }
  /** Eski API uyumu; BFF oturumunda token HttpOnly — yanıtta olmamalı. */
  accessToken?: string
  guilds: Array<{ id: string; name: string; icon: string | null; permissions: string | number; owner?: boolean }>
  expiresAt: number // Unix timestamp milliseconds
  absoluteExpiresAt?: number // Unix timestamp milliseconds
  expiresInMs: number // Milliseconds cinsinden expiry süresi
}

export interface DiscordCallbackRequest {
  code: string
  redirectUri?: string // Frontend'den gönderilen redirect URI
  /** BFF TURNSTILE_SECRET_KEY tanımlıysa zorunlu */
  turnstileToken?: string
}

export interface BffSessionResponse {
  authenticated: boolean
  expiresAt?: number
  absoluteExpiresAt?: number
  user?: {
    id: string
    username: string
    discriminator: string
    avatar: string | null
    avatarUrl?: string
    globalName: string | null
    /** Discord e-postayı paylaştıysa BFF doldurur; aksi halde alan yok. */
    email?: string
  }
  guilds?: Array<{
    id: string
    name: string
    icon: string | null
    iconUrl?: string
    permissions: string | number
    owner?: boolean
  }>
  message?: string
}

export interface LogoutResponse {
  success: boolean
}

/** Aynı anda beforeLoad + useTokenValidator vb. getSession açarsa tek HTTP isteğe düşür (429 / gereksiz yük) */
let getSessionInFlight: Promise<BffSessionResponse> | null = null

export const authApi = {
  /**
   * Token'ın geçerliliğini API'den kontrol et (expiry sunucu tarafında hesaplanır)
   */
  validateToken: async (): Promise<ValidateTokenResponse> => {
    const response = await apiClient.get<ValidateTokenResponse>('/api/auth/validate-token')
    return response.data
  },

  /**
   * BFF oturumu — Discord profil + guild listesi (localStorage'da tutulmaz)
   */
  getSession: async (): Promise<BffSessionResponse> => {
    if (getSessionInFlight) return getSessionInFlight
    getSessionInFlight = apiClient
      .get<BffSessionResponse>('/api/auth/session')
      .then((r) => r.data)
      .finally(() => {
        getSessionInFlight = null
      })
    return getSessionInFlight
  },

  /**
   * Discord OAuth callback - code ile token ve expiry bilgisini al
   */
  discordCallback: async (
    code: string,
    redirectUri?: string,
    turnstileToken?: string,
  ): Promise<DiscordCallbackResponse> => {
    const body: DiscordCallbackRequest = { code }
    if (redirectUri) body.redirectUri = redirectUri
    if (turnstileToken) body.turnstileToken = turnstileToken
    const response = await apiClient.post<DiscordCallbackResponse>('/api/auth/discord/callback', body)
    return response.data
  },

  /**
   * Token'ı yeniler - Mevcut token'ı validate edip yeni expiry süresi döndürür
   * Kullanıcı aktifken token süresini uzatmak için kullanılır
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/api/auth/refresh-token')
    return response.data
  },

  /**
   * BFF oturumunu server tarafında kapatır ve HttpOnly session cookie'yi temizler.
   */
  logout: async (): Promise<LogoutResponse> => {
    const response = await apiClient.post<LogoutResponse>('/api/auth/logout')
    return response.data
  },
}
