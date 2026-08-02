import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-custom-bots')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/$guildId/bot-private-bot',
      params: { guildId: params.guildId },
      replace: true,
    })
  },
})
