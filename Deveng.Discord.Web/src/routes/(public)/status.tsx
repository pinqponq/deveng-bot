import { createFileRoute } from '@tanstack/react-router'
import { StatusPublicPage } from '@/features/public/status-public-page'

export const Route = createFileRoute('/(public)/status')({
  component: StatusPublicPage,
})
