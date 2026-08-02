import { createFileRoute } from '@tanstack/react-router'
import { BotWelcome } from '@/features/bot-welcome'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-welcome')({
  component: BotWelcome,
})
