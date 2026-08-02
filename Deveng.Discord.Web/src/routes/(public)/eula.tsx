import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/features/public/legal-document-page'

export const Route = createFileRoute('/(public)/eula')({
  component: EulaRoute,
})

function EulaRoute() {
  return <LegalDocumentPage docId='eula' />
}
