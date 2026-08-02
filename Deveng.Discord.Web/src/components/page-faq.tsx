import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronDown, HelpCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'

type FaqItem = { q: string; a: string }

type PageFaqProps = {
  pageId?: string
  className?: string
}

const FAQ_FALLBACK_LANG = 'tr'

function readFaqItems(
  i18n: ReturnType<typeof useTranslation>['1'],
  pageId: string,
): FaqItem[] {
  const tCurrent = i18n.getFixedT(i18n.language, 'panelFaq')
  const value = tCurrent(`pages.${pageId}.items`, { returnObjects: true })
  if (Array.isArray(value) && value.length > 0) return value as FaqItem[]

  if (i18n.language !== FAQ_FALLBACK_LANG) {
    const tFallback = i18n.getFixedT(FAQ_FALLBACK_LANG, 'panelFaq')
    const fb = tFallback(`pages.${pageId}.items`, { returnObjects: true })
    if (Array.isArray(fb)) return fb as FaqItem[]
  }
  return []
}

function readFaqTitle(
  i18n: ReturnType<typeof useTranslation>['1'],
  pageId: string,
): string {
  const tCurrent = i18n.getFixedT(i18n.language, 'panelFaq')
  const value = tCurrent(`pages.${pageId}.title`, { defaultValue: '' })
  if (typeof value === 'string' && value) return value
  if (i18n.language !== FAQ_FALLBACK_LANG) {
    const tFallback = i18n.getFixedT(FAQ_FALLBACK_LANG, 'panelFaq')
    const fb = tFallback(`pages.${pageId}.title`, { defaultValue: '' })
    if (typeof fb === 'string') return fb
  }
  return ''
}

/**
 * Path/route'tan FAQ pageId'si türetir. Bilinmeyen path'lerde null döner ve
 * hiçbir şey render edilmez (`apps`, `select-server`, `dashboard/<id>/...`).
 */
function resolvePageId(pathname: string): string | null {
  if (pathname === '/apps' || pathname.startsWith('/apps/')) return 'apps'
  if (pathname === '/select-server') return 'selectServer'

  const dashboardMatch = pathname.match(/^\/dashboard\/[^/]+(?:\/(.+))?$/)
  if (dashboardMatch) {
    const tail = dashboardMatch[1]
    if (!tail) return 'dashboard'
    const firstSegment = tail.split('/')[0]

    if (firstSegment === 'errors') return 'error'

    const camel = firstSegment.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

    if (camel === 'botPrivateBot') return 'botCustomBots'

    return camel
  }

  return null
}

export function PageFaq({ pageId: providedPageId, className }: PageFaqProps) {
  const { t, i18n } = useTranslation('panelFaq')
  const location = useLocation()
  const [open, setOpen] = React.useState(false)
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null)

  const pageId =
    providedPageId ?? resolvePageId(location.pathname)

  const items = React.useMemo<FaqItem[]>(() => {
    if (!pageId) return []
    return readFaqItems(i18n, pageId)
  }, [pageId, i18n, i18n.language])

  if (!pageId || items.length === 0) return null

  const sectionTitle = t('section.title')
  const sectionDescription = t('section.description')
  const pageTitle = readFaqTitle(i18n, pageId)

  return (
    <Card
      className={cn(
        'mt-6 border-dashed bg-muted/20 print:hidden',
        className,
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type='button'
            className='flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/40'
            aria-expanded={open}
          >
            <HelpCircle className='mt-0.5 size-5 shrink-0 text-primary' />
            <div className='flex-1'>
              <div className='font-semibold'>
                {sectionTitle}
                {pageTitle ? (
                  <span className='text-muted-foreground font-normal'>
                    {' · '}
                    {pageTitle}
                  </span>
                ) : null}
              </div>
              <div className='text-muted-foreground mt-0.5 text-sm'>
                {sectionDescription}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className='space-y-2 pt-4'>
            <ol className='space-y-2'>
              {items.map((item, index) => {
                const isExpanded = expandedIndex === index
                return (
                  <li key={index}>
                    <button
                      type='button'
                      onClick={() =>
                        setExpandedIndex(isExpanded ? null : index)
                      }
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/30',
                        isExpanded && 'bg-muted/40',
                      )}
                      aria-expanded={isExpanded}
                    >
                      <span className='text-muted-foreground mt-0.5 text-xs font-mono tabular-nums'>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className='flex-1 font-medium'>{item.q}</span>
                      <Plus
                        className={cn(
                          'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-45',
                        )}
                      />
                    </button>
                    {isExpanded ? (
                      <p className='text-muted-foreground mt-1 px-3 pb-2 pl-10 text-sm leading-relaxed whitespace-pre-line'>
                        {item.a}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

/**
 * Card'sız, başlıksız, daha kompakt versiyon. Sayfa içi inline yerleştirme için.
 */
export function PageFaqInline({ pageId: providedPageId, className }: PageFaqProps) {
  const { t, i18n } = useTranslation('panelFaq')
  const location = useLocation()
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null)

  const pageId =
    providedPageId ?? resolvePageId(location.pathname)

  const items = React.useMemo<FaqItem[]>(() => {
    if (!pageId) return []
    return readFaqItems(i18n, pageId)
  }, [pageId, i18n, i18n.language])

  if (!pageId || items.length === 0) return null

  return (
    <Card className={cn('mt-6 print:hidden', className)}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <HelpCircle className='size-5 text-primary' />
          {t('section.title')}
        </CardTitle>
        <CardDescription>{t('section.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className='space-y-2'>
          {items.map((item, index) => {
            const isExpanded = expandedIndex === index
            return (
              <li key={index}>
                <button
                  type='button'
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/30',
                    isExpanded && 'bg-muted/40',
                  )}
                  aria-expanded={isExpanded}
                >
                  <span className='text-muted-foreground mt-0.5 text-xs font-mono tabular-nums'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className='flex-1 font-medium'>{item.q}</span>
                  <Plus
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-45',
                    )}
                  />
                </button>
                {isExpanded ? (
                  <p className='text-muted-foreground mt-1 px-3 pb-2 pl-10 text-sm leading-relaxed whitespace-pre-line'>
                    {item.a}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
