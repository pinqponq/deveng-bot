import { createFileRoute } from '@tanstack/react-router'
import { GuildTicketsPage } from '@/features/guild-tickets-page'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/tickets')({
  component: GuildTicketsPage,
})
