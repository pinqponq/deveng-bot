import { useTranslation } from 'react-i18next'
import { PublicPageShell } from '@/features/public/public-page-shell'

export function StatusPublicPage() {
  const { t } = useTranslation('legal')

  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('publicTrust.statusPageTitle')}</h1>
          <p className='text-muted-foreground leading-relaxed'>{t('publicTrust.statusPageSubtitle')}</p>
        </header>
        <ul className='list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
          <li>{t('publicTrust.statusBullet1')}</li>
          <li>{t('publicTrust.statusBullet2')}</li>
          <li>{t('publicTrust.statusBullet3')}</li>
        </ul>
        <p className='text-sm text-muted-foreground'>
          <a href='/health' className='font-medium text-primary hover:underline'>
            {t('publicTrust.statusHealthLink')}
          </a>
        </p>
      </article>
    </PublicPageShell>
  )
}
