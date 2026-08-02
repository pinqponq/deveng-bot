import { createFileRoute } from '@tanstack/react-router'
import { BotBirthday } from '@/features/bot-birthday'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-birthday')({
  component: BotBirthday,
})
