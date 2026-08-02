/**
 * Script-side mirror of src/lib/discord-locales.ts
 */
export const DISCORD_LOCALES = [
  'en', 'hu', 'cs', 'ko', 'it', 'nl', 'uk', 'vi', 'pl', 'de', 'pt-BR', 'th', 'tr', 'ro',
  'zh-TW', 'ru', 'es-419', 'es-ES', 'fr', 'sv', 'zh-CN', 'ja',
]

export const EXTRA_LOCALES = ['ar', 'hr', 'cnr']

export const LEGACY_LOCALE_ALIASES = {
  es: 'es-ES',
  pt: 'pt-BR',
  zh: 'zh-TW',
}

export const ALL_PANEL_LOCALES = [...DISCORD_LOCALES, ...EXTRA_LOCALES]

/** Hand-maintained legal bodies — also auto-detected in sync-legal-from-en.ts via eula.intro !== en */
export const LEGAL_BODY_LOCALES = ['tr', 'fr', 'de']

export const localeBootstrapSource = {
  'es-ES': 'es',
  'es-419': 'es',
  'pt-BR': 'pt',
  'zh-TW': 'zh',
  'zh-CN': 'en',
}
