import { createFileRoute } from '@tanstack/react-router'
import { SecurityPublicPage } from '@/features/public/security-public-page'

export const Route = createFileRoute('/(public)/security')({
  component: SecurityPublicPage,
})
