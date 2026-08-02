import { createFileRoute } from '@tanstack/react-router'
import { BotGiveaway } from '@/features/bot-giveaway'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-giveaway')({
  component: BotGiveaway,
})
