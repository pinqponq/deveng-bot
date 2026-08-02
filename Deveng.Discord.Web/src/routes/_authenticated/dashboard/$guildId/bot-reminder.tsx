import { createFileRoute } from '@tanstack/react-router'
import { BotReminder } from '@/features/bot-reminder'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-reminder')({
  component: BotReminder,
})
