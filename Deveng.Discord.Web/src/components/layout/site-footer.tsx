import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Panel dışı tüm sayfalarda (anasayfa, yasal vb.) ortak footer. */
export function SiteFooter({ className }: { className?: string }) {
  const { t } = useTranslation('landing')
  const { t: tl } = useTranslation('legal')
  const contactEmail = tl('meta.contactEmail')

  return (
    <footer className={cn('border-t bg-muted/30 py-12', className)}>
      <div className='container mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4'>
          <div>
            <h3 className='mb-3 text-sm font-semibold text-foreground'>{tl('footer.legalHeading')}</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link to='/about' className='transition-colors hover:text-primary'>
                  {tl('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link to='/terms' className='transition-colors hover:text-primary'>
                  {tl('footer.termOfUse')}
                </Link>
              </li>
              <li>
                <Link to='/eula' className='transition-colors hover:text-primary'>
                  {tl('footer.eulaShort')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-3 text-sm font-semibold text-foreground'>{tl('footer.privacyHeading')}</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link to='/privacy' className='transition-colors hover:text-primary'>
                  {tl('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to='/cookies' className='transition-colors hover:text-primary'>
                  {tl('footer.cookie')}
                </Link>
              </li>
              <li>
                <Link to='/gdpr' className='transition-colors hover:text-primary'>
                  {tl('footer.gdprNotice')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-3 text-sm font-semibold text-foreground'>{tl('footer.supportHeading')}</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link to='/faq' className='transition-colors hover:text-primary'>
                  {tl('footer.faq')}
                </Link>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className='transition-colors hover:text-primary'>
                  {tl('footer.contactUs')}
                </a>
              </li>
            </ul>
          </div>
          <div className='text-sm text-muted-foreground lg:pt-8'>
            <p>{tl('footer.companyLine')}</p>
          </div>
        </div>
        <div className='flex flex-col items-center justify-between gap-4 pt-8 md:flex-row border-t border-border/60'>
          <p className='text-center text-sm text-muted-foreground md:text-left'>
            © {new Date().getFullYear()} {tl('meta.siteName')}. {t('footerRights')}
          </p>
          <p className='text-center text-xs text-muted-foreground md:text-right'>
            {t('footerMadeBy')}{' '}
            <span className='text-red-500'>♥</span> by{' '}
            <a
              href='https://deveng.global'
              target='_blank'
              rel='noopener noreferrer'
              className='underline-offset-4 transition-colors hover:text-primary hover:underline'
            >
              Deveng Team
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
