import { createFileRoute } from '@tanstack/react-router'
import { BotPoll } from '@/features/bot-poll'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-poll')({
  component: BotPoll,
})
