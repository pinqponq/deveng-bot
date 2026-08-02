import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/env'
import { readCsrfCookie } from '@/lib/csrf'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const CSRF_UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const authState = useAuthStore.getState()

    // BFF modeli: token server-side session'da tutuluyor.
    // Node BFF proxy, Authorization header'ı session'dan ekler.
    // İstemci tarafı yalnızca cookie'yi otomatik gönderir (withCredentials).
    config.withCredentials = true

    // CSRF double-submit: state-changing isteklerde cookie değerini header'a kopyala.
    const method = (config.method || 'get').toUpperCase()
    if (CSRF_UNSAFE_METHODS.has(method)) {
      const token = readCsrfCookie()
      if (token) {
        config.headers['X-CSRF-Token'] = token
      }
    }

    // Bot clientId'sini auth store'dan oku ve header'a ekle (custom bot için)
    const selectedBotClientId = authState.auth.selectedBotClientId
    if (selectedBotClientId) {
      config.headers['X-Bot-ClientId'] = selectedBotClientId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Token refresh mekanizması
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: void) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error?: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

/**
 * Açık-redirect (open redirect) önlemi: yalnızca aynı kökenden gelen, '/' ile başlayan
 * ve '//' ile başlamayan path'ler kabul edilir. Aksi halde redirect parametresi yazılmaz.
 */
const sanitizeSamePagePath = (): string | null => {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname + window.location.search
  // '//evil.tld' veya 'http://...' gibi protokol değiştiren değerleri reddet
  if (!path.startsWith('/') || path.startsWith('//')) return null
  // Sadece güvenli karakterler
  if (!/^\/[A-Za-z0-9_\-./?=&%~:+,$()*]*$/.test(path)) return null
  if (path === '/sign-in' || path.startsWith('/sign-in?') || path.startsWith('/auth/')) return null
  return path
}

const redirectToSignIn = () => {
  if (typeof window === 'undefined') return
  const safe = sanitizeSamePagePath()
  window.location.href = safe ? `/sign-in?redirect=${encodeURIComponent(safe)}` : '/sign-in'
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const reqUrl = String(originalRequest?.url || '')
    const isSessionProbe =
      (originalRequest?.method || 'get').toLowerCase() === 'get' &&
      (reqUrl.includes('auth/session') || reqUrl.endsWith('session'))

    const isSpotifyOAuthCallback =
      reqUrl.includes('auth/spotify/callback') || reqUrl.includes('Music/spotify/callback')
    if (error.response?.status === 401 && (isSessionProbe || isSpotifyOAuthCallback)) {
      return Promise.reject(error)
    }

    // 401 hatası ve refresh denemesi yapılmamışsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Zaten refresh işlemi devam ediyor, queue'ya ekle
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            delete originalRequest.headers.Authorization
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const authState = useAuthStore.getState()
        
        // Refresh token endpoint'ini çağır (doğrudan axios ile, interceptor'ı bypass etmek için)
        const { authApi } = await import('./auth')
        const refreshResponse = await authApi.refreshToken()
        
        if (refreshResponse.valid && refreshResponse.expiresAt) {
          // Token yenilendi, yeni expiry'yi güncelle
          const newUser = authState.auth.user
          if (newUser) {
            const updatedUser = {
              ...newUser,
              exp: refreshResponse.expiresAt
            }
            authState.auth.setUser(updatedUser)
          }
          
          processQueue()

          delete originalRequest.headers.Authorization
          isRefreshing = false
          return apiClient(originalRequest)
        } else {
          processQueue(new Error('Token refresh failed'))
          authState.auth.reset()
          isRefreshing = false
          
          redirectToSignIn()
          
          return Promise.reject(error)
        }
      } catch (refreshError) {
        processQueue(refreshError)
        const authState = useAuthStore.getState()
        authState.auth.reset()
        isRefreshing = false
        
        console.error('[API Client] Token refresh failed:', refreshError)
        
        redirectToSignIn()
        
        return Promise.reject(refreshError)
      }
    }

    // Diğer hatalar
    if (error.response?.status === 401) {
      console.error('[API Client] 401 Unauthorized - Token may be invalid or expired')
    }
    
    return Promise.reject(error)
  }
)

