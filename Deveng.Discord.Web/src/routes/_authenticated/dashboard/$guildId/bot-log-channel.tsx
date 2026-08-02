import { createFileRoute } from '@tanstack/react-router'
import { BotLogChannel } from '@/features/bot-log-channel'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-log-channel')({
  component: BotLogChannel,
})
