import { createFileRoute } from '@tanstack/react-router'
import { BotReactionRole } from '@/features/bot-reaction-role'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-reaction-role')({
  component: BotReactionRole,
})
