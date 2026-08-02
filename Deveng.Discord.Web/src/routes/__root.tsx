import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { SeoManager } from '@/components/seo/seo-manager'
import { TermsPrivacyModal } from '@/components/terms-privacy-modal'
import { TermsPrivacyModalProvider, useTermsPrivacyModal } from '@/context/terms-privacy-modal-context'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { useTokenValidator } from '@/hooks/use-token-validator'

// Korunmuş uygulama yolları: /_authenticated/layout (beforeLoad) BFF getSession + hydrate.

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})

function RootContent() {
  useTokenValidator()
  const location = useLocation()
  const { current, openTerms, openPrivacy, close } = useTermsPrivacyModal()
  const isTermsPrivacyRoute =
    location.pathname === '/terms' || location.pathname === '/privacy'
  const showOverlayModal = current !== null && !isTermsPrivacyRoute

  const handleSwitchInOverlay = (type: 'terms' | 'privacy') => {
    if (type === 'terms') openTerms()
    else openPrivacy()
  }

  return (
    <>
      <SeoManager />
      <NavigationProgress />
      <Outlet />
      {showOverlayModal && current && (
        <TermsPrivacyModal
          type={current}
          open={true}
          onOpenChange={(open) => !open && close()}
          onSwitchTo={handleSwitchInOverlay}
          showBackToHome={true}
        />
      )}
      <Toaster duration={5000} />
    </>
  )
}

function RootComponent() {
  return (
    <TermsPrivacyModalProvider>
      <RootContent />
    </TermsPrivacyModalProvider>
  )
}
