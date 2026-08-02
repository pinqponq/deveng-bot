import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Welcome() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const user = auth.user
  const discord = user?.discord

  const welcomeMessage = discord
    ? t('onboarding:greetingNamed', { name: discord.globalName || discord.username })
    : t('onboarding:greeting')

  return (
    <>
      {/* ===== Main ===== */}
      <Main>
        <div className='flex flex-col items-center justify-center min-h-[60vh] gap-6'>
          <div className='flex items-center gap-4'>
            <Sparkles className='size-16 text-primary' />
            <h1 className='text-4xl font-bold tracking-tight'>{welcomeMessage}</h1>
          </div>
          
          <Card className='w-full max-w-2xl'>
            <CardHeader>
              <CardTitle>{t('onboarding:cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground'>
                {t('onboarding:cardDescription')}
              </p>
              {discord && (
                <div className='mt-4 space-y-2'>
                  <p className='text-sm'>
                    <span className='font-semibold'>{t('onboarding:discordUsernameLabel')}</span> {discord.username}
                  </p>
                  {discord.globalName && (
                    <p className='text-sm'>
                      <span className='font-semibold'>{t('onboarding:displayNameLabel')}</span> {discord.globalName}
                    </p>
                  )}
                  <p className='text-sm'>
                    <span className='font-semibold'>{t('onboarding:discordIdLabel')}</span> {discord.id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

