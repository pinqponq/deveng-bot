import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useFeatureStatus } from './use-feature-status'
import { FeatureEnableDialog } from '@/components/feature-enable-dialog'
import { Main } from '@/components/layout/main'
import { Loader2 } from 'lucide-react'

interface UseFeatureGateOptions {
  guildId: string
  featureName: string
  featureDisplayName: string
}

export function useFeatureGate({ guildId, featureName, featureDisplayName }: UseFeatureGateOptions) {
  const navigate = useNavigate()
  const [showEnableDialog, setShowEnableDialog] = React.useState(false)
  const closedDueToEnableRef = React.useRef(false)
  /** Önceki özellik durumu; açıkken kapatılınca (Özelliği kapat) dashboard'a yönlendirmek için */
  const prevFeatureEnabledRef = React.useRef<boolean | undefined>(undefined)
  const { isEnabled: isFeatureEnabled, isLoading: isFeatureLoading } = useFeatureStatus(guildId, featureName)

  // İlk yüklemede kapalıysa etkinleştir modalı; bu oturumda açıkken kapatıldıysa dashboard
  React.useEffect(() => {
    if (!guildId || isFeatureLoading) return

    const prev = prevFeatureEnabledRef.current

    if (prev === true && isFeatureEnabled === false) {
      prevFeatureEnabledRef.current = false
      navigate({ to: '/dashboard/$guildId', params: { guildId }, replace: true })
      return
    }

    prevFeatureEnabledRef.current = isFeatureEnabled

    if (prev === undefined && !isFeatureEnabled) {
      setShowEnableDialog(true)
    }
  }, [guildId, isFeatureLoading, isFeatureEnabled, navigate])

  // İptal veya dialog kapatıldığında özellik hâlâ kapalıysa dashboard'a yönlendir. Etkinleştir başarılı olduğunda yönlendirme.
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        if (closedDueToEnableRef.current) {
          closedDueToEnableRef.current = false
          setShowEnableDialog(false)
          return
        }
        if (!isFeatureEnabled) {
          navigate({ to: '/dashboard/$guildId', params: { guildId } })
        }
      }
      setShowEnableDialog(open)
    },
    [navigate, guildId, isFeatureEnabled]
  )

  // Özellik kapalıysa asla sayfa içeriği gösterme; sadece modal göster (iptal'de yönlendirilecek)
  const renderFeatureGate = (children: React.ReactNode) => {
    if (guildId && !isFeatureLoading && !isFeatureEnabled) {
      return (
        <Main>
          <FeatureEnableDialog
            open={showEnableDialog}
            onOpenChange={handleOpenChange}
            guildId={guildId}
            featureName={featureName}
            featureDisplayName={featureDisplayName}
            onEnabled={() => {
              closedDueToEnableRef.current = true
              setShowEnableDialog(false)
            }}
          />
        </Main>
      )
    }

    // Loading durumu — üst çerçeve `AuthenticatedLayout` zaten Header + Search içerir; tekrar ekleme.
    if (isFeatureLoading) {
      return (
        <Main>
          <div className='flex min-h-[60vh] items-center justify-center'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      )
    }

    // Özellik açıksa normal içeriği göster
    return children
  }

  return {
    isFeatureEnabled,
    isFeatureLoading,
    renderFeatureGate,
  }
}
