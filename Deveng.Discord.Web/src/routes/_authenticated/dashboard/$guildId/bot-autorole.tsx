import { createFileRoute } from '@tanstack/react-router'
import { BotAutoRole } from '@/features/bot-autorole'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-autorole')({
  component: BotAutoRole,
})
