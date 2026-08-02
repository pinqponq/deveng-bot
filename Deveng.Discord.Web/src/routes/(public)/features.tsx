import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LANDING_FEATURES } from '@/features/public/landing-content'
import { PublicPageShell } from '@/features/public/public-page-shell'

export const Route = createFileRoute('/(public)/features')({
  component: FeaturesPage,
})

function FeaturesPage() {
  const { t } = useTranslation('landing')

  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('featuresPageTitle')}</h1>
          <p className='text-muted-foreground leading-relaxed'>{t('featuresPageSubtitle')}</p>
        </header>

        <section aria-labelledby='features-heading' className='space-y-4'>
          <h2 id='features-heading' className='text-xl font-semibold'>
            {t('featuresModulesHeading')}
          </h2>
          <dl className='grid gap-4 sm:grid-cols-2'>
            {LANDING_FEATURES.map((feature) => (
              <div key={feature.slug} className='rounded-lg border bg-card/50 p-4'>
                <dt className='font-semibold'>{t(feature.titleKey)}</dt>
                <dd className='mt-2 text-sm leading-relaxed text-muted-foreground'>
                  {t(feature.descKey)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </PublicPageShell>
  )
}
