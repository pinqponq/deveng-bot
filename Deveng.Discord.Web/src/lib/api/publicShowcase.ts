import { API_BASE_URL } from '@/lib/env'
import type { ShowcaseGuildsPayload } from './types'

function apiBase(): string {
  const u = (API_BASE_URL || '').replace(/\/$/, '')
  if (u) return u
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/** Anonim — oturum gerekmez. Panel ve API aynı origin değilse CORS (API) tarafı izin listesinde olmalı. */
export async function fetchShowcaseGuilds(): Promise<ShowcaseGuildsPayload> {
  const res = await fetch(`${apiBase()}/api/public/showcase-guilds`, {
    method: 'GET',
    credentials: 'omit',
  })
  if (!res.ok) {
    return {
      updatedAt: null,
      totalGuilds: 0,
      totalMembersApprox: 0,
      guilds: [],
    }
  }
  return res.json() as Promise<ShowcaseGuildsPayload>
}
