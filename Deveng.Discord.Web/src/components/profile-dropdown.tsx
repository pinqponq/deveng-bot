import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useDialogState from '@/hooks/use-dialog-state'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useAuthStore } from '@/stores/auth-store'
import { useTranslation } from 'react-i18next'

export function ProfileDropdown() {
  const { t } = useTranslation('nav')
  const { i18n } = useTranslation()
  const [open, setOpen] = useDialogState()
  const { auth } = useAuthStore()
  const user = auth.user
  const discord = user?.discord

  const displayName =
    discord?.globalName || discord?.username || i18n.t('common:user')

  const displayEmail =
    typeof user?.email === 'string' && user.email.trim() !== ''
      ? user.email.trim()
      : ''

  const avatarUrl = discord?.avatarUrl || '/avatars/01.png'

  const avatarFallback = discord?.username
    ? discord.username.slice(0, 2).toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56 sm:w-60' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-12 w-12 shrink-0'>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className='flex min-w-0 flex-col gap-0.5'>
                <p className='truncate text-sm leading-none font-medium'>
                  {displayName}
                </p>
                {displayEmail ? (
                  <p className='text-muted-foreground truncate text-xs leading-none'>
                    {displayEmail}
                  </p>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
