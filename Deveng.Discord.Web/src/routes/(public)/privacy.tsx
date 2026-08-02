import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PublicPageShell } from '@/features/public/public-page-shell'

export const Route = createFileRoute('/(public)/privacy')({
  component: PrivacyPage,
})

const SECTION_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

function PrivacyPage() {
  const { t } = useTranslation('privacy')
  const { t: tl } = useTranslation('legal')

  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('lastUpdated')}</p>
        </header>

        <div className='space-y-6'>
          {SECTION_INDEXES.map((n) => (
            <section key={n} className='space-y-2'>
              <h2 className='text-xl font-semibold'>{t(`section${n}Title`)}</h2>
              <p className='text-sm leading-relaxed text-muted-foreground'>{t(`section${n}Content`)}</p>
            </section>
          ))}
        </div>

        <section className='space-y-2 border-t pt-6'>
          <h2 className='text-xl font-semibold'>{t('relatedDocsHeading')}</h2>
          <ul className='ml-5 list-disc space-y-1 text-sm leading-relaxed'>
            <li>
              <Link to='/terms' className='text-primary hover:underline'>
                {t('termsLink')}
              </Link>
            </li>
            <li>
              <Link to='/eula' className='text-primary hover:underline'>
                {tl('footer.eulaShort')}
              </Link>
            </li>
            <li>
              <Link to='/gdpr' className='text-primary hover:underline'>
                {t('linkGdprNotice')}
              </Link>
            </li>
            <li>
              <Link to='/cookies' className='text-primary hover:underline'>
                {t('linkCookiesPolicy')}
              </Link>
            </li>
          </ul>
        </section>

        <section className='space-y-2'>
          <h2 className='text-xl font-semibold'>{t('contactHeading')}</h2>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            <a href={`mailto:${t('privacyContactEmail')}`} className='text-primary underline'>
              {t('privacyContactEmail')}
            </a>
          </p>
        </section>
      </article>
    </PublicPageShell>
  )
}
