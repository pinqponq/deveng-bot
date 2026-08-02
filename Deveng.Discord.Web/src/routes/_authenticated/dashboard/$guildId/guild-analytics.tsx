import { createFileRoute } from '@tanstack/react-router'
import { GuildAnalyticsPage } from '@/features/guild-analytics-page'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/guild-analytics')({
  component: GuildAnalyticsPage,
})
