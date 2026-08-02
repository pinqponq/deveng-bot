import { createFileRoute } from '@tanstack/react-router'
import { Welcome } from '@/features/welcome'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/welcome')({
  component: Welcome,
})
