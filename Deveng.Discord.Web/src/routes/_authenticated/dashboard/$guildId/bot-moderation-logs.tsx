import { createFileRoute } from '@tanstack/react-router'
import { BotModerationLogs } from '@/features/bot-moderation-logs'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-moderation-logs')({
  component: BotModerationLogs,
})
