import { PublicSiteHeader } from '@/features/public/public-site-header'
import { SiteFooter } from '@/components/layout/site-footer'

export function PublicPageShell({
  children,
  wide = false,
}: {
  children: React.ReactNode
  /** Çok sütunlu geniş içerik için daha geniş ana alan */
  wide?: boolean
}) {
  return (
    <div className='flex min-h-svh flex-col bg-gradient-to-b from-background to-muted/20'>
      <PublicSiteHeader />
      <main
        id='content'
        className={
          wide
            ? 'container max-w-5xl flex-1 px-4 py-8 sm:px-6'
            : 'container max-w-3xl flex-1 px-4 py-8 sm:px-6'
        }
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
