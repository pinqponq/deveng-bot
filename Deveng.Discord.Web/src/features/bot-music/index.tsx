import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { SectionNav } from '@/components/layout/section-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { API_BASE_URL } from '@/lib/env'
import { discordApi, type DiscordChannel, type DiscordRole, type DiscordVoiceChannel } from '@/lib/api/discord'
import { musicApi, type MusicPlaylist, type MusicRadioStation, type MusicState, type MusicTrack, type SpotifyRemotePlaylist } from '@/lib/api/music'
import { useAuthStore } from '@/stores/auth-store'
import { ChevronDown, Heart, History, ListMusic, Loader2, Music, Pause, Play, Radio, RotateCcw, SearchIcon, Settings, SkipBack, SkipForward, Square, Trash2 } from 'lucide-react'

function formatDuration(ms: number | undefined, liveLabel: string) {
  if (!ms || ms <= 0) return liveLabel
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDate(value: string | undefined, noDateLabel: string) {
  if (!value) return noDateLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return noDateLabel
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function clampPosition(positionMs: number, durationMs?: number) {
  const normalized = Math.max(0, Math.round(positionMs))
  return durationMs && durationMs > 0 ? Math.min(normalized, durationMs) : normalized
}

const VOLUME_MAX = 150
const DEFAULT_VOLUME = 1
const LIVE_DURATION_THRESHOLD_MS = 24 * 60 * 60 * 1000
const rangeInputClassName = 'h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50'

function clampVolumeValue(volume: number) {
  return Math.max(0, Math.min(VOLUME_MAX, Math.round(volume)))
}

function channelLabel(channel?: DiscordChannel | DiscordVoiceChannel) {
  if (!channel) return undefined
  return 'type' in channel ? channel.name : `# ${channel.name}`
}

function isLiveTrack(track?: MusicTrack) {
  if (!track) return false
  const source = track.source.toLowerCase()
  return Boolean(track.isStream) || !track.durationMs || track.durationMs <= 0 || track.durationMs >= LIVE_DURATION_THRESHOLD_MS || source === 'http' || source === 'direct'
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string }
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: { code?: string } } }).response?.data?.code
}

function isDjRoleError(error: unknown) {
  return getErrorCode(error) === 'dj_role_required'
}

function shouldRetryMusicQuery(failureCount: number, error: unknown) {
  return !isDjRoleError(error) && failureCount < 3
}

export type MusicView = 'home' | 'history' | 'liked' | 'playlists' | 'radio' | 'settings'
type ImportStep = 'select' | 'configure' | 'importing' | 'result'
type PlaylistPageSize = 25 | 50
type RadioPageSize = 6 | 12 | 24

const musicViewIcons: Record<MusicView, React.ElementType> = {
  home: Music,
  history: History,
  liked: Heart,
  playlists: ListMusic,
  radio: Radio,
  settings: Settings,
}

export function BotMusic({ initialView = 'home' }: { initialView?: MusicView }) {
  const { t } = useTranslation()
  const musicViews = React.useMemo<Array<{ id: MusicView; label: string; icon: React.ElementType }>>(() => [
    { id: 'home', label: t('music:viewHome'), icon: musicViewIcons.home },
    { id: 'history', label: t('music:viewHistory'), icon: musicViewIcons.history },
    { id: 'liked', label: t('music:viewLiked'), icon: musicViewIcons.liked },
    { id: 'playlists', label: t('music:viewPlaylists'), icon: musicViewIcons.playlists },
    { id: 'radio', label: t('music:viewRadio'), icon: musicViewIcons.radio },
    { id: 'settings', label: t('music:viewSettings'), icon: musicViewIcons.settings },
  ], [t])
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<MusicTrack[]>([])
  const [volumeValue, setVolumeValue] = React.useState(DEFAULT_VOLUME)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [sseHealthy, setSseHealthy] = React.useState(false)
  const [lyricsOpen, setLyricsOpen] = React.useState(false)
  const [lyricsText, setLyricsText] = React.useState('')
  const [lyricsTitle, setLyricsTitle] = React.useState(() => t('music:lyricsTitle'))
  const [queueOpen, setQueueOpen] = React.useState(false)
  const [selectedDjRoleId, setSelectedDjRoleId] = React.useState('')
  const [selectedAnnounceChannelId, setSelectedAnnounceChannelId] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<MusicView>(initialView)
  const [importUrl, setImportUrl] = React.useState('')
  const [importName, setImportName] = React.useState('')
  const [importNameHint, setImportNameHint] = React.useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [importStep, setImportStep] = React.useState<ImportStep>('select')
  const [lastImportJob, setLastImportJob] = React.useState<Awaited<ReturnType<typeof musicApi.importPlaylist>> | null>(null)
  const [selectedPlaylistId, setSelectedPlaylistId] = React.useState<number | null>(null)
  const [playlistPageSize, setPlaylistPageSize] = React.useState<PlaylistPageSize>(25)
  const [playlistPage, setPlaylistPage] = React.useState(1)
  const [radioQuery, setRadioQuery] = React.useState('')
  const [radioPage, setRadioPage] = React.useState(1)
  const [radioPageSize, setRadioPageSize] = React.useState<RadioPageSize>(12)
  const lastCommittedVolumeRef = React.useRef(DEFAULT_VOLUME)
  const actionGenerationRef = React.useRef(0)
  const discordUserId = auth.user?.discord?.id

  React.useEffect(() => {
    setActiveTab(initialView)
  }, [initialView])

  const { renderFeatureGate } = useFeatureGate({
    guildId,
    featureName: 'music',
    featureDisplayName: t('music:featureDisplayName'),
  })

  const settingsQuery = useQuery({
    queryKey: ['music-settings', guildId],
    queryFn: () => musicApi.getSettings(guildId),
    enabled: !!guildId,
    staleTime: 30000,
  })

  const rolesQuery = useQuery({
    queryKey: ['discord-roles', guildId],
    queryFn: () => discordApi.getRoles(guildId),
    enabled: !!guildId,
    staleTime: 60000,
  })

  const channelsQuery = useQuery({
    queryKey: ['discord-channels', guildId],
    queryFn: () => discordApi.getChannels(guildId),
    enabled: !!guildId,
    staleTime: 60000,
  })

  const needsDjSetup = Boolean(settingsQuery.data?.enabled && settingsQuery.data.requireDjRole && !settingsQuery.data.setupCompleted)
  const canCheckMusicAccess = Boolean(guildId && settingsQuery.isSuccess && !needsDjSetup)
  const spotifyConfigured = settingsQuery.data?.spotifyConfigured === true
  const importLooksLikeSpotify = /spotify\.com|spotify:/i.test(importUrl)

  const spotifyStatusQuery = useQuery({
    queryKey: ['music-spotify-status', discordUserId],
    queryFn: () => musicApi.getSpotifyStatus(),
    enabled: Boolean(discordUserId && spotifyConfigured),
    staleTime: 30_000,
  })
  const spotifyConnected = spotifyStatusQuery.data?.connected === true
  const spotifyIsFree = spotifyStatusQuery.data?.product === 'free'
  const spotifyCanImport = Boolean(spotifyConfigured && spotifyConnected && !spotifyIsFree)

  const spotifyLibraryQuery = useQuery({
    queryKey: ['music-spotify-library', discordUserId],
    queryFn: () => musicApi.listSpotifyPlaylists(),
    enabled: Boolean(discordUserId && spotifyCanImport && canCheckMusicAccess),
    staleTime: 60_000,
  })

  const connectSpotifyMutation = useMutation({
    mutationFn: () => musicApi.connectSpotify(guildId, `/dashboard/${guildId}/bot-music`),
    onSuccess: (data) => {
      if (guildId) {
        try {
          sessionStorage.setItem('spotify.oauth.guildId', guildId)
        } catch {
          /* ignore */
        }
        document.cookie = `spotify.oauth.guildId=${encodeURIComponent(guildId)}; Path=/; Max-Age=600; SameSite=Lax`
      }
      window.location.href = data.authorizeUrl
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:spotifyConnectFailed'))),
  })

  const disconnectSpotifyMutation = useMutation({
    mutationFn: () => musicApi.disconnectSpotify(),
    onSuccess: async () => {
      toast.success(t('music:spotifyDisconnectSuccess'))
      await queryClient.invalidateQueries({ queryKey: ['music-spotify-status'] })
      await queryClient.invalidateQueries({ queryKey: ['music-spotify-library'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:spotifyConnectFailed'))),
  })

  const selectSpotifyRemotePlaylist = React.useCallback((playlist: SpotifyRemotePlaylist) => {
    const url = playlist.externalUrl || `https://open.spotify.com/playlist/${playlist.id}`
    setImportUrl(url)
    setImportName(playlist.name)
    setImportNameHint('ok')
    setImportStep('configure')
  }, [])

  const fetchPlaylistPreviewName = React.useCallback(async (url: string) => {
    const trimmed = url.trim()
    if (!guildId || !trimmed) return
    setImportNameHint('loading')
    try {
      const preview = await musicApi.previewPlaylist(guildId, trimmed)
      if (preview.name?.trim()) {
        setImportName(preview.name.trim())
        setImportNameHint('ok')
      } else {
        setImportNameHint('fail')
      }
    } catch {
      setImportNameHint('fail')
    }
  }, [guildId])
  const djRoles = React.useMemo<DiscordRole[]>(() => {
    return [...(rolesQuery.data?.roles ?? [])].sort((a, b) => b.position - a.position)
  }, [rolesQuery.data?.roles])
  const textChannels = React.useMemo<DiscordChannel[]>(() => {
    return [...(channelsQuery.data?.channels ?? [])].sort((a, b) => a.position - b.position)
  }, [channelsQuery.data?.channels])
  const announceTextChannelId = selectedAnnounceChannelId || settingsQuery.data?.allowedTextChannelId || undefined
  const channelNames = React.useMemo(() => {
    const names = new Map<string, string>()
    for (const channel of channelsQuery.data?.channels ?? []) {
      names.set(channel.id, channelLabel(channel) ?? channel.name)
    }
    for (const channel of channelsQuery.data?.voiceChannels ?? []) {
      names.set(channel.id, channelLabel(channel) ?? channel.name)
    }
    return names
  }, [channelsQuery.data?.channels, channelsQuery.data?.voiceChannels])
  const formatChannelName = React.useCallback((channelId?: string) => {
    if (!channelId) return t('music:unknown')
    if (channelsQuery.isLoading) return t('music:channelLoading')
    return channelNames.get(channelId) ?? t('music:unknownChannel')
  }, [channelNames, channelsQuery.isLoading, t])
  const formatTrackDuration = React.useCallback((ms?: number) => formatDuration(ms, t('music:live')), [t])
  const formatPlayedDate = React.useCallback((value?: string) => formatDate(value, t('music:noDate')), [t])

  const settingsMutation = useMutation({
    mutationFn: (roleId: string) => musicApi.updateSettings(guildId, {
      djRoleId: roleId,
      requireDjRole: true,
      setupCompleted: true,
      maxQueueSize: 500,
      maxUserSongs: 500,
      playlistTrackLimit: 500,
      favoriteLimit: 500,
      importTrackLimit: 500,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['music-settings', guildId], data)
      toast.success(t('music:djRoleSaved'), { duration: 2500 })
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:djRoleSaveFailed')), { duration: 3000 }),
  })

  const settingsUpdateMutation = useMutation({
    mutationFn: (settings: Partial<Awaited<ReturnType<typeof musicApi.getSettings>>>) => musicApi.updateSettings(guildId, settings),
    onSuccess: (data) => {
      queryClient.setQueryData(['music-settings', guildId], data)
      toast.success(t('music:settingsSaved'), { duration: 2000 })
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:settingsSaveFailed')), { duration: 3000 }),
  })

  const stateQuery = useQuery({
    queryKey: ['music-state', guildId],
    queryFn: () => musicApi.getState(guildId),
    enabled: canCheckMusicAccess,
    refetchInterval: sseHealthy ? false : 15000,
    refetchOnWindowFocus: false,
    retry: shouldRetryMusicQuery,
    staleTime: sseHealthy ? 30000 : 5000,
  })
  const state = stateQuery.data
  const canLoadMusicData = canCheckMusicAccess && stateQuery.isSuccess && !isDjRoleError(stateQuery.error)
  const displayedPositionMs = React.useMemo(() => {
    if (!state) return 0
    const durationMs = state.nowPlaying?.durationMs
    if (state.status !== 'playing' || state.paused) return clampPosition(state.positionMs, durationMs)
    const updatedAt = new Date(state.updatedAt).getTime()
    if (!Number.isFinite(updatedAt)) return clampPosition(state.positionMs, durationMs)
    return clampPosition(state.positionMs + Math.max(0, nowMs - updatedAt), durationMs)
  }, [nowMs, state])

  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  React.useEffect(() => {
    if (!canLoadMusicData) return
    let events: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false
    let attempts = 0
    let healthy = false
    const markHealthy = () => {
      healthy = true
      attempts = 0
      setSseHealthy(true)
    }
    const connect = () => {
      if (closed) return
      const url = `${API_BASE_URL}/api/Music/guild/${guildId}/events`
      healthy = false
      events = new EventSource(url, { withCredentials: true })
      events.addEventListener('ready', markHealthy)
      events.addEventListener('heartbeat', markHealthy)
      events.addEventListener('music', (event) => {
        markHealthy()
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { state: MusicState }
          queryClient.setQueryData(['music-state', guildId], payload.state)
        } catch {
          queryClient.invalidateQueries({ queryKey: ['music-state', guildId] })
        }
      })
      events.onerror = () => {
        setSseHealthy(false)
        events?.close()
        if (closed) return
        const delay = healthy ? Math.min(15000, 1000 * 2 ** attempts) : Math.min(60000, 30000 + attempts * 5000)
        attempts += 1
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(connect, delay)
      }
    }
    connect()
    return () => {
      closed = true
      setSseHealthy(false)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      events?.close()
    }
  }, [guildId, queryClient, canLoadMusicData])

  React.useEffect(() => {
    if (typeof state?.volume === 'number') {
      const nextVolume = clampVolumeValue(state.volume)
      setVolumeValue(nextVolume)
      lastCommittedVolumeRef.current = nextVolume
    }
  }, [state?.volume])

  React.useEffect(() => {
    setPlaylistPage(1)
  }, [selectedPlaylistId, playlistPageSize])

  const favoritesQuery = useQuery({
    queryKey: ['music-favorites', guildId, discordUserId],
    queryFn: () => musicApi.getFavorites(guildId, discordUserId || ''),
    enabled: canLoadMusicData && !!discordUserId,
    retry: shouldRetryMusicQuery,
    staleTime: 30000,
  })

  const historyQuery = useQuery({
    queryKey: ['music-history', guildId],
    queryFn: () => musicApi.getHistory(guildId),
    enabled: canLoadMusicData,
    retry: shouldRetryMusicQuery,
    staleTime: 30000,
  })

  const playlistsQuery = useQuery({
    queryKey: ['music-playlists', guildId, discordUserId],
    queryFn: () => musicApi.getPlaylists(guildId, discordUserId),
    enabled: canLoadMusicData,
    retry: shouldRetryMusicQuery,
    staleTime: 30000,
  })

  const playlistDetailQuery = useQuery({
    queryKey: ['music-playlist-detail', guildId, selectedPlaylistId],
    queryFn: () => musicApi.getPlaylist(guildId, selectedPlaylistId || 0),
    enabled: canLoadMusicData && !!selectedPlaylistId,
    retry: shouldRetryMusicQuery,
    staleTime: 30000,
  })

  const radioQueryResult = useQuery({
    queryKey: ['music-radio', guildId, radioQuery],
    queryFn: () => musicApi.getRadioStations(guildId, radioQuery),
    enabled: canLoadMusicData,
    retry: shouldRetryMusicQuery,
    staleTime: 30000,
  })

  const radioStations = React.useMemo(() => radioQueryResult.data ?? [], [radioQueryResult.data])
  const radioPageCount = Math.max(1, Math.ceil(radioStations.length / radioPageSize))
  const effectiveRadioPage = Math.min(Math.max(1, radioPage), radioPageCount)
  const radioPageStart = (effectiveRadioPage - 1) * radioPageSize
  const visibleRadioStations = radioStations.slice(radioPageStart, radioPageStart + radioPageSize)

  React.useEffect(() => {
    setRadioPage(1)
  }, [radioQuery])

  React.useEffect(() => {
    setRadioPage((p) => Math.min(p, radioPageCount))
  }, [radioPageCount])

  const searchMutation = useMutation({
    mutationFn: () => musicApi.search(guildId, query, 'auto'),
    onSuccess: setResults,
    onError: (error) => {
      toast.error(getErrorMessage(error, t('music:searchFailed')), { duration: 3000 })
    },
  })

  const playMutation = useMutation({
    mutationFn: ({ track, playNext }: { track: MusicTrack; generation: number; playNext?: boolean; skipCurrent?: boolean }) => {
      const user = auth.user?.discord
      return musicApi.play(guildId, track.title, {
        source: 'auto',
        track,
        playNext,
        textChannelId: announceTextChannelId,
        requester: user ? { id: user.id, username: user.username } : undefined,
      })
    },
    onSuccess: async (state, variables) => {
      if (variables.generation !== actionGenerationRef.current) return
      const shouldSkipCurrent = variables.skipCurrent && state.queue.length > 0
      if (shouldSkipCurrent) {
        const skipped = await musicApi.control(guildId, 'skip')
        queryClient.setQueryData(['music-state', guildId], skipped)
      } else {
        queryClient.setQueryData(['music-state', guildId], state)
      }
      queryClient.invalidateQueries({ queryKey: ['music-history', guildId] })
      toast.success(variables.skipCurrent || state.queue.length === 0 ? t('music:trackStarted') : t('music:trackQueued'), { duration: 2500 })
    },
    onError: (error, variables) => {
      if (variables.generation !== actionGenerationRef.current) return
      toast.error(getErrorMessage(error, t('music:trackStartFailed')), { duration: 3000 })
    },
  })

  const bulkPlayMutation = useMutation({
    mutationFn: ({ tracks, mode }: { tracks: MusicTrack[]; mode: 'start' | 'shuffle-start' | 'enqueue' | 'play-next' }) => {
      const user = auth.user?.discord
      return musicApi.bulkPlay(guildId, {
        mode,
        tracks,
        textChannelId: announceTextChannelId,
        requester: user ? { id: user.id, username: user.username } : undefined,
      })
    },
    onSuccess: (state) => {
      queryClient.setQueryData(['music-state', guildId], state)
      queryClient.invalidateQueries({ queryKey: ['music-history', guildId] })
      toast.success(t('music:playlistQueued'), { duration: 2500 })
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:playlistStartFailed')), { duration: 3500 }),
  })

  const controlMutation = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: { volume?: number; seekMs?: number; deltaMs?: number; position?: number } }) => musicApi.control(guildId, action, payload),
    onSuccess: (state) => queryClient.setQueryData(['music-state', guildId], state),
    onError: (error) => {
      if (typeof state?.volume === 'number') setVolumeValue(state.volume)
      toast.error(getErrorMessage(error, t('music:controlFailed')), { duration: 3000 })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (queueItemId: string) => musicApi.removeQueueItem(guildId, queueItemId),
    onSuccess: (state) => queryClient.setQueryData(['music-state', guildId], state),
    onError: (error) => toast.error(getErrorMessage(error, t('music:queueItemDeleteFailed')), { duration: 3000 }),
  })

  const lyricsMutation = useMutation({
    mutationFn: () => musicApi.getLyrics(guildId),
    onSuccess: (data) => {
      setLyricsTitle(data.track?.title ? t('music:lyricsTitleFor', { title: data.track.title }) : t('music:lyricsTitle'))
      setLyricsText(data.lyrics || t('music:lyricsNotFound'))
      setLyricsOpen(true)
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:lyricsFetchFailed')), { duration: 3000 }),
  })

  const favoriteMutation = useMutation({
    mutationFn: (track?: MusicTrack) => musicApi.toggleFavorite(guildId, discordUserId || '', track),
    onSuccess: (data) => {
      queryClient.setQueryData(['music-favorites', guildId, discordUserId], data.tracks)
      toast.success(data.liked ? t('music:likedAdded') : t('music:likedRemoved'), { duration: 2000 })
    },
    onError: (error) => toast.error(getErrorMessage(error, t('music:likeFailed')), { duration: 3000 }),
  })

  const importMutation = useMutation({
    mutationFn: () => musicApi.importPlaylist(guildId, {
      url: importUrl,
      provider: importUrl.includes('spotify.com') ? 'spotify' : 'youtube',
      name: importName || undefined,
      scope: 'guild',
      ownerUserId: discordUserId,
    }),
    onSuccess: (job) => {
      setLastImportJob(job)
      setImportStep('result')
      if (job.playlistId) setSelectedPlaylistId(job.playlistId)
      queryClient.invalidateQueries({ queryKey: ['music-playlists', guildId] })
      toast[job.status === 'failed' ? 'error' : 'success'](job.errorMessage || (job.status === 'failed' ? t('music:playlistImportFailedShort') : t('music:playlistImportedCount', { count: job.importedTracks })), { duration: 3500 })
    },
    onError: (error) => {
      setLastImportJob(null)
      setImportStep('result')
      toast.error(getErrorMessage(error, t('music:playlistImportFailed')), { duration: 3500 })
    },
  })

  const commitVolume = React.useCallback(() => {
    if (controlMutation.isPending || volumeValue === lastCommittedVolumeRef.current) return
    lastCommittedVolumeRef.current = volumeValue
    controlMutation.mutate({ action: 'volume', payload: { volume: volumeValue } })
  }, [controlMutation, volumeValue])

  const moveQueueItem = React.useCallback((queueItemId: string, position: number) => {
    musicApi.moveQueueItem(guildId, queueItemId, position)
      .then((next) => queryClient.setQueryData(['music-state', guildId], next))
      .catch((error) => toast.error(getErrorMessage(error, t('music:queueItemMoveFailed'))))
  }, [guildId, queryClient])

  const disconnect = React.useCallback(() => {
    actionGenerationRef.current += 1
    controlMutation.mutate({ action: 'disconnect' })
  }, [controlMutation])

  const seekTo = React.useCallback((seekMs: number) => {
    if (!state?.nowPlaying?.durationMs || controlMutation.isPending) return
    controlMutation.mutate({ action: 'seek', payload: { seekMs: Math.max(0, Math.min(state.nowPlaying.durationMs, seekMs)) } })
  }, [controlMutation, state?.nowPlaying?.durationMs])

  const togglePlaylist = React.useCallback((playlistId: number) => {
    setSelectedPlaylistId((current) => current === playlistId ? null : playlistId)
  }, [])

  const isLiked = React.useCallback((track?: MusicTrack) => {
    if (!track) return false
    return Boolean(favoritesQuery.data?.some((item) => item.encodedTrack === track.encodedTrack || item.uri === track.uri || item.id === track.id))
  }, [favoritesQuery.data])

  const nowPlaying = state?.nowPlaying
  const liveNowPlaying = isLiveTrack(nowPlaying)
  const showFooterPlayer = Boolean(nowPlaying && activeTab !== 'home')
  const canSeekNowPlaying = Boolean(nowPlaying?.durationMs && !liveNowPlaying)
  const controlsDisabled = controlMutation.isPending || !state?.nowPlaying
  const djDenied = [
    stateQuery.error,
    favoritesQuery.error,
    historyQuery.error,
    playlistsQuery.error,
    radioQueryResult.error,
  ].find(isDjRoleError)

  return renderFeatureGate(
    <>
      <Main className={showFooterPlayer ? 'pb-32 md:pb-28' : undefined}>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('music:pageTitle')}</h1>
            <p className='text-muted-foreground'>{t('music:pageDescription')}</p>
          </div>
          <FeatureDisableButton
            guildId={guildId}
            featureName='music'
            featureDisplayName={t('music:featureDisplayName')}
            confirmDescription={t('music:disableConfirmDescription')}
          />
        </div>

        {/* Sekmesiz tek akış: bölümlere yumuşak kaydıran yapışkan navigasyon (Tabs yerine). */}
        <SectionNav
          className='mb-6'
          items={musicViews.map((item) => {
            const Icon = item.icon
            return {
              id: `music-${item.id}`,
              label: (
                <span className='flex items-center gap-2'>
                  <Icon className='size-4' />
                  {item.label}
                </span>
              ),
            }
          })}
        />

        {needsDjSetup ? (
          <Card className='mx-auto max-w-3xl border-primary/40 bg-muted/20'>
            <CardHeader className='text-center'>
              <CardTitle>{t('music:djSetupTitle')}</CardTitle>
              <CardDescription>
                {t('music:djSetupDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <select
                className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                value={selectedDjRoleId}
                onChange={(event) => setSelectedDjRoleId(event.target.value)}
                disabled={rolesQuery.isLoading}
              >
                <option value=''>{rolesQuery.isLoading ? t('music:rolesLoading') : t('music:selectDjRole')}</option>
                {djRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <Button
                className='w-full'
                disabled={!selectedDjRoleId || settingsMutation.isPending}
                onClick={() => settingsMutation.mutate(selectedDjRoleId)}
              >
                {settingsMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('music:saveDjRoleAndOpen')}
              </Button>
              <p className='text-center text-xs text-muted-foreground'>
                {t('music:djRoleGateNote')}
              </p>
            </CardContent>
          </Card>
        ) : djDenied && activeTab !== 'settings' ? (
          <Card className='mx-auto max-w-3xl border-destructive/40 bg-muted/20'>
            <CardHeader className='text-center'>
              <CardTitle>{t('music:djDeniedTitle')}</CardTitle>
              <CardDescription>
                {t('music:djDeniedDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-center text-sm text-muted-foreground'>
              <p>{getErrorMessage(djDenied, t('music:djDeniedFallback'))}</p>
              <Button variant='default' onClick={() => setActiveTab('settings')}>
                {t('music:goToMusicSettings')}
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['music-settings', guildId] })
                  queryClient.resetQueries({ queryKey: ['music-state', guildId] })
                }}
              >
                {t('music:recheckSettings')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='flex flex-col gap-8'>
          <div className='order-2 space-y-4'>
            <section id='music-history' className='scroll-mt-32'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:historyTitle')}</CardTitle>
                  <CardDescription>{t('music:historyDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-3 md:grid-cols-2'>
                  {(historyQuery.data ?? []).map((track) => (
                    <div key={track.historyId} className='flex gap-3 rounded-lg border p-3'>
                      <img src={track.thumbnailUrl || '/favicon.png'} alt='' className='size-12 rounded object-cover' />
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{track.title}</div>
                        <div className='truncate text-sm text-muted-foreground'>{track.author || track.source}</div>
                        <div className='truncate text-xs text-muted-foreground'>{formatPlayedDate(track.playedAt)} · {t('music:djLabel')}: {track.requesterUsername || track.userId || t('music:unknown')}{track.voiceChannelId ? ` · ${t('music:channelLabel')}: ${formatChannelName(track.voiceChannelId)}` : ''}</div>
                      </div>
                      <Button size='sm' variant='outline' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}>{t('music:playAgain')}</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id='music-liked' className='scroll-mt-32'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:likedTitle')}</CardTitle>
                  <CardDescription>{t('music:likedDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-3 md:grid-cols-2'>
                  {(favoritesQuery.data ?? []).map((track) => (
                    <div key={track.id} className='flex items-center gap-3 rounded-lg border p-3'>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{track.title}</div>
                        <div className='truncate text-sm text-muted-foreground'>{track.author || track.source}</div>
                      </div>
                      <Button size='sm' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}>{t('music:play')}</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id='music-playlists' className='scroll-mt-32'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:playlistsTitle')}</CardTitle>
                  <CardDescription>{t('music:playlistsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <div className='mb-4 grid gap-2 md:grid-cols-4'>
                      {(['select', 'configure', 'importing', 'result'] as const).map((step, index) => (
                        <div key={step} className={`rounded-lg border px-3 py-2 text-sm ${importStep === step ? 'border-primary bg-background font-medium' : 'text-muted-foreground'}`}>
                          {index + 1}. {step === 'select' ? t('music:stepSelect') : step === 'configure' ? t('music:stepConfigure') : step === 'importing' ? t('music:stepImporting') : t('music:stepResult')}
                        </div>
                      ))}
                    </div>
                    {importStep === 'select' ? (
                      <div className='space-y-4'>
                        {spotifyCanImport ? (
                          <div className='space-y-2'>
                            <div className='flex items-center justify-between gap-2'>
                              <p className='text-sm font-medium'>{t('music:spotifyLibraryTitle')}</p>
                              {spotifyLibraryQuery.isFetching ? <Loader2 className='size-3.5 animate-spin text-muted-foreground' /> : null}
                            </div>
                            {spotifyLibraryQuery.isError ? (
                              <p className='text-sm text-muted-foreground'>{getErrorMessage(spotifyLibraryQuery.error, t('music:spotifyLibraryLoadFailed'))}</p>
                            ) : null}
                            {(spotifyLibraryQuery.data?.length ?? 0) > 0 ? (
                              <div className='grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2'>
                                {spotifyLibraryQuery.data!.map((playlist) => (
                                  <button
                                    key={playlist.id}
                                    type='button'
                                    className='flex items-center gap-3 rounded-lg border bg-background p-2 text-left transition hover:border-primary'
                                    onClick={() => selectSpotifyRemotePlaylist(playlist)}
                                  >
                                    {playlist.coverUrl ? (
                                      <img src={playlist.coverUrl} alt='' className='size-10 rounded object-cover' />
                                    ) : (
                                      <div className='flex size-10 items-center justify-center rounded bg-muted'>
                                        <ListMusic className='size-4 text-muted-foreground' />
                                      </div>
                                    )}
                                    <div className='min-w-0 flex-1'>
                                      <div className='truncate text-sm font-medium'>{playlist.name}</div>
                                      <div className='truncate text-xs text-muted-foreground'>
                                        {playlist.trackCount != null ? t('music:spotifyTrackCount', { count: playlist.trackCount }) : t('music:spotifyPlaylist')}
                                        {playlist.collaborative ? ` · ${t('music:spotifyCollaborative')}` : ''}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : spotifyLibraryQuery.isSuccess ? (
                              <p className='text-sm text-muted-foreground'>{t('music:spotifyLibraryEmpty')}</p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className='space-y-2'>
                          {importLooksLikeSpotify && spotifyConfigured && !spotifyCanImport ? (
                            <p className='text-sm text-muted-foreground'>
                              {t('music:spotifyImportNeedsConnect')}{' '}
                              <button
                                type='button'
                                className='underline underline-offset-2'
                                onClick={() => {
                                  setActiveTab('settings')
                                  document.getElementById('music-settings')?.scrollIntoView({ behavior: 'smooth' })
                                }}
                              >
                                {t('music:viewSettings')}
                              </button>
                            </p>
                          ) : null}
                          <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
                            <Input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder={t('music:playlistUrlPlaceholder')} />
                            <Button
                              disabled={!importUrl.trim() || (importLooksLikeSpotify && !spotifyCanImport)}
                              onClick={() => {
                                setImportStep('configure')
                                void fetchPlaylistPreviewName(importUrl)
                              }}
                            >
                              {t('music:continue')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : importStep === 'configure' ? (
                      <div className='space-y-2'>
                        <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
                          <Input
                            value={importName}
                            onChange={(event) => {
                              setImportName(event.target.value)
                              setImportNameHint('idle')
                            }}
                            placeholder={importNameHint === 'loading' ? t('music:playlistNameFetching') : t('music:playlistNamePlaceholder')}
                            disabled={importNameHint === 'loading'}
                          />
                          <Button
                            disabled={!importUrl.trim() || importMutation.isPending || importNameHint === 'loading'}
                            onClick={() => {
                              setImportStep('importing')
                              importMutation.mutate()
                            }}
                          >
                            {t('music:startImport')}
                          </Button>
                        </div>
                        {importNameHint === 'loading' ? (
                          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <Loader2 className='size-3.5 animate-spin' />
                            {t('music:playlistNameFetching')}
                          </p>
                        ) : null}
                        {importNameHint === 'ok' ? (
                          <p className='text-sm text-emerald-500'>{t('music:playlistNameAutoFilled')}</p>
                        ) : null}
                        {importNameHint === 'fail' ? (
                          <p className='text-sm text-muted-foreground'>{t('music:playlistNameFetchFailed')}</p>
                        ) : null}
                      </div>
                    ) : importStep === 'importing' ? (
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <Loader2 className='size-4 animate-spin' />
                        {t('music:playlistImporting')}
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        <div className={lastImportJob?.status === 'failed' ? 'text-destructive' : 'text-emerald-600'}>
                          {lastImportJob
                            ? lastImportJob.errorMessage || t('music:importResultCount', { imported: lastImportJob.importedTracks, total: lastImportJob.totalTracks })
                            : t('music:playlistImportFailedDot')}
                        </div>
                        <Button
                          variant='outline'
                          onClick={() => {
                            setImportUrl('')
                            setImportName('')
                            setImportNameHint('idle')
                            setLastImportJob(null)
                            setImportStep('select')
                          }}
                        >
                          {t('music:newImport')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className='space-y-3'>
                    {(playlistsQuery.data ?? []).map((playlist: MusicPlaylist) => {
                      const expanded = selectedPlaylistId === playlist.id
                      const detail = expanded ? playlistDetailQuery.data : undefined
                      const tracks = detail?.tracks ?? []
                      const pageCount = Math.max(1, Math.ceil(tracks.length / playlistPageSize))
                      const currentPage = Math.min(playlistPage, pageCount)
                      const pageStart = (currentPage - 1) * playlistPageSize
                      const visibleTracks = tracks.slice(pageStart, pageStart + playlistPageSize)
                      const playLoadedPlaylist = (mode: 'start' | 'shuffle-start' | 'enqueue') => {
                        if (tracks.length) {
                          bulkPlayMutation.mutate({ tracks, mode })
                          return
                        }
                        musicApi.getPlaylist(guildId, playlist.id)
                          .then((next) => bulkPlayMutation.mutate({ tracks: next.tracks ?? [], mode }))
                          .catch((error) => toast.error(getErrorMessage(error, t('music:playlistOpenFailed'))))
                      }

                      return (
                        <div key={playlist.id} className='overflow-hidden rounded-lg border'>
                          <button
                            type='button'
                            className='flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40'
                            onClick={() => togglePlaylist(playlist.id)}
                            aria-expanded={expanded}
                          >
                            <div className='min-w-0'>
                              <div className='truncate font-medium'>{playlist.name}</div>
                              <div className='text-sm text-muted-foreground'>{t('music:trackCount', { imported: playlist.importedTracks, total: playlist.totalTracks })}</div>
                              {playlist.lastImportError ? <p className='mt-1 text-sm text-destructive'>{t('music:playlistImportFailedDot')}</p> : null}
                            </div>
                            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>

                          {expanded ? (
                            <div className='space-y-4 border-t bg-muted/10 p-4'>
                              {playlistDetailQuery.isFetching ? (
                                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                  <Loader2 className='size-4 animate-spin' /> {t('music:tracksLoading')}
                                </div>
                              ) : detail ? (
                                <>
                                  <div className='flex flex-wrap items-center justify-between gap-3'>
                                    <div className='text-sm text-muted-foreground'>
                                      {t('music:tracksLoadedPage', { count: tracks.length, current: currentPage, total: pageCount })}
                                    </div>
                                    <div className='flex flex-wrap items-center gap-2'>
                                      <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                                        {t('music:pageSize')}
                                        <select
                                          className='h-8 rounded-md border bg-background px-2 text-sm'
                                          value={playlistPageSize}
                                          onChange={(event) => setPlaylistPageSize(Number(event.target.value) as PlaylistPageSize)}
                                        >
                                          <option value={25}>25</option>
                                          <option value={50}>50</option>
                                        </select>
                                      </label>
                                      <Button size='sm' disabled={bulkPlayMutation.isPending || !tracks.length} onClick={() => playLoadedPlaylist('start')}>{t('music:start')}</Button>
                                      <Button size='sm' variant='outline' disabled={bulkPlayMutation.isPending || !tracks.length} onClick={() => playLoadedPlaylist('shuffle-start')}>{t('music:shuffleStart')}</Button>
                                      <Button size='sm' variant='outline' disabled={bulkPlayMutation.isPending || !tracks.length} onClick={() => playLoadedPlaylist('enqueue')}>{t('music:addToQueue')}</Button>
                                    </div>
                                  </div>

                                  <div className='space-y-2'>
                                    {visibleTracks.map((track) => (
                                      <div key={`${track.id}:${track.uri}`} className='flex items-center gap-3 rounded-lg border bg-background p-3'>
                                        <img src={track.thumbnailUrl || '/favicon.png'} alt='' className='size-12 rounded object-cover' />
                                        <div className='min-w-0 flex-1'>
                                          <div className='truncate font-medium'>{track.title}</div>
                                          <div className='truncate text-sm text-muted-foreground'>{track.author || t('music:unknownSource')} · {formatTrackDuration(track.durationMs)}</div>
                                        </div>
                                        <div className='flex flex-wrap justify-end gap-1'>
                                          <Button size='sm' variant='ghost' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}>{t('music:play')}</Button>
                                          <Button size='sm' variant='ghost' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current, playNext: true, skipCurrent: Boolean(state?.nowPlaying) })}>{t('music:playNow')}</Button>
                                          <Button size='sm' variant='ghost' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current, playNext: true })}>{t('music:addToTop')}</Button>
                                        </div>
                                      </div>
                                    ))}
                                    {!tracks.length ? <p className='text-sm text-muted-foreground'>{t('music:playlistEmpty')}</p> : null}
                                  </div>

                                  {tracks.length > playlistPageSize ? (
                                    <div className='flex flex-wrap items-center justify-between gap-2'>
                                      <div className='text-sm text-muted-foreground'>
                                        {pageStart + 1}-{Math.min(pageStart + playlistPageSize, tracks.length)} / {tracks.length}
                                      </div>
                                      <div className='flex items-center gap-2'>
                                        <Button size='sm' variant='outline' disabled={currentPage <= 1} onClick={() => setPlaylistPage((page) => Math.max(1, page - 1))}>{t('music:previous')}</Button>
                                        <Button size='sm' variant='outline' disabled={currentPage >= pageCount} onClick={() => setPlaylistPage((page) => Math.min(pageCount, page + 1))}>{t('music:next')}</Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                    {!playlistsQuery.data?.length ? <p className='text-sm text-muted-foreground'>{t('music:noPlaylists')}</p> : null}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id='music-radio' className='scroll-mt-32'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:radioTitle')}</CardTitle>
                  <CardDescription>{t('music:radioDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <Input value={radioQuery} onChange={(event) => setRadioQuery(event.target.value)} placeholder={t('music:radioSearchPlaceholder')} />
                  {radioQueryResult.isFetching ? (
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <Loader2 className='size-4 animate-spin' />
                      {t('music:stationsLoading')}
                    </div>
                  ) : null}
                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                    {visibleRadioStations.map((station: MusicRadioStation) => (
                      <div key={station.id} className='rounded-lg border p-3'>
                        <div className='font-medium'>{station.name}</div>
                        <div className='text-sm text-muted-foreground'>{station.country || t('music:global')} · {station.genre || t('music:radioGenre')}</div>
                        <div className='mt-3 flex gap-2'>
                          <Button
                            size='sm'
                            onClick={() =>
                              musicApi
                                .play(guildId, station.streamUrl, {
                                  source: 'auto',
                                  track: {
                                    id: `radio:${station.id}`,
                                    title: station.name,
                                    author: station.country || station.genre,
                                    uri: station.streamUrl,
                                    source: 'direct',
                                    thumbnailUrl: station.imageUrl,
                                  },
                                  textChannelId: announceTextChannelId,
                                  requester: auth.user?.discord
                                    ? { id: auth.user.discord.id, username: auth.user.discord.username }
                                    : undefined,
                                })
                                .then((next) => {
                                  queryClient.setQueryData(['music-state', guildId], next)
                                  setActiveTab('home')
                                  toast.success(t('music:radioStarted'), { duration: 2500 })
                                })
                                .catch((error) => toast.error(getErrorMessage(error, t('music:radioPlayFailed'))))
                            }
                          >
                            {t('music:play')}
                          </Button>
                          <Button size='sm' variant='outline' onClick={() => navigator.clipboard.writeText(station.streamUrl)}>
                            {t('music:copy')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!radioQueryResult.isFetching && !radioStations.length ? (
                    <p className='text-sm text-muted-foreground'>{t('music:noRadioResults')}</p>
                  ) : null}
                  {radioStations.length > 0 ? (
                    <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-3'>
                      <div className='text-sm text-muted-foreground'>
                        {t('music:stationCount', { count: radioStations.length })}
                        {radioStations.length > radioPageSize
                          ? ` · ${t('music:showingRange', { from: radioPageStart + 1, to: Math.min(radioPageStart + radioPageSize, radioStations.length), current: effectiveRadioPage, total: radioPageCount })}`
                          : null}
                      </div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                          {t('music:pageSize')}
                          <select
                            className='h-8 rounded-md border bg-background px-2 text-sm'
                            value={radioPageSize}
                            onChange={(event) => {
                              setRadioPageSize(Number(event.target.value) as RadioPageSize)
                              setRadioPage(1)
                            }}
                          >
                            <option value={6}>6</option>
                            <option value={12}>12</option>
                            <option value={24}>24</option>
                          </select>
                        </label>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={effectiveRadioPage <= 1}
                          onClick={() =>
                            setRadioPage((p) => {
                              const cnt = Math.max(1, Math.ceil(radioStations.length / radioPageSize))
                              const cur = Math.min(Math.max(1, p), cnt)
                              return Math.max(1, cur - 1)
                            })
                          }
                        >
                          {t('music:previous')}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={effectiveRadioPage >= radioPageCount}
                          onClick={() =>
                            setRadioPage((p) => {
                              const cnt = Math.max(1, Math.ceil(radioStations.length / radioPageSize))
                              const cur = Math.min(Math.max(1, p), cnt)
                              return Math.min(cnt, cur + 1)
                            })
                          }
                        >
                          {t('music:next')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section id='music-settings' className='scroll-mt-32'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:settingsTitle')}</CardTitle>
                  <CardDescription>
                    {spotifyConfigured ? t('music:spotifyCredentialsOk') : t('music:spotifyCredentialsMissing')}
                  </CardDescription>
                  <CardDescription>{t('music:settingsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {spotifyConfigured ? (
                    <div className='space-y-3 rounded-lg border p-4'>
                      <div>
                        <p className='text-sm font-medium'>{t('music:spotifyConnect')}</p>
                        <p className='mt-1 text-sm text-muted-foreground'>{t('music:spotifyPremiumRequired')}</p>
                        <p className='mt-1 text-sm text-muted-foreground'>{t('music:spotifyCredentialsOk')}</p>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {spotifyConnected
                          ? t('music:spotifyConnectedAs', {
                              name: spotifyStatusQuery.data?.displayName || spotifyStatusQuery.data?.spotifyUserId || 'Spotify',
                            })
                          : t('music:spotifyNotConnected')}
                      </p>
                      {spotifyStatusQuery.data?.warning ? (
                        <p className='text-sm text-amber-700 dark:text-amber-200'>{spotifyStatusQuery.data.warning}</p>
                      ) : null}
                      <div className='flex flex-wrap gap-2'>
                        {!spotifyConnected ? (
                          <Button
                            disabled={!discordUserId || connectSpotifyMutation.isPending}
                            onClick={() => connectSpotifyMutation.mutate()}
                          >
                            {connectSpotifyMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                            {t('music:spotifyConnect')}
                          </Button>
                        ) : (
                          <Button
                            variant='outline'
                            disabled={disconnectSpotifyMutation.isPending}
                            onClick={() => disconnectSpotifyMutation.mutate()}
                          >
                            {disconnectSpotifyMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                            {t('music:spotifyDisconnect')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>{t('music:spotifyCredentialsMissing')}</p>
                  )}
                  {djDenied ? (
                    <p className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100'>
                      {t('music:djDeniedSettingsNote')}
                    </p>
                  ) : null}
                  <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
                    <select
                      className='h-10 rounded-md border bg-background px-3 text-sm'
                      value={selectedDjRoleId || settingsQuery.data?.djRoleId || ''}
                      onChange={(event) => setSelectedDjRoleId(event.target.value)}
                    >
                      <option value=''>{t('music:selectDjRole')}</option>
                      {djRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    <Button
                      disabled={settingsUpdateMutation.isPending || !(selectedDjRoleId || settingsQuery.data?.djRoleId)}
                      onClick={() => settingsUpdateMutation.mutate({ djRoleId: selectedDjRoleId || settingsQuery.data?.djRoleId, requireDjRole: true, setupCompleted: true })}
                    >
                      {t('music:saveDjRole')}
                    </Button>
                  </div>
                  <div className='space-y-2 rounded-lg border p-4'>
                    <div>
                      <p className='text-sm font-medium'>{t('music:announceChannelTitle')}</p>
                      <p className='mt-1 text-sm text-muted-foreground'>{t('music:announceChannelDescription')}</p>
                    </div>
                    <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
                      <select
                        className='h-10 rounded-md border bg-background px-3 text-sm'
                        value={selectedAnnounceChannelId || settingsQuery.data?.allowedTextChannelId || ''}
                        onChange={(event) => setSelectedAnnounceChannelId(event.target.value)}
                        disabled={channelsQuery.isLoading}
                      >
                        <option value=''>{t('music:selectAnnounceChannel')}</option>
                        {textChannels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            # {channel.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        disabled={settingsUpdateMutation.isPending}
                        onClick={() =>
                          settingsUpdateMutation.mutate({
                            allowedTextChannelId: selectedAnnounceChannelId || settingsQuery.data?.allowedTextChannelId || '',
                            announceNowPlaying: true,
                          })
                        }
                      >
                        {t('music:saveAnnounceChannel')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
          <section id='music-home' className='order-1 scroll-mt-32'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]'>
          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>{t('music:searchTitle')}</CardTitle>
                <CardDescription>{t('music:searchDescription')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('music:searchPlaceholder')} />
                  <Button onClick={() => searchMutation.mutate()} disabled={!query.trim() || searchMutation.isPending}>
                    {searchMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <SearchIcon className='size-4' />}
                    {t('music:search')}
                  </Button>
                </div>

                <div className='grid gap-3'>
                  {results.map((track) => (
                    <div key={track.id} className='flex items-center gap-3 rounded-lg border p-3'>
                      <img
                        src={track.thumbnailUrl || '/favicon.png'}
                        alt=''
                        className='size-14 rounded-md object-cover'
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{track.title}</div>
                        <div className='truncate text-sm text-muted-foreground'>{track.author || t('music:unknownSource')} · {formatTrackDuration(track.durationMs)}</div>
                        <Badge variant='secondary' className='mt-1'>{track.source}</Badge>
                      </div>
                      <div className='flex flex-wrap justify-end gap-2'>
                        <Button
                          size='sm'
                          onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}
                          disabled={playMutation.isPending}
                        >
                          {t('music:enqueue')}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current, playNext: true })}
                          disabled={playMutation.isPending}
                        >
                          {t('music:enqueueTop')}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current, playNext: true, skipCurrent: Boolean(state?.nowPlaying) })}
                          disabled={playMutation.isPending}
                        >
                          {t('music:playNowLower')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('music:queueTitle')}</CardTitle>
                <CardDescription>{t('music:queueCount', { count: state?.queue.length ?? 0 })}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-2'>
                {state?.queue.length ? (
                  <div className='mb-3 flex flex-wrap gap-2'>
                    <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'shuffle' })}>{t('music:shuffle')}</Button>
                    <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'removedupes' })}>{t('music:clearDupes')}</Button>
                    <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'clear' })}>{t('music:clear')}</Button>
                  </div>
                ) : null}
                {state?.queue.length ? (
                  state.queue.map((item) => (
                    <div key={item.queueItemId} className='flex items-center gap-3 rounded-lg border p-3'>
                      <div className='w-8 text-sm text-muted-foreground'>{item.position}</div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{item.title}</div>
                        <div className='truncate text-sm text-muted-foreground'>{item.author || item.source} · {formatTrackDuration(item.durationMs)}</div>
                      </div>
                      <div className='flex flex-wrap justify-end gap-1'>
                        <Button variant='ghost' size='sm' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'skipto', payload: { position: item.position } })}>{t('music:play')}</Button>
                        <Button variant='ghost' size='sm' disabled={removeMutation.isPending || item.position <= 1} onClick={() => moveQueueItem(item.queueItemId, Math.max(1, item.position - 1))}>{t('music:moveUp')}</Button>
                        <Button variant='ghost' size='sm' disabled={removeMutation.isPending || item.position >= state.queue.length} onClick={() => moveQueueItem(item.queueItemId, item.position + 1)}>{t('music:moveDown')}</Button>
                        <Button variant='ghost' size='icon' disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(item.queueItemId)}>
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-muted-foreground'>{t('music:queueEmpty')}</p>
                )}
              </CardContent>
            </Card>

            <div className='grid gap-4 xl:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('music:likedShortTitle')}</CardTitle>
                  <CardDescription>{t('music:likedShortDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  {favoritesQuery.data?.length ? (
                    favoritesQuery.data.slice(0, 6).map((track) => (
                      <div key={track.id} className='flex items-center gap-2 rounded-md border p-2 text-sm'>
                        <div className='min-w-0 flex-1'>
                          <div className='truncate font-medium'>{track.title}</div>
                          <div className='truncate text-muted-foreground'>{track.author || track.source}</div>
                        </div>
                        <Button size='sm' variant='outline' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}>{t('music:play')}</Button>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>{t('music:noLikedYet')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('music:historyShortTitle')}</CardTitle>
                  <CardDescription>{t('music:historyShortDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  {historyQuery.data?.length ? (
                    historyQuery.data.slice(0, 6).map((track) => (
                      <div key={track.historyId} className='flex items-center gap-2 rounded-md border p-2 text-sm'>
                        <div className='min-w-0 flex-1'>
                          <div className='truncate font-medium'>{track.title}</div>
                          <div className='truncate text-muted-foreground'>{track.author || track.source}</div>
                        </div>
                        <Button size='sm' variant='outline' disabled={playMutation.isPending} onClick={() => playMutation.mutate({ track, generation: actionGenerationRef.current })}>{t('music:playAgain')}</Button>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>{t('music:historyEmpty')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className='h-fit'>
            <CardHeader>
              <CardTitle>{t('music:nowPlayingTitle')}</CardTitle>
              <CardDescription>{t('music:statusLabel')}: {state?.status ?? 'idle'}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {stateQuery.isLoading ? (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='size-4 animate-spin' /> {t('music:loading')}
                </div>
              ) : nowPlaying ? (
                <>
                  <div className='overflow-hidden rounded-lg border bg-muted/30'>
                    <img
                      src={nowPlaying.thumbnailUrl || '/favicon.png'}
                      alt=''
                      className='aspect-video w-full object-cover'
                    />
                    <div className='space-y-2 p-3'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <h2 className='truncate font-semibold'>{nowPlaying.title}</h2>
                          <p className='truncate text-sm text-muted-foreground'>{nowPlaying.author || nowPlaying.source}</p>
                        </div>
                        <Badge variant='secondary'>{liveNowPlaying ? t('music:live') : nowPlaying.source}</Badge>
                      </div>
                      {liveNowPlaying ? (
                        <p className='text-xs text-muted-foreground'>{t('music:liveRadioNote')}</p>
                      ) : (
                        <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                          <span>{t('music:requester')}: {nowPlaying.requester?.username || t('music:panel')}</span>
                          <span className='text-end'>{t('music:channelLabel')}: {formatChannelName(state.voiceChannelId)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button size='sm' disabled={controlsDisabled} onClick={() => controlMutation.mutate({ action: state.paused ? 'resume' : 'pause' })}>
                      {state.paused ? <Play className='size-4' /> : <Pause className='size-4' />}
                      {state.paused ? t('music:resume') : t('music:pause')}
                    </Button>
                    {!liveNowPlaying ? (
                      <>
                        <Button size='sm' variant='outline' disabled={controlsDisabled} onClick={() => controlMutation.mutate({ action: 'rewind', payload: { deltaMs: 10000 } })}>
                          <SkipBack className='size-4' /> {t('music:back10')}
                        </Button>
                        <Button size='sm' variant='outline' disabled={controlsDisabled} onClick={() => controlMutation.mutate({ action: 'forward', payload: { deltaMs: 10000 } })}>
                          <SkipForward className='size-4' /> {t('music:forward10')}
                        </Button>
                        <Button size='sm' variant='outline' disabled={controlsDisabled} onClick={() => controlMutation.mutate({ action: 'replay' })}>
                          <RotateCcw className='size-4' /> {t('music:restart')}
                        </Button>
                      </>
                    ) : null}
                    {!liveNowPlaying || state.queue.length ? (
                      <Button size='sm' variant='outline' disabled={controlsDisabled} onClick={() => controlMutation.mutate({ action: 'skip' })}>
                        <SkipForward className='size-4' /> {t('music:skip')}
                      </Button>
                    ) : null}
                    <Button size='sm' variant='outline' disabled={controlsDisabled} onClick={disconnect}>
                      <Square className='size-4' /> {t('music:disconnect')}
                    </Button>
                  </div>
                  {!liveNowPlaying ? (
                    <div className='space-y-2 rounded-md border p-2 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span>{formatTrackDuration(displayedPositionMs)}</span>
                        <span>{formatTrackDuration(nowPlaying.durationMs)}</span>
                      </div>
                      <input
                        className={rangeInputClassName}
                        aria-label={t('music:trackTimeline')}
                        type='range'
                        min={0}
                        max={nowPlaying.durationMs || 0}
                        value={displayedPositionMs}
                        disabled={!canSeekNowPlaying || controlMutation.isPending}
                        onChange={(event) => seekTo(Number(event.target.value))}
                      />
                    </div>
                  ) : null}
                  <div className='space-y-2 rounded-md border p-2 text-sm'>
                    <div className='flex items-center justify-between'>
                      <span>{t('music:volume')}</span>
                      <span>{volumeValue}</span>
                    </div>
                    <input
                      className={rangeInputClassName}
                      type='range'
                      min={0}
                      max={VOLUME_MAX}
                      value={volumeValue}
                      onChange={(event) => setVolumeValue(clampVolumeValue(Number(event.target.value)))}
                      onBlur={commitVolume}
                      onPointerUp={commitVolume}
                      onKeyUp={(event) => {
                        if (event.key === 'Enter' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') commitVolume()
                      }}
                    />
                  </div>
                  {!liveNowPlaying || state.queue.length ? (
                    <div className='flex flex-wrap gap-2'>
                      {!liveNowPlaying ? (
                        <>
                          <Button size='sm' variant={state.loopMode === 'off' ? 'default' : 'outline'} disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'loop-off' })}>{t('music:loopOff')}</Button>
                          <Button size='sm' variant={state.loopMode === 'track' ? 'default' : 'outline'} disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'loop-track' })}>{t('music:loopTrack')}</Button>
                          <Button size='sm' variant={state.loopMode === 'queue' ? 'default' : 'outline'} disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'loop-queue' })}>{t('music:loopQueue')}</Button>
                        </>
                      ) : null}
                      {state.queue.length ? (
                        <>
                          <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'shuffle' })}>{t('music:shuffle')}</Button>
                          <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'clear' })}>{t('music:clearQueue')}</Button>
                          <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'removedupes' })}>{t('music:removeDupes')}</Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  <div className='flex flex-wrap gap-2'>
                    {!liveNowPlaying ? (
                      <Button size='sm' variant='outline' disabled={lyricsMutation.isPending} onClick={() => lyricsMutation.mutate()}>
                        {lyricsMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <ListMusic className='size-4' />}
                        {t('music:showLyrics')}
                      </Button>
                    ) : null}
                    <Button size='sm' variant={isLiked(nowPlaying) ? 'default' : 'outline'} disabled={!discordUserId || favoriteMutation.isPending} onClick={() => favoriteMutation.mutate(nowPlaying)}>
                      <Heart className='size-4' /> {isLiked(nowPlaying) ? t('music:liked') : t('music:like')}
                    </Button>
                  </div>
                  {state.errorMessage ? <p className='text-sm text-destructive'>{state.errorMessage}</p> : null}
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('music:nothingPlaying')}</p>
              )}
            </CardContent>
          </Card>
        </div>
          </section>
          </div>
        )}
      </Main>
      {showFooterPlayer && nowPlaying ? (
        <div className='fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <div className='mx-auto flex max-w-7xl items-center gap-3'>
            <img
              src={nowPlaying.thumbnailUrl || '/favicon.png'}
              alt=''
              className='size-12 shrink-0 rounded-md object-cover'
            />
            <div className='min-w-0 flex-1 md:max-w-xs'>
              <div className='truncate text-sm font-medium'>{nowPlaying.title}</div>
              <div className='truncate text-xs text-muted-foreground'>{nowPlaying.author || (liveNowPlaying ? t('music:liveRadio') : nowPlaying.source)}</div>
            </div>
            <div className='flex flex-1 flex-col items-center gap-1'>
              <div className='flex items-center gap-1'>
                {!liveNowPlaying ? (
                  <Button size='icon' variant='ghost' disabled={controlsDisabled} aria-label={t('music:back10Aria')} onClick={() => controlMutation.mutate({ action: 'rewind', payload: { deltaMs: 10000 } })}>
                    <SkipBack className='size-4' />
                  </Button>
                ) : null}
                <Button size='icon' variant='ghost' disabled={controlsDisabled} aria-label={state?.paused ? t('music:resumeAria') : t('music:pause')} onClick={() => controlMutation.mutate({ action: state?.paused ? 'resume' : 'pause' })}>
                  {state?.paused ? <Play className='size-5' /> : <Pause className='size-5' />}
                </Button>
                <Button size='icon' variant='ghost' disabled={controlsDisabled || (state?.queue.length ?? 0) === 0} aria-label={t('music:skipAria')} onClick={() => controlMutation.mutate({ action: 'skip' })}>
                  <SkipForward className='size-4' />
                </Button>
                <Button size='icon' variant='ghost' aria-label={t('music:showQueue')} onClick={() => setQueueOpen(true)}>
                  <ListMusic className='size-4' />
                </Button>
                <Button size='icon' variant='ghost' disabled={controlsDisabled} aria-label={t('music:disconnect')} onClick={disconnect}>
                  <Square className='size-4' />
                </Button>
              </div>
              {liveNowPlaying ? (
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span className='size-2 rounded-full bg-red-500' />
                  {t('music:liveStream')}
                </div>
              ) : (
                <div className='flex w-full max-w-xl items-center gap-2 text-xs text-muted-foreground'>
                  <span className='w-10 text-right'>{formatTrackDuration(displayedPositionMs)}</span>
                  <input
                    className={rangeInputClassName}
                    aria-label={t('music:footerTimeline')}
                    type='range'
                    min={0}
                    max={nowPlaying.durationMs || 0}
                    value={displayedPositionMs}
                    disabled={!canSeekNowPlaying || controlMutation.isPending}
                    onChange={(event) => seekTo(Number(event.target.value))}
                  />
                  <span className='w-10'>{formatTrackDuration(nowPlaying.durationMs)}</span>
                </div>
              )}
            </div>
            <div className='hidden min-w-36 items-center gap-2 md:flex'>
              <span className='text-xs text-muted-foreground'>{t('music:volume')}</span>
              <input
                className={rangeInputClassName}
                aria-label={t('music:volume')}
                type='range'
                min={0}
                max={VOLUME_MAX}
                value={volumeValue}
                onChange={(event) => setVolumeValue(clampVolumeValue(Number(event.target.value)))}
                onBlur={commitVolume}
                onPointerUp={commitVolume}
                onKeyUp={(event) => {
                  if (event.key === 'Enter' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') commitVolume()
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{t('music:queueTitle')}</DialogTitle>
            <DialogDescription>{t('music:queueDialogDescription', { count: state?.queue.length ?? 0 })}</DialogDescription>
          </DialogHeader>
          {state?.queue.length ? (
            <>
              <div className='flex flex-wrap gap-2'>
                <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'shuffle' })}>{t('music:shuffle')}</Button>
                <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'removedupes' })}>{t('music:clearDupes')}</Button>
                <Button size='sm' variant='outline' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'clear' })}>{t('music:clear')}</Button>
              </div>
              <ScrollArea className='max-h-[60vh] rounded-md border p-3'>
                <div className='space-y-2'>
                  {state.queue.map((item) => (
                    <div key={item.queueItemId} className='flex items-center gap-3 rounded-lg border bg-background p-3'>
                      <div className='w-8 text-sm text-muted-foreground'>{item.position}</div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{item.title}</div>
                        <div className='truncate text-sm text-muted-foreground'>{item.author || item.source} · {formatTrackDuration(item.durationMs)}</div>
                      </div>
                      <div className='flex flex-wrap justify-end gap-1'>
                        <Button variant='ghost' size='sm' disabled={controlMutation.isPending} onClick={() => controlMutation.mutate({ action: 'skipto', payload: { position: item.position } })}>{t('music:play')}</Button>
                        <Button variant='ghost' size='sm' disabled={removeMutation.isPending || item.position <= 1} onClick={() => moveQueueItem(item.queueItemId, Math.max(1, item.position - 1))}>{t('music:moveUp')}</Button>
                        <Button variant='ghost' size='sm' disabled={removeMutation.isPending || item.position >= state.queue.length} onClick={() => moveQueueItem(item.queueItemId, item.position + 1)}>{t('music:moveDown')}</Button>
                        <Button variant='ghost' size='icon' disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(item.queueItemId)} aria-label={t('music:removeFromQueue')}>
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <p className='rounded-md border p-4 text-sm text-muted-foreground'>{t('music:queueEmpty')}</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={lyricsOpen} onOpenChange={setLyricsOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{lyricsTitle}</DialogTitle>
            <DialogDescription>{t('music:lyricsDialogDescription')}</DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[60vh] rounded-md border p-3'>
            <pre className='whitespace-pre-wrap text-sm leading-6'>{lyricsText}</pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
