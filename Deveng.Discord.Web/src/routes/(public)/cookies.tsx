import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/features/public/legal-document-page'

export const Route = createFileRoute('/(public)/cookies')({
  component: CookiesRoute,
})

function CookiesRoute() {
  return <LegalDocumentPage docId='cookies' />
}
