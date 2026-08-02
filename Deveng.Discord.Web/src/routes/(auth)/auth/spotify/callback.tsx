import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { musicApi } from '@/lib/api/music'

export const Route = createFileRoute('/(auth)/auth/spotify/callback')({
  component: SpotifyCallback,
})

function readGuildHint(): string | null {
  try {
    const fromSession = sessionStorage.getItem('spotify.oauth.guildId')
    if (fromSession?.trim()) return fromSession.trim()
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(/(?:^|;\s*)spotify\.oauth\.guildId=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function clearGuildHint() {
  try {
    sessionStorage.removeItem('spotify.oauth.guildId')
  } catch {
    /* ignore */
  }
  document.cookie = 'spotify.oauth.guildId=; Path=/; Max-Age=0; SameSite=Lax'
}

function SpotifyCallback() {
  const { t } = useTranslation('music')
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      const code = params.get('code')
      const state = params.get('state')
      const guildHint = readGuildHint()

      const goMusic = (guildId?: string | null) => {
        clearGuildHint()
        const target = guildId?.trim()
        if (target) {
          navigate({
            to: '/dashboard/$guildId/bot-music',
            params: { guildId: target },
            search: { view: 'settings' },
          })
          return
        }
        navigate({ to: '/select-server' })
      }

      if (error) {
        toast.error(t('spotifyConnectFailed'), { description: error })
        setStatus('error')
        setTimeout(() => goMusic(guildHint), 1800)
        return
      }

      if (!code || !state) {
        toast.error(t('spotifyConnectFailed'))
        setStatus('error')
        setTimeout(() => goMusic(guildHint), 1800)
        return
      }

      try {
        const link = await musicApi.completeSpotifyOAuth(code, state)
        const guildId = link.guildId || guildHint
        if (link.connected) {
          toast.success(t('spotifyConnectSuccess', { name: link.displayName || 'Spotify' }))
          if (link.warning) toast.message(link.warning)
          setStatus('success')
          setTimeout(() => goMusic(guildId), 700)
        } else {
          toast.error(link.warning || t('spotifyConnectFailed'))
          setStatus('error')
          setTimeout(() => goMusic(guildId), 1800)
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          t('spotifyConnectFailed')
        toast.error(message)
        setStatus('error')
        setTimeout(() => goMusic(guildHint), 2000)
      }
    }

    void run()
  }, [navigate, t])

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center'>
      <Loader2 className={`size-8 ${status === 'loading' ? 'animate-spin' : ''}`} />
      <p className='text-sm text-muted-foreground'>
        {status === 'loading'
          ? t('spotifyConnecting')
          : status === 'success'
            ? t('spotifyConnectSuccessShort')
            : t('spotifyConnectFailed')}
      </p>
    </div>
  )
}
