import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  ALL_PANEL_LOCALES,
  languageLabels,
  LEGACY_LOCALE_ALIASES,
  type Locale,
} from '@/lib/discord-locales'

const STORAGE_KEY = 'deveng_lang'

export const defaultNS = 'common'
export const supportedLngs = ALL_PANEL_LOCALES
export { languageLabels }
export type { Locale }

const mainModules = import.meta.glob<Record<string, unknown>>('./locales/*.json', {
  eager: true,
  import: 'default',
})
const legalModules = import.meta.glob<Record<string, unknown>>('./locales/legal/*.json', {
  eager: true,
  import: 'default',
})
const panelFaqModules = import.meta.glob<Record<string, unknown>>('./locales/panelFaq/*.json', {
  eager: true,
  import: 'default',
})

function localeFromPath(filePath: string): string {
  const match = filePath.match(/\/([^/]+)\.json$/)
  if (!match) throw new Error(`Invalid locale path: ${filePath}`)
  return match[1]
}

function unwrapLocaleModule(mod: Record<string, unknown>): Record<string, unknown> {
  // Vite JSON glob may yield the bundle directly or under `default`.
  if (mod && typeof mod === 'object' && 'default' in mod && mod.default && typeof mod.default === 'object') {
    const keys = Object.keys(mod)
    if (keys.length === 1 || !('common' in mod || 'nav' in mod)) {
      return mod.default as Record<string, unknown>
    }
  }
  return mod
}

function loadByLocale(
  modules: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const [filePath, mod] of Object.entries(modules)) {
    out[localeFromPath(filePath)] = unwrapLocaleModule(mod)
  }
  return out
}

const mainByLocale = loadByLocale(mainModules)
const legalByLocale = loadByLocale(legalModules)
const panelFaqByLocale = loadByLocale(panelFaqModules)

function withExtras(locale: Locale): Record<string, object> {
  const bundle = mainByLocale[locale]
  if (!bundle) {
    throw new Error(`Missing main locale bundle: ${locale}`)
  }
  return {
    ...bundle,
    legal: legalByLocale[locale] ?? legalByLocale.en,
    panelFaq: panelFaqByLocale[locale] ?? panelFaqByLocale.en,
  } as Record<string, object>
}

function buildResources(): Record<string, Record<string, object>> {
  const resources: Record<string, Record<string, object>> = {}
  for (const locale of supportedLngs) {
    resources[locale] = withExtras(locale)
  }
  for (const [legacy, modern] of Object.entries(LEGACY_LOCALE_ALIASES)) {
    if (resources[modern] && !resources[legacy]) {
      resources[legacy] = resources[modern]
    }
  }
  return resources
}

function resolveStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return 'en'
    if (supportedLngs.includes(stored as Locale)) return stored
    const migrated = LEGACY_LOCALE_ALIASES[stored as keyof typeof LEGACY_LOCALE_ALIASES]
    if (migrated && supportedLngs.includes(migrated as Locale)) return migrated
  } catch {
    /* ignore */
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: buildResources(),
  ns: [
    'common',
    'auth',
    'errors',
    'nav',
    'signOut',
    'tasks',
    'embed',
    'poll',
    'giveaway',
    'ticket',
    'statisticsChannel',
    'customCommand',
    'dashboard',
    'automation',
    'settings',
    'apps',
    'config',
    'terms',
    'privacy',
    'landing',
    'reactionRole',
    'customBots',
    'feeds',
    'level',
    'logChannel',
    'welcome',
    'goodbye',
    'reminder',
    'birthday',
    'reports',
    'locale',
    'aiModeration',
    'autorole',
    'temporaryVoice',
    'scheduledAnnouncement',
    'moderator',
    'music',
    'auditLogs',
    'moderationLogs',
    'inviteLeaderboard',
    'onboarding',
    'signIn',
    'legal',
    'panelFaq',
  ],
  defaultNS,
  lng: resolveStoredLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...supportedLngs, ...Object.keys(LEGACY_LOCALE_ALIASES)],
  nonExplicitSupportedLngs: true,
  load: 'currentOnly',
  interpolation: {
    escapeValue: false,
  },
})

export function setLanguage(lng: Locale): void {
  i18n.changeLanguage(lng)
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
}

export function resolveActiveLocale(
  i18nInstance: { language?: string; resolvedLanguage?: string },
): Locale {
  const raw = i18nInstance.resolvedLanguage || i18nInstance.language || 'en'
  if (supportedLngs.includes(raw as Locale)) return raw as Locale
  const migrated = LEGACY_LOCALE_ALIASES[raw as keyof typeof LEGACY_LOCALE_ALIASES]
  if (migrated) return migrated as Locale
  const base = raw.split('-')[0]
  const match = supportedLngs.find((lng) => lng === raw || lng.startsWith(`${base}-`) || lng === base)
  return (match ?? 'en') as Locale
}

export function isLocaleActive(active: Locale, candidate: Locale): boolean {
  if (active === candidate) return true
  for (const [legacy, modern] of Object.entries(LEGACY_LOCALE_ALIASES)) {
    if ((active === modern && candidate === legacy) || (active === legacy && candidate === modern)) {
      return true
    }
  }
  return false
}

export default i18n
