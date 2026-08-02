import { Link } from '@tanstack/react-router'
import { BrandLogo } from '@/components/brand-logo'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'
import { useAuthStore } from '@/stores/auth-store'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const { auth } = useAuthStore()
  const dashboardTo = auth.selectedGuild
    ? { to: '/dashboard/$guildId' as const, params: { guildId: auth.selectedGuild.id } }
    : { to: '/apps' as const }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div className='flex items-center gap-3'>
            <Link
              {...dashboardTo}
              onClick={() => setOpenMobile(false)}
              className='flex flex-1 items-center'
            >
              <BrandLogo imgClassName='h-7' />
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}
