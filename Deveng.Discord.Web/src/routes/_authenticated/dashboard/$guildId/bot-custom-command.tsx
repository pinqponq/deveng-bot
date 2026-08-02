import { createFileRoute, redirect } from '@tanstack/react-router'
import { BotCustomCommand } from '@/features/bot-custom-command'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-custom-command')({
  beforeLoad: ({ search, params }) => {
    const s = search as Record<string, unknown>
    if (s.view === 'advanced' || s.tab === 'advanced' || s.tab === 'basic') {
      throw redirect({
        to: '/dashboard/$guildId/bot-custom-command',
        params: { guildId: params.guildId },
        search: {},
        replace: true,
      })
    }
  },
  component: BotCustomCommand,
})
