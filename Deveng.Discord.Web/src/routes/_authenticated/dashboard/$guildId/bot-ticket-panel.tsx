import { createFileRoute } from '@tanstack/react-router'
import { BotTicketPanel } from '@/features/bot-ticket-panel'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-ticket-panel')({
  component: BotTicketPanel,
})
