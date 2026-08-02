import { createFileRoute } from '@tanstack/react-router'
import { BotAutomation } from '@/features/bot-automation'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-automation')({
  component: BotAutomation,
})
