import * as React from 'react'
import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeAndLanguageSwitches } from '@/components/theme-and-language-switches'
import { SkipToMain } from '@/components/skip-to-main'
import { PageFaq } from '@/components/page-faq'
import { useAuthStore } from '@/stores/auth-store'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const userId = useAuthStore((s) => s.auth.user?.accountNo ?? null)
  const refreshToken = useAuthStore((s) => s.auth.refreshToken)
  const refreshIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = React.useRef<number>(Date.now())

  React.useEffect(() => {
    if (!userId) {
      return
    }

    const checkAndRefreshToken = async () => {
      const user = useAuthStore.getState().auth.user
      if (!user) return
      const now = Date.now()
      const expiresAt = user.exp || 0
      const timeUntilExpiry = expiresAt - now
      const minutesUntilExpiry = timeUntilExpiry / (60 * 1000)

      const timeSinceLastActivity = now - lastActivityRef.current
      const isUserActive = timeSinceLastActivity < 5 * 60 * 1000

      if (minutesUntilExpiry <= 2 && isUserActive) {
        // eslint-disable-next-line no-console
        console.log('[Auth] Token expiry yaklaşıyor, otomatik refresh ediliyor...', {
          minutesUntilExpiry: Math.round(minutesUntilExpiry * 10) / 10,
          timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
        })

        try {
          const success = await refreshToken()
          if (!success) {
            // eslint-disable-next-line no-console
            console.error('[Auth] Token refresh başarısız')
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[Auth] Token refresh hatası:', error)
        }
      }
    }

    checkAndRefreshToken()

    refreshIntervalRef.current = setInterval(() => {
      checkAndRefreshToken()
    }, 30 * 1000)

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
    }

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [userId, refreshToken])

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              '@container/content',

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-data-[layout=fixed]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            <Header fixed>
              <Search />
              <div className='ms-auto flex items-center gap-4'>
                <ThemeAndLanguageSwitches />
                <ProfileDropdown />
              </div>
            </Header>
            {children ?? <Outlet />}
            <div className='@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl px-4 pb-6'>
              <PageFaq />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
