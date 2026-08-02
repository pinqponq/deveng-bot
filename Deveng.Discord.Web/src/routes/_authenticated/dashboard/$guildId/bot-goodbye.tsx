import { createFileRoute } from '@tanstack/react-router'
import { BotGoodbye } from '@/features/bot-goodbye'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-goodbye')({
  component: BotGoodbye,
})
