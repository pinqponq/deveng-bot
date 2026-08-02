import { createFileRoute } from '@tanstack/react-router'
import { BotModerator } from '@/features/bot-moderator'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-moderator')({
  component: BotModerator,
})
