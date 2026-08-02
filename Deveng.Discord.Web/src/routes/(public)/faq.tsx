import { createFileRoute } from '@tanstack/react-router'
import { FaqPage } from '@/features/public/faq-page'

export const Route = createFileRoute('/(public)/faq')({
  component: FaqPage,
})
