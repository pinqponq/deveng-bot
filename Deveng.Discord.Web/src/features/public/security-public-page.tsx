import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PublicPageShell } from '@/features/public/public-page-shell'

export function SecurityPublicPage() {
  const { t } = useTranslation('legal')

  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('publicTrust.securityPageTitle')}</h1>
          <p className='text-muted-foreground leading-relaxed'>{t('publicTrust.securityPageSubtitle')}</p>
        </header>
        <section aria-labelledby='sec-practices' className='space-y-3'>
          <h2 id='sec-practices' className='text-xl font-semibold'>
            {t('publicTrust.securityPracticesHeading')}
          </h2>
          <ul className='list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
            <li>{t('publicTrust.securityBullet1')}</li>
            <li>{t('publicTrust.securityBullet2')}</li>
            <li>{t('publicTrust.securityBullet3')}</li>
            <li>{t('publicTrust.securityBullet4')}</li>
            <li>{t('publicTrust.securityBullet5')}</li>
          </ul>
        </section>
        <nav className='flex flex-wrap gap-x-4 gap-y-2 text-sm'>
          <Link to='/privacy' className='text-primary hover:underline'>
            {t('footer.privacyPolicy')}
          </Link>
          <Link to='/gdpr' className='text-primary hover:underline'>
            {t('footer.gdprNotice')}
          </Link>
          <Link to='/terms' className='text-primary hover:underline'>
            {t('footer.termOfUse')}
          </Link>
        </nav>
      </article>
    </PublicPageShell>
  )
}
