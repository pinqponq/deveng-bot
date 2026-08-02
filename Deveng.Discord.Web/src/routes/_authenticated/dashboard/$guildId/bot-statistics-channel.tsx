import { createFileRoute } from '@tanstack/react-router'
import { BotStatisticsChannel } from '@/features/bot-statistics-channel'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-statistics-channel')({
  component: BotStatisticsChannel,
})
