import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/features/public/legal-document-page'

export const Route = createFileRoute('/(public)/copyright')({
  component: CopyrightRoute,
})

function CopyrightRoute() {
  return <LegalDocumentPage docId='copyright' />
}
