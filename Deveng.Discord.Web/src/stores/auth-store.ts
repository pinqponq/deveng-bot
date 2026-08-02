import { create } from 'zustand'
import { authApi, type BffSessionResponse } from '@/lib/api'
import { normalizeDiscordGuildId } from '@/utils/discord-guild-id'

// Access token BFF session'ında (HttpOnly). localStorage'da yalnızca seçili guild id saklanır; profil/guild listesi bellekte.
const SELECTED_GUILD_ID_KEY = 'devbot_selected_guild_id'
const SELECTED_BOT_CLIENT_ID_KEY = 'selectedBotClientId'

const getLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.error(`Error reading localStorage key ${key}:`, e)
    return null
  }
}

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.error(`Error writing localStorage key ${key}:`, e)
  }
}

const removeLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error(`Error removing localStorage key ${key}:`, e)
  }
}

interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
  discord?: {
    id: string
    username: string
    discriminator: string
    avatar: string | null
    avatarUrl?: string
    globalName?: string
    verified?: boolean
    guilds?: Array<{
      id: string
      name: string
      icon: string | null
      iconUrl?: string
      permissions?: number | string
      owner?: boolean
    }>
  }
}

interface SelectedGuild {
  id: string
  name: string
  icon: string | null
  iconUrl?: string | undefined
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    hydrateFromSession: (data: BffSessionResponse) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    selectedGuild: SelectedGuild | null
    setSelectedGuild: (guild: SelectedGuild | null) => void
    selectedBotClientId: string | null
    setSelectedBotClientId: (clientId: string | null) => void
    checkTokenExpiry: () => boolean
    validateTokenWithAPI: () => Promise<boolean>
    refreshToken: () => Promise<boolean>
  }
}

function isTokenExpired(user: AuthUser | null): boolean {
  if (!user || !user.exp) return true
  return Date.now() >= user.exp
}

function mapBffSessionToUser(data: BffSessionResponse): AuthUser | null {
  if (!data.user || !data.guilds || data.expiresAt == null) return null
  const u = data.user
  const emailTrimmed =
    typeof u.email === 'string' && u.email.trim() !== '' ? u.email.trim() : ''
  const avatarUrl =
    u.avatarUrl ||
    (u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(u.discriminator || '0', 10) % 5}.png`)

  return {
    accountNo: u.id,
    email: emailTrimmed,
    role: ['user'],
    exp: data.expiresAt,
    discord: {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator,
      avatar: u.avatar,
      avatarUrl,
      globalName: u.globalName || undefined,
      guilds: data.guilds
        .map((g) => {
          const id = normalizeDiscordGuildId(g.id)
          if (!id) return null
          return {
            id,
            name: g.name,
            icon: g.icon,
            iconUrl:
              g.iconUrl ||
              (g.icon ? `https://cdn.discordapp.com/icons/${id}/${g.icon}.png?size=256` : undefined),
            permissions: g.permissions,
            owner: g.owner,
          }
        })
        .filter((g): g is NonNullable<typeof g> => g != null),
    },
  }
}

function loadSelectedGuildFromStorage(): SelectedGuild | null {
  try {
    removeLocalStorage('devbot_user_data')
  } catch {
    /* yok */
  }
  const gidRaw = getLocalStorage(SELECTED_GUILD_ID_KEY)
  if (gidRaw) {
    const gid = normalizeDiscordGuildId(gidRaw)
    if (!gid) {
      removeLocalStorage(SELECTED_GUILD_ID_KEY)
      return null
    }
    return { id: gid, name: '', icon: null }
  }
  const legacy = getLocalStorage('devbot_selected_guild')
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as { id?: string; name?: string; icon?: string | null; iconUrl?: string }
      removeLocalStorage('devbot_selected_guild')
      if (parsed?.id) {
        const nid = normalizeDiscordGuildId(parsed.id)
        if (!nid) return null
        setLocalStorage(SELECTED_GUILD_ID_KEY, nid)
        return {
          id: nid,
          name: parsed.name || '',
          icon: parsed.icon ?? null,
          iconUrl: parsed.iconUrl,
        }
      }
    } catch {
      removeLocalStorage('devbot_selected_guild')
    }
  }
  return null
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initGuild = loadSelectedGuildFromStorage()

  return {
    auth: {
      user: null,
      hydrateFromSession: (data: BffSessionResponse) => {
        const user = mapBffSessionToUser(data)
        set((state) => {
          const prevUser = state.auth.user
          const isSameUser = user && prevUser && user.accountNo === prevUser.accountNo
          const incomingGuildsEmpty = !data.guilds || data.guilds.length === 0
          const prevGuildsFull = prevUser?.discord?.guilds && prevUser.discord.guilds.length > 0
          const mergedUser =
            user && isSameUser && incomingGuildsEmpty && prevGuildsFull
              ? { ...user, discord: { ...user.discord!, guilds: prevUser!.discord!.guilds! } }
              : user
          return { ...state, auth: { ...state.auth, user: mergedUser } }
        })
      },
      setUser: (user) =>
        set((state) => {
          if (!user) {
            removeLocalStorage(SELECTED_GUILD_ID_KEY)
            removeLocalStorage(SELECTED_BOT_CLIENT_ID_KEY)
            return {
              ...state,
              auth: { ...state.auth, user: null, selectedGuild: null, selectedBotClientId: null },
            }
          }
          return { ...state, auth: { ...state.auth, user, selectedGuild: state.auth.selectedGuild } }
        }),
      accessToken: '',
      setAccessToken: (accessToken) =>
        set((state) => ({ ...state, auth: { ...state.auth, accessToken } })),
      resetAccessToken: () =>
        set((state) => ({ ...state, auth: { ...state.auth, accessToken: '' } })),
      reset: () =>
        set((state) => {
          removeLocalStorage(SELECTED_GUILD_ID_KEY)
          removeLocalStorage(SELECTED_BOT_CLIENT_ID_KEY)
          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              accessToken: '',
              selectedGuild: null,
              selectedBotClientId: null,
            },
          }
        }),
      selectedGuild: initGuild,
      setSelectedGuild: (guild) =>
        set((state) => {
          if (guild) {
            const nid = normalizeDiscordGuildId(guild.id)
            if (!nid) {
              removeLocalStorage(SELECTED_GUILD_ID_KEY)
              return { ...state, auth: { ...state.auth, selectedGuild: null } }
            }
            setLocalStorage(SELECTED_GUILD_ID_KEY, nid)
            return {
              ...state,
              auth: {
                ...state.auth,
                selectedGuild: nid === guild.id ? guild : { ...guild, id: nid },
              },
            }
          }
          removeLocalStorage(SELECTED_GUILD_ID_KEY)
          return { ...state, auth: { ...state.auth, selectedGuild: null } }
        }),
      selectedBotClientId: null,
      setSelectedBotClientId: (clientId) =>
        set((state) => ({ ...state, auth: { ...state.auth, selectedBotClientId: clientId } })),
      checkTokenExpiry: () => {
        const state = get()
        const isValid = !isTokenExpired(state.auth.user)
        if (!isValid && state.auth.user) {
          state.auth.reset()
        }
        return isValid
      },
      validateTokenWithAPI: async () => {
        const state = get()
        try {
          const session = await authApi.getSession()
          if (!session.authenticated || !session.user) {
            state.auth.reset()
            return false
          }
          state.auth.hydrateFromSession(session)
          return true
        } catch (error) {
          console.error('Token validation error:', error)
          state.auth.reset()
          return false
        }
      },
      refreshToken: async () => {
        const state = get()
        if (!state.auth.user) {
          return false
        }

        try {
          const result = await authApi.refreshToken()

          if (!result.valid || !result.expiresAt) {
            state.auth.reset()
            return false
          }

          if (state.auth.user) {
            const updatedUser = {
              ...state.auth.user,
              exp: result.expiresAt,
            }
            state.auth.setUser(updatedUser)
          }

          return true
        } catch (error) {
          console.error('Token refresh error:', error)
          state.auth.reset()
          return false
        }
      },
    },
  }
})
