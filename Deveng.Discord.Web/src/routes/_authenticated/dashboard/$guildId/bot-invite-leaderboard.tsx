import { createFileRoute } from '@tanstack/react-router'
import { BotInviteLeaderboard } from '@/features/bot-invite-leaderboard'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-invite-leaderboard')({
  component: BotInviteLeaderboard,
})
