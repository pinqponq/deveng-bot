import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

const TOKEN_CHECK_INTERVAL = 2 * 60 * 1000 // 2 dakika - Discord API yükünü azaltmak için

/**
 * Her 2 dakikada bir token geçerliliğini API'den kontrol eden hook
 *
 * Not: `user` nesnesine bağlanmayın — validateTokenWithAPI → hydrateFromSession
 * her seferinde yeni referans yaratır; [user] ile efekt tekrar tekrar çalışıp
 * session isteğini patlatır (429). Kimlik: accountNo (Discord user id).
 */
export function useTokenValidator() {
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.auth.user?.accountNo ?? null)
  const validateTokenWithAPI = useAuthStore((state) => state.auth.validateTokenWithAPI)
  const checkTokenExpiry = useAuthStore((state) => state.auth.checkTokenExpiry)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!userId) return

    const checkToken = async () => {
      try {
        const isValid = await validateTokenWithAPI()

        if (!isValid) {
          console.log('Token expired, redirecting to sign-in')
          navigate({ to: '/sign-in', replace: true })
        }
      } catch (error) {
        console.error('Token validation error:', error)
        if (!checkTokenExpiry()) {
          navigate({ to: '/sign-in', replace: true })
        }
      }
    }

    checkToken()

    intervalRef.current = setInterval(() => {
      checkToken()
    }, TOKEN_CHECK_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [userId, validateTokenWithAPI, checkTokenExpiry, navigate])

  useEffect(() => {
    if (!userId) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const isValid = await validateTokenWithAPI()
          if (!isValid) {
            navigate({ to: '/sign-in', replace: true })
          }
        } catch (error) {
          console.error('Token validation error on visibility change:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, validateTokenWithAPI, navigate])
}
