import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/features/public/legal-document-page'

export const Route = createFileRoute('/(public)/gdpr')({
  component: GdprRoute,
})

function GdprRoute() {
  return <LegalDocumentPage docId='gdpr' />
}
