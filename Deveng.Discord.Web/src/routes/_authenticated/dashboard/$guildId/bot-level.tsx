import { createFileRoute } from '@tanstack/react-router'
import { BotLevel } from '@/features/bot-level'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-level')({
  component: BotLevel,
})
