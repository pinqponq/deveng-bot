/**
 * Discord client language list (22) + extra panel locales (ar, hr, cnr).
 */
export const DISCORD_LOCALES = [
  'en',
  'hu',
  'cs',
  'ko',
  'it',
  'nl',
  'uk',
  'vi',
  'pl',
  'de',
  'pt-BR',
  'th',
  'tr',
  'ro',
  'zh-TW',
  'ru',
  'es-419',
  'es-ES',
  'fr',
  'sv',
  'zh-CN',
  'ja',
] as const

export const EXTRA_LOCALES = ['ar', 'hr', 'cnr'] as const

/** @deprecated kept for localStorage / bot guild settings */
export const LEGACY_LOCALE_ALIASES = {
  es: 'es-ES',
  pt: 'pt-BR',
  zh: 'zh-TW',
} as const

export const ALL_PANEL_LOCALES = [...DISCORD_LOCALES, ...EXTRA_LOCALES] as const

export type Locale = (typeof ALL_PANEL_LOCALES)[number]

export const languageLabels: Record<Locale, string> = {
  en: 'English (US)',
  hu: 'Magyar',
  cs: '\u010Ce\u0161tina',
  ko: '\uD55C\uAD6D\uC5B4',
  it: 'Italiano',
  nl: 'Nederlands',
  uk: '\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430',
  vi: 'Ti\u1EBFng Vi\u1EC7t',
  pl: 'Polski',
  de: 'Deutsch',
  'pt-BR': 'Portugu\u00EAs (Brasil)',
  th: '\u0E44\u0E17\u0E22',
  tr: 'T\u00FCrk\u00E7e',
  ro: 'Rom\u00E2n\u0103',
  'zh-TW': '\u7E41\u9AD4\u4E2D\u6587',
  ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
  'es-419': 'Espa\u00F1ol (Latinoam\u00E9rica)',
  'es-ES': 'Espa\u00F1ol (Espa\u00F1a)',
  fr: 'Fran\u00E7ais',
  sv: 'Svenska',
  'zh-CN': '\u7B80\u4F53\u4E2D\u6587',
  ja: '\u65E5\u672C\u8A9E',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
  hr: 'Hrvatski',
  cnr: 'Crnogorski',
}

export const localeBootstrapSource: Partial<Record<Locale, string>> = {
  'es-ES': 'es',
  'es-419': 'es',
  'pt-BR': 'pt',
  'zh-TW': 'zh',
  'zh-CN': 'en',
}

/** Discord locale string -> panel locale */
export const DISCORD_LOCALE_MAP: Record<string, Locale> = {
  en: 'en',
  'en-us': 'en',
  hu: 'hu',
  cs: 'cs',
  ko: 'ko',
  it: 'it',
  nl: 'nl',
  uk: 'uk',
  vi: 'vi',
  pl: 'pl',
  de: 'de',
  'pt-br': 'pt-BR',
  pt: 'pt-BR',
  th: 'th',
  tr: 'tr',
  ro: 'ro',
  'zh-tw': 'zh-TW',
  zh: 'zh-TW',
  ru: 'ru',
  'es-419': 'es-419',
  'es-la': 'es-419',
  'es-es': 'es-ES',
  es: 'es-ES',
  fr: 'fr',
  sv: 'sv',
  'zh-cn': 'zh-CN',
  ja: 'ja',
  ar: 'ar',
  hr: 'hr',
  cnr: 'cnr',
}

export function normalizePanelLocale(locale?: string | null): Locale {
  const normalized = locale?.trim().toLowerCase() ?? ''
  const mapped = DISCORD_LOCALE_MAP[normalized]
  if (mapped) return mapped
  if (ALL_PANEL_LOCALES.includes(normalized as Locale)) return normalized as Locale
  const base = normalized.split('-')[0]
  const baseMapped = DISCORD_LOCALE_MAP[base]
  if (baseMapped) return baseMapped
  return 'en'
}
