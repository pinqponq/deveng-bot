import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TermsPrivacyModal } from '@/components/terms-privacy-modal'

export const Route = createFileRoute('/(public)/terms')({
  component: TermsPage,
})

function TermsPage() {
  const navigate = useNavigate()

  const handleOpenChange = (open: boolean) => {
    if (!open) navigate({ to: '/sign-in' })
  }

  const handleSwitchTo = (type: 'terms' | 'privacy') => {
    navigate({ to: type === 'terms' ? '/terms' : '/privacy' })
  }

  return (
    <TermsPrivacyModal
      type='terms'
      open={true}
      onOpenChange={handleOpenChange}
      onSwitchTo={handleSwitchTo}
      showBackToHome={true}
    />
  )
}
