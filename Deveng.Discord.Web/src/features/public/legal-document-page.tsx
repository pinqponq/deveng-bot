import { useTranslation } from 'react-i18next'
import { PublicPageShell } from '@/features/public/public-page-shell'

const SECTION_COUNTS = {
  eula: 8,
  copyright: 5,
  cookies: 6,
  gdpr: 7,
  about: 4,
} as const

export type LegalDocId = keyof typeof SECTION_COUNTS

export function LegalDocumentPage({ docId }: { docId: LegalDocId }) {
  const { t } = useTranslation('legal')
  const n = SECTION_COUNTS[docId]

  return (
    <PublicPageShell>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>{t(`${docId}.title`)}</h1>
          <p className='text-sm text-muted-foreground'>{t('public.lastUpdated')}</p>
        </div>
        <p className='text-muted-foreground leading-relaxed'>{t(`${docId}.intro`)}</p>
        <article className='prose prose-neutral dark:prose-invert max-w-none space-y-8'>
          {Array.from({ length: n }, (_, i) => i + 1).map((idx) => (
            <section key={idx} className='space-y-2'>
              <h2 className='text-xl font-semibold text-foreground'>
                {t(`${docId}.s${idx}Title`)}
              </h2>
              <p className='text-muted-foreground leading-relaxed'>
                {t(`${docId}.s${idx}Body`)}
              </p>
            </section>
          ))}
        </article>
      </div>
    </PublicPageShell>
  )
}
