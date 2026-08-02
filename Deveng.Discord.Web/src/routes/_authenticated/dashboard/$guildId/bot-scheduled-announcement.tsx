import { createFileRoute } from '@tanstack/react-router'
import { BotScheduledAnnouncement } from '@/features/bot-scheduled-announcement'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-scheduled-announcement')({
  component: BotScheduledAnnouncement,
})
