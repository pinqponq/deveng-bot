import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { authApi } from '@/lib/api'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { t } = useTranslation('signOut')
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    const currentPath = location.href

    try {
      await authApi.logout()
    } catch {
      // Server oturumu kapanamazsa bile istemci state'i temizlenir.
    } finally {
      auth.reset()
      setIsSigningOut(false)
      onOpenChange(false)
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('signOut:title')}
      desc={t('signOut:description')}
      confirmText={t('signOut:confirm')}
      destructive
      handleConfirm={handleSignOut}
      isLoading={isSigningOut}
      className='sm:max-w-sm'
    />
  )
}
