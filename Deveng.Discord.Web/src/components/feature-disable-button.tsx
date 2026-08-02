import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useFeatureStatus } from '@/hooks/use-feature-status'
import { Loader2, PowerOff } from 'lucide-react'

type FeatureDisableButtonProps = {
  guildId: string
  featureName: string
  featureDisplayName: string
  confirmDescription: string
  className?: string
}

export function FeatureDisableButton({
  guildId,
  featureName,
  featureDisplayName,
  confirmDescription,
  className,
}: FeatureDisableButtonProps) {
  const { t } = useTranslation('common')
  const { disable, isDisabling } = useFeatureStatus(guildId, featureName)
  const [showDisableConfirm, setShowDisableConfirm] = React.useState(false)

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        className={`shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive ${className ?? ''}`}
        onClick={() => setShowDisableConfirm(true)}
        disabled={isDisabling}
      >
        {isDisabling ? <Loader2 className='size-4 animate-spin' /> : <PowerOff className='size-4' />}
        <span className='ml-1.5'>{t('featureDisableButton')}</span>
      </Button>
      <ConfirmDialog
        open={showDisableConfirm}
        onOpenChange={setShowDisableConfirm}
        title={t('featureDisableTitle')}
        desc={t('featureDisableDescription', { feature: featureDisplayName, extra: confirmDescription })}
        cancelBtnText={t('cancel')}
        confirmText={isDisabling ? t('featureDisableConfirming') : t('featureDisableConfirm')}
        destructive
        isLoading={isDisabling}
        handleConfirm={() => {
          disable()
          setShowDisableConfirm(false)
        }}
      />
    </>
  )
}
