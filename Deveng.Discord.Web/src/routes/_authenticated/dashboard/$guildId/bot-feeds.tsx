import { createFileRoute } from '@tanstack/react-router'
import { BotFeeds } from '@/features/bot-feeds'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-feeds')({
  component: BotFeeds,
})
