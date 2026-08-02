import { createFileRoute } from '@tanstack/react-router'
import { BotReports } from '@/features/bot-reports'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-reports')({
  component: BotReports,
})
