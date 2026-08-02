import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const { t } = useTranslation('errors')
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>{t('errors:notFound')}</span>
        <p className='text-muted-foreground text-center'>
          {t('errors:notFoundDescription')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('errors:goBack')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>{t('errors:backToHome')}</Button>
        </div>
      </div>
    </div>
  )
}
