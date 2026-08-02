import { useTranslation } from 'react-i18next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PublicPageShell } from '@/features/public/public-page-shell'
import { ChevronDown } from 'lucide-react'

const CAT_COUNT = 5
const Q_PER_CAT = 10

export function FaqPage() {
  const { t } = useTranslation('legal')

  return (
    <PublicPageShell>
      <div className='space-y-8'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('faq.pageTitle')}</h1>
          <p className='text-muted-foreground'>{t('faq.pageSubtitle')}</p>
        </div>
        <div className='space-y-10'>
          {Array.from({ length: CAT_COUNT }, (_, c) => c + 1).map((cat) => (
            <section key={cat} className='space-y-3'>
              <h2 className='text-xl font-semibold border-b pb-2'>
                {t(`faq.cat${cat}Title`)}
              </h2>
              <div className='space-y-2'>
                {Array.from({ length: Q_PER_CAT }, (_, i) => i + 1).map((qi) => (
                  <Collapsible
                    key={`${cat}-${qi}`}
                    className='rounded-lg border bg-card/50 px-4'
                  >
                    <CollapsibleTrigger className='flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-medium hover:text-primary [&[data-state=open]>svg]:rotate-180'>
                      {t(`faq.c${cat}q${qi}`)}
                      <ChevronDown className='size-4 shrink-0 transition-transform duration-200' />
                    </CollapsibleTrigger>
                    <CollapsibleContent className='pb-3'>
                      <p className='text-sm text-muted-foreground leading-relaxed pr-6'>
                        {t(`faq.c${cat}a${qi}`)}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicPageShell>
  )
}
