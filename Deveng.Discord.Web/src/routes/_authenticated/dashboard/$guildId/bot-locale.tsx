import { createFileRoute } from '@tanstack/react-router'
import { BotLocale } from '@/features/bot-locale'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-locale')({
  component: BotLocale,
})
