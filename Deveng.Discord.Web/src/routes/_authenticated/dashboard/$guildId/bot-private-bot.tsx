import { createFileRoute } from '@tanstack/react-router'
import { CustomBots } from '@/features/custom-bots'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-private-bot')({
  component: CustomBots,
})
