import { createFileRoute } from '@tanstack/react-router'
import { BotEmbedMessage } from '@/features/bot-embed-message'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-embed-message')({
  component: BotEmbedMessage,
})
