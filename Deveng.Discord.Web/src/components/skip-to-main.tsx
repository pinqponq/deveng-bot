import { useTranslation } from 'react-i18next'

export function SkipToMain() {
  const { t } = useTranslation()

  return (
    <a
      className='bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring fixed start-4 top-0 z-999 -translate-y-16 rounded-b-md px-4 py-2 text-sm font-medium whitespace-nowrap opacity-95 shadow-sm transition focus:translate-y-0 focus-visible:ring-2'
      href='#content'
    >
      {t('common:skipToMain', { defaultValue: 'Ana içeriğe geç' })}
    </a>
  )
}
