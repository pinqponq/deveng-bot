import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'
import { TURNSTILE_SITE_KEY } from '@/lib/env'

export const Route = createFileRoute('/(auth)/auth/discord/callback')({
  component: DiscordCallback,
})

const LOADING_MESSAGE_KEYS = ['tea', 'bots', 'discord', 'servers', 'wait', 'almost'] as const
const SUCCESS_MESSAGE_KEYS = ['coming', 'ready', 'here'] as const

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve()
  const existing = document.querySelector('script[data-cf-turnstile-api]')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.setAttribute('data-cf-turnstile-api', '1')
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script yüklenemedi'))
    document.head.appendChild(s)
  })
}

function DiscordCallback() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadingMessage] = useState(() => {
    const key = LOADING_MESSAGE_KEYS[Math.floor(Math.random() * LOADING_MESSAGE_KEYS.length)]
    return t(`discordCallbackLoading.${key}`)
  })
  const [successMessage] = useState(() => {
    const key = SUCCESS_MESSAGE_KEYS[Math.floor(Math.random() * SUCCESS_MESSAGE_KEYS.length)]
    return t(`discordCallbackSuccess.${key}`)
  })
  const hasProcessed = useRef(false)
  const turnstileWidgetId = useRef<string | null>(null)
  const turnstileMountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasProcessed.current) return

    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        toast.error(t('discordAuthError'), {
          description: error,
        })
        setStatus('error')
        setTimeout(() => {
          navigate({ to: '/sign-in' })
        }, 2000)
        return
      }

      if (!code) {
        toast.error(t('authCodeNotFound'))
        setStatus('error')
        setTimeout(() => {
          navigate({ to: '/sign-in' })
        }, 2000)
        return
      }

      const runExchange = async (turnstileToken?: string) => {
        if (hasProcessed.current) return
        hasProcessed.current = true

        type ExchangeData = {
          user: {
            id: string
            username: string
            discriminator: string
            avatar: string | null
            globalName: string | null
            verified: boolean
            email?: string
          }
          guilds: Array<{
            id: string
            name: string
            icon: string | null
            permissions: number | string
            owner?: boolean
          }>
          expiresAt?: number
          expiresInMs?: number
        }

        let data: ExchangeData

        try {
          const apiData = await authApi.discordCallback(
            code,
            undefined,
            turnstileToken,
          )

          data = {
            user: apiData.user,
            guilds: apiData.guilds,
            expiresAt: apiData.expiresAt,
            expiresInMs: apiData.expiresInMs,
          }
        } catch (fetchError: unknown) {
          hasProcessed.current = false
          const fe = fetchError as {
            message?: string
            response?: { status?: number; data?: { message?: string; details?: string } }
          }
          console.error('Backend Discord callback hatası:', fetchError)

          if (fe?.response?.status === 400) {
            const errorMessage =
              fe.response?.data?.message || t('discordSignInFailedFallback')
            const errorDetails = fe.response?.data?.details || ''
            toast.error(t('discordSignInFailed'), {
              description: [errorMessage, errorDetails].filter(Boolean).join(' '),
              duration: 6000,
            })
          } else {
            toast.error(t('signInFailed'), {
              description: t('backendConnectionFailed'),
              duration: 5000,
            })
          }
          setStatus('error')
          setTimeout(() => navigate({ to: '/sign-in' }), 3000)
          return
        }

        if (!data.user) {
          throw new Error('Kullanıcı bilgileri alınamadı')
        }

        const discordUser = data.user
        const guilds = data.guilds || []

        const avatarUrl = discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0', 10) % 5}.png`

        const guildsWithIcons = guilds.map(
          (guild: {
            id: string
            name: string
            icon: string | null
            permissions: number | string
            owner?: boolean
          }) => ({
            ...guild,
            iconUrl: guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
              : undefined,
            permissions: guild.permissions,
          }),
        )

        const expiresAt = data.expiresAt || Date.now() + (data.expiresInMs || 24 * 60 * 60 * 1000)

        const emailTrimmed =
          typeof discordUser.email === 'string' && discordUser.email.trim() !== ''
            ? discordUser.email.trim()
            : ''

        const user = {
          accountNo: discordUser.id,
          email: emailTrimmed,
          role: ['user'],
          exp: expiresAt,
          discord: {
            id: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            avatarUrl,
            globalName: discordUser.globalName || undefined,
            verified: discordUser.verified,
            guilds: guildsWithIcons,
          },
        }

        auth.setSelectedGuild(null)
        auth.setUser(user)
        auth.setAccessToken('')

        setStatus('success')

        setTimeout(() => {
          navigate({ to: '/apps', replace: true })
        }, 1000)
      }

      if (TURNSTILE_SITE_KEY) {
        try {
          await loadTurnstileScript()
          const el = turnstileMountRef.current
          if (!el || !window.turnstile) {
            throw new Error('Turnstile başlatılamadı')
          }
          turnstileWidgetId.current = window.turnstile.render(el, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
              void runExchange(token)
            },
            'error-callback': () => {
              toast.error(t('securityVerificationFailed'), {
                description: t('refreshAndRetry'),
              })
              setStatus('error')
              setTimeout(() => navigate({ to: '/sign-in' }), 3000)
            },
          })
        } catch (e) {
          console.error(e)
          toast.error(t('securityComponentLoadFailed'))
          setStatus('error')
          setTimeout(() => navigate({ to: '/sign-in' }), 3000)
        }
        return
      }

      try {
        await runExchange()
      } catch (error) {
        console.error('Discord callback error:', error)
        let errorMessage = t('unknownError')

        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          errorMessage = t('backendUnreachable')
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        toast.error(t('signInUnexpectedError'), {
          description: errorMessage,
          duration: 6000,
        })
        setStatus('error')
        setTimeout(() => {
          navigate({ to: '/sign-in' })
        }, 3000)
      }
    }

    void handleCallback()

    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current)
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='flex min-h-svh flex-col items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        {TURNSTILE_SITE_KEY && status === 'loading' && (
          <div ref={turnstileMountRef} className='min-h-[65px]' aria-label={t('securityVerificationAriaLabel')} />
        )}
        {(status === 'loading' || status === 'success') && (
          <>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-muted-foreground text-sm'>
              {status === 'loading' ? loadingMessage : successMessage}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className='size-8 rounded-full bg-red-500' />
            <p className='text-muted-foreground text-sm'>
              {t('discordCallbackErrorRedirect')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
