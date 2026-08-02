import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/features/public/legal-document-page'

export const Route = createFileRoute('/(public)/about')({
  component: AboutRoute,
})

function AboutRoute() {
  return <LegalDocumentPage docId='about' />
}
