import {
  DE,
  FR,
  GB,
  HR,
  KR,
  ME,
  PT,
  RU,
  SA,
  ES,
  TR,
  TW,
} from 'country-flag-icons/react/3x2'
import { LANGUAGE_TO_COUNTRY } from '@/lib/message-languages'

const FLAG_MAP = {
  TR,
  GB,
  DE,
  FR,
  ES,
  PT,
  RU,
  SA,
  TW,
  KR,
  HR,
  ME,
} as const

type CountryCode = keyof typeof FLAG_MAP

interface MessageLanguageFlagProps {
  languageCode: string
  className?: string
  title?: string
}

export function MessageLanguageFlag({
  languageCode,
  className = 'w-6 h-4 rounded object-cover shrink-0',
  title,
}: MessageLanguageFlagProps) {
  const countryCode = LANGUAGE_TO_COUNTRY[languageCode] as CountryCode | undefined
  if (!countryCode || !FLAG_MAP[countryCode]) return null
  const Flag = FLAG_MAP[countryCode]
  return <Flag className={className} title={title ?? undefined} />
}
