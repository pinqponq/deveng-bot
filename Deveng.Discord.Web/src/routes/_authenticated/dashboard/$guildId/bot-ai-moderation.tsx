import { createFileRoute } from '@tanstack/react-router'
import { BotAIModeration } from '@/features/bot-ai-moderation'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-ai-moderation')({
  component: BotAIModeration,
})
