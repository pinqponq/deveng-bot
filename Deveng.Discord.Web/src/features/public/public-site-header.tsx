import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ThemeAndLanguageSwitches } from '@/components/theme-and-language-switches'
import { useAuthStore } from '@/stores/auth-store'
import { DISCORD_CLIENT_ID, PANEL_BASE_URL } from '@/lib/env'
import { BrandLogo } from '@/components/brand-logo'
import {
  ArrowRight,
  Bot,
  CircleHelp,
  Home,
  LayoutDashboard,
  Lock,
  Menu,
  Package,
  Info,
} from 'lucide-react'

function scrollToCommunitiesOnHome(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path === '/' || path === '/sign-in') {
    const el = document.getElementById('communities')
    if (el) {
      const headerOffset = 80
      const y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
      return
    }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  window.location.assign(`${origin}/#communities`)
}

/**
 * Anasayfa (SignIn) ile aynı üst navigasyon — public yasal/ürün sayfalarında kullanılır.
 */
export function PublicSiteHeader() {
  const { t } = useTranslation('landing')
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const isLoggedIn = !!auth.user

  const clientId = DISCORD_CLIENT_ID ?? ''
  const callbackPath = '/auth/discord/callback'
  const panelOrigin = (PANEL_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).trim()
  const redirectUri = encodeURIComponent(`${panelOrigin}${callbackPath}`)
  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds`

  function handleCta() {
    if (!isLoggedIn) {
      window.location.href = discordOAuthUrl
      return
    }
    navigate({ to: '/apps' })
  }

  const homeTo = isLoggedIn ? '/apps' : '/'
  const logoTo = isLoggedIn ? '/apps' : '/'

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm'>
      <div className='container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8'>
        <Link to={logoTo} className='flex items-center transition-opacity hover:opacity-80'>
          <BrandLogo />
        </Link>

        <nav className='hidden items-center gap-6 md:flex'>
          <Link
            to={homeTo}
            className='text-sm font-medium text-foreground/80 transition-colors hover:text-foreground'
          >
            {t('navHome')}
          </Link>
          <Link
            to='/features'
            className='text-sm font-medium text-foreground/80 transition-colors hover:text-foreground'
          >
            {t('navProduct')}
          </Link>
          <a
            href='/#communities'
            onClick={scrollToCommunitiesOnHome}
            className='text-sm font-medium text-foreground/80 transition-colors hover:text-foreground'
          >
            {t('navShowcase')}
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='text-sm font-medium text-foreground/80 transition-colors hover:text-foreground flex items-center gap-1'
              >
                {t('navMore')}
                <ArrowRight className='size-3 rotate-90' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuItem asChild>
                <Link to='/faq' className='flex items-center gap-2'>
                  <CircleHelp className='size-4' />
                  {t('navFaq')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/about' className='flex items-center gap-2'>
                  <Info className='size-4' />
                  {t('navAbout')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to='/terms' className='flex items-center gap-2'>
                  <Package className='size-4' />
                  {t('navTerms')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/privacy' className='flex items-center gap-2'>
                  <Lock className='size-4' />
                  {t('navPrivacy')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className='flex items-center gap-3'>
          <ThemeAndLanguageSwitches />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='icon' className='md:hidden' type='button'>
                <Menu className='size-5' />
                <span className='sr-only'>{t('navMenu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56 md:hidden'>
              <DropdownMenuItem asChild>
                <Link to={homeTo} className='flex items-center gap-2'>
                  <Home className='size-4' />
                  {t('navHome')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/features' className='flex items-center gap-2'>
                  <Package className='size-4' />
                  {t('navProduct')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href='/#communities' onClick={scrollToCommunitiesOnHome} className='flex items-center gap-2'>
                  <Bot className='size-4' />
                  {t('navShowcase')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('navMore')}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to='/faq' className='flex items-center gap-2'>
                  <CircleHelp className='size-4' />
                  {t('navFaq')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/about' className='flex items-center gap-2'>
                  <Info className='size-4' />
                  {t('navAbout')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/terms' className='flex items-center gap-2'>
                  <Package className='size-4' />
                  {t('navTerms')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/privacy' className='flex items-center gap-2'>
                  <Lock className='size-4' />
                  {t('navPrivacy')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => (isLoggedIn ? navigate({ to: '/apps' }) : handleCta())}
                className='flex items-center gap-2 text-[#5865F2] font-semibold cursor-pointer'
              >
                {isLoggedIn ? <LayoutDashboard className='size-4' /> : <Bot className='size-4' />}
                {isLoggedIn ? t('navDashboard') : t('navSignIn')}
                <ArrowRight className='size-3 ml-auto' />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size='sm'
            type='button'
            className='hidden rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white md:flex items-center gap-2'
            onClick={() => handleCta()}
          >
            {isLoggedIn ? <LayoutDashboard className='size-4' /> : <Bot className='size-4' />}
            {isLoggedIn ? t('navDashboard') : t('navSignIn')}
          </Button>
        </div>
      </div>
    </header>
  )
}
