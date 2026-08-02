import { DEFAULT_BOT_INVITE_PERMISSIONS } from '@/lib/discord-bot-invite-permissions'

/**
 * Public ayarlar: build sırasında veya `server.js` ile index.html'e enjekte edilir (window.__CONFIG__).
 * Kaynak: .env / .env.local — PUBLIC_* ve DISCORD_CLIENT_ID.
 */

export interface PublicConfig {
  apiUrl?: string
  panelBaseUrl?: string
  discordClientId?: string
  clerkPublishableKey?: string
  /** Cloudflare Turnstile — site key (gizli anahtar sunucuda TURNSTILE_SECRET_KEY) */
  turnstileSiteKey?: string
}

function getConfig(): PublicConfig {
  if (typeof window !== 'undefined' && (window as unknown as { __CONFIG__?: PublicConfig }).__CONFIG__) {
    return (window as unknown as { __CONFIG__: PublicConfig }).__CONFIG__
  }
  return {}
}

const config = getConfig()

/** API base URL - boş = same-origin (panel nerede açıksa oraya istek). Web sadece API'ye gider; Bot'a API üzerinden proxy ile gidilir. */
export const API_BASE_URL = typeof config.apiUrl === 'string' && config.apiUrl.length > 0 ? config.apiUrl : ''

/** Panel base URL (OAuth redirect vb.) */
export const PANEL_BASE_URL = typeof config.panelBaseUrl === 'string' && config.panelBaseUrl.length > 0 ? config.panelBaseUrl : (typeof window !== 'undefined' ? window.location.origin : '')

/** Discord OAuth client id */
export const DISCORD_CLIENT_ID = typeof config.discordClientId === 'string' && config.discordClientId.length > 0 ? config.discordClientId : ''

/** Clerk publishable key (opsiyonel) */
export const CLERK_PUBLISHABLE_KEY = typeof config.clerkPublishableKey === 'string' && config.clerkPublishableKey.length > 0 ? config.clerkPublishableKey : ''

/** Turnstile site key (opsiyonel; tanımlıysa OAuth callback öncesi widget gösterilir) */
export const TURNSTILE_SITE_KEY =
  typeof config.turnstileSiteKey === 'string' && config.turnstileSiteKey.length > 0
    ? config.turnstileSiteKey
    : ''

/** Bot'u sunucuya ekleme davet linki (guildId verilirse o sunucu önceden seçilir) */
export function getBotInviteUrl(guildId?: string): string {
  const base = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${DEFAULT_BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`
  return guildId ? `${base}&guild_id=${guildId}` : base
}
