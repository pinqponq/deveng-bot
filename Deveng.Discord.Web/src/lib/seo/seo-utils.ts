import { PANEL_BASE_URL } from '@/lib/env'

export const SEO_SITE_NAME = 'Deveng'
export const SEO_PRODUCT_NAME = 'Deveng Bot'
export const SEO_THEME_COLOR = '#5865F2'
export const SEO_DEFAULT_BASE_URL = 'https://deveng.app'
export const SEO_DEFAULT_OG_IMAGE = '/images/og/default.svg'
export const SEO_DEFAULT_DESCRIPTION =
  'Deveng Bot is an all-in-one Discord bot and web dashboard for moderation, tickets, music, polls, roles, automations, and community management.'

const DESCRIPTION_MAX_LENGTH = 160
const DESCRIPTION_MIN_LENGTH = 50

export function formatSeoTitle(pageName: string): string {
  const normalized = pageName.trim()
  if (!normalized || normalized === SEO_PRODUCT_NAME) return SEO_PRODUCT_NAME
  return `${normalized} | ${SEO_PRODUCT_NAME}`
}

export function normalizeSeoText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function truncateAtWordBoundary(value: string): string {
  const normalized = normalizeSeoText(value)
  if (normalized.length <= DESCRIPTION_MAX_LENGTH) return normalized

  const clipped = normalized.slice(0, DESCRIPTION_MAX_LENGTH + 1)
  const lastSpace = clipped.lastIndexOf(' ')
  const safe = (lastSpace > 120 ? clipped.slice(0, lastSpace) : clipped.slice(0, DESCRIPTION_MAX_LENGTH)).trim()
  return safe.replace(/[,.!?;:]+$/, '') + '...'
}

export function createSeoDescription(
  candidates: string[],
  fallback = SEO_DEFAULT_DESCRIPTION,
): string {
  const combined = normalizeSeoText(candidates.filter(Boolean).join(' '))
  if (combined.length < DESCRIPTION_MIN_LENGTH) return truncateAtWordBoundary(fallback)
  return truncateAtWordBoundary(combined)
}

export function getSeoBaseUrl(explicitBaseUrl?: string): string {
  const candidate =
    explicitBaseUrl ||
    PANEL_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    SEO_DEFAULT_BASE_URL

  try {
    return new URL(candidate).origin
  } catch {
    return SEO_DEFAULT_BASE_URL
  }
}

export function toAbsoluteUrl(pathOrUrl: string, explicitBaseUrl?: string): string {
  try {
    return new URL(pathOrUrl).toString()
  } catch {
    const baseUrl = getSeoBaseUrl(explicitBaseUrl)
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `${baseUrl}${path}`
  }
}

export function normalizePathname(pathname: string): string {
  const raw = pathname.split('?')[0]?.split('#')[0] || '/'
  const normalized = raw.length > 1 ? raw.replace(/\/+$/, '') : raw
  return normalized || '/'
}
