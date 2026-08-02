import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import type { TermsPrivacyType } from '@/context/terms-privacy-modal-context'

type TermsPrivacyModalProps = {
  type: TermsPrivacyType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchTo?: (type: TermsPrivacyType) => void
  showBackToHome?: boolean
}

const SECTION_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8] as const

function TermsContent() {
  const { t } = useTranslation('terms')
  return (
    <>
      <p className='mb-6 text-muted-foreground text-sm'>{t('lastUpdated')}</p>
      <article className='prose prose-neutral dark:prose-invert max-w-none space-y-6'>
        {SECTION_INDEXES.map((n) => (
          <section key={n}>
            <h2 className='text-xl font-semibold'>{t(`section${n}Title`)}</h2>
            <p className='text-muted-foreground leading-relaxed'>
              {t(`section${n}Content`)}
            </p>
          </section>
        ))}
      </article>
    </>
  )
}

function PrivacyContent() {
  const { t } = useTranslation('privacy')
  return (
    <>
      <p className='mb-6 text-muted-foreground text-sm'>{t('lastUpdated')}</p>
      <article className='prose prose-neutral dark:prose-invert max-w-none space-y-6'>
        {SECTION_INDEXES.map((n) => (
          <section key={n}>
            <h2 className='text-xl font-semibold'>{t(`section${n}Title`)}</h2>
            <p className='text-muted-foreground leading-relaxed'>
              {t(`section${n}Content`)}
            </p>
          </section>
        ))}
      </article>
    </>
  )
}

export function TermsPrivacyModal({
  type,
  open,
  onOpenChange,
  onSwitchTo,
  showBackToHome = true,
}: TermsPrivacyModalProps) {
  const { t: tTerms } = useTranslation('terms')
  const { t: tPrivacy } = useTranslation('privacy')

  const title = type === 'terms' ? tTerms('title') : tPrivacy('title')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90vh] max-w-3xl overflow-hidden flex flex-col'
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className='text-2xl'>{title}</DialogTitle>
        </DialogHeader>
        <div className='overflow-y-auto flex-1 pr-2 -mr-2'>
          {type === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
        <div className='flex flex-wrap gap-3 pt-4 border-t mt-4'>
          {onSwitchTo && (
            <>
              {type === 'terms' ? (
                <button
                  type='button'
                  onClick={() => onSwitchTo('privacy')}
                  className='text-sm font-medium text-primary hover:underline'
                >
                  {tTerms('privacyLink')}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => onSwitchTo('terms')}
                  className='text-sm font-medium text-primary hover:underline'
                >
                  {tPrivacy('termsLink')}
                </button>
              )}
            </>
          )}
          {showBackToHome && (
            <button
              type='button'
              onClick={() => onOpenChange(false)}
              className='text-sm font-medium text-primary hover:underline'
            >
              {type === 'terms' ? tTerms('backToHome') : tPrivacy('backToHome')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
