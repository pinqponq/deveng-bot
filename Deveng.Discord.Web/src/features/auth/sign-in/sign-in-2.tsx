import { useTranslation } from 'react-i18next'
import { BrandLogo } from '@/components/brand-logo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTermsPrivacyModal } from '@/context/terms-privacy-modal-context'
import { ArrowRight } from 'lucide-react'
import { UserAuthForm } from './components/user-auth-form'
import { UIShowcase } from './components/ui-showcase'

export function SignIn2() {
  const { t } = useTranslation(['auth'])
  const { openTerms, openPrivacy } = useTermsPrivacyModal()
  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      {/* Left Side - Content */}
      <div className='flex h-full flex-col justify-center lg:p-8'>
        <div className='mx-auto flex w-full max-w-lg flex-col justify-center space-y-8 px-4 py-8 sm:px-8'>
          <div className='flex items-center'>
            <BrandLogo />
          </div>

          {/* Badge */}
          <Button
            variant='outline'
            size='sm'
            className='w-fit rounded-full border-primary/20 bg-primary/5 text-xs hover:bg-primary/10'
          >
            {t('auth:introducingTemplate')}
            <ArrowRight className='ml-1 size-3' />
          </Button>

          {/* Main Heading */}
          <div className='space-y-4'>
            <h2 className='text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
              {t('auth:collectionHeading')}
            </h2>
            <p className='text-muted-foreground text-base leading-relaxed sm:text-lg'>
              {t('auth:collectionDescription')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap gap-3'>
            <Button size='lg' className='rounded-lg'>
              {t('auth:browseComponents')}
            </Button>
            <Button variant='outline' size='lg' className='rounded-lg'>
              {t('auth:viewTemplates')}
            </Button>
          </div>

          {/* Technology Icons */}
          <div className='flex flex-wrap items-center gap-6'>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-blue-500/10'>
                <span className='text-blue-500 text-xs font-semibold'>TW</span>
              </div>
              <span className='text-muted-foreground text-sm'>Tailwind CSS</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-yellow-500/10'>
                <span className='text-yellow-500 text-xs font-semibold'>M</span>
              </div>
              <span className='text-muted-foreground text-sm'>Motion</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-black/10 dark:bg-white/10'>
                <span className='text-xs font-semibold leading-none'>Ra</span>
              </div>
              <span className='text-muted-foreground text-sm'>Radix UI</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-black/10 dark:bg-white/10'>
                <span className='text-xs font-semibold'>N</span>
              </div>
              <span className='text-muted-foreground text-sm'>Next.js</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-blue-500/10'>
                <span className='text-blue-500 text-xs font-semibold'>R</span>
              </div>
              <span className='text-muted-foreground text-sm'>React</span>
            </div>
          </div>

          {/* Sign In Form */}
          <div className='space-y-4 rounded-lg border bg-card p-6 shadow-sm'>
            <div className='space-y-2'>
              <h3 className='text-lg font-semibold tracking-tight'>{t('auth:signInTitle')}</h3>
              <p className='text-muted-foreground text-sm'>
                {t('auth:signInDescription')}
              </p>
            </div>
            <UserAuthForm />
            <p className='text-muted-foreground text-center text-xs'>
              {t('auth:signInAgreementBefore')}{' '}
              <button
                type='button'
                onClick={openTerms}
                className='hover:text-primary underline underline-offset-4'
              >
                {t('auth:termsOfService')}
              </button>{' '}
              {t('auth:signInAgreementAnd')}{' '}
              <button
                type='button'
                onClick={openPrivacy}
                className='hover:text-primary underline underline-offset-4'
              >
                {t('auth:privacyPolicy')}
              </button>
              {t('auth:signInAgreementAfter')}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - UI Showcase */}
      <div
        className={cn(
          'bg-muted relative h-full overflow-hidden max-lg:hidden'
        )}
      >
        <UIShowcase />
      </div>
    </div>
  )
}
