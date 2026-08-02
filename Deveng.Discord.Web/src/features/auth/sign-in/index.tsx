import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { LANDING_FEATURES } from '@/features/public/landing-content'
import { PublicSiteHeader } from '@/features/public/public-site-header'
import {
  Bot,
  Zap,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  Clock,
  Smile,
  Mic,
  Ticket,
  Cake,
  FileText,
  Code,
  Image,
  Gift,
  Vote,
  Music,
  Shield,
  BarChart2,
  DoorOpen,
  LogOut,
  TrendingUp,
  Package,
} from 'lucide-react'
import { fetchShowcaseGuilds } from '@/lib/api'
import { DISCORD_CLIENT_ID, PANEL_BASE_URL, getBotInviteUrl } from '@/lib/env'

const featureIcons: Record<(typeof LANDING_FEATURES)[number]['slug'], React.ComponentType<{ className?: string }>> = {
  poll: Vote,
  reminder: Clock,
  'reaction-role': Smile,
  'temporary-voice': Mic,
  ticket: Ticket,
  birthday: Cake,
  logs: FileText,
  'custom-command': Code,
  'embed-message': Image,
  giveaway: Gift,
  welcome: DoorOpen,
  goodbye: LogOut,
  level: TrendingUp,
  music: Music,
  moderator: Shield,
  'ai-moderation': Shield,
  feeds: BarChart2,
  'scheduled-announcements': Clock,
  'invite-leaderboard': TrendingUp,
  'audit-logs': FileText,
  statistics: BarChart2,
  'custom-bots': Package,
  uptime: CheckCircle2,
}

export function SignIn() {
  const { t, i18n } = useTranslation(['landing', 'signIn'])
  const { data: showcase } = useQuery({
    queryKey: ['publicShowcaseGuilds', 'iconDataUrl:v2'],
    queryFn: fetchShowcaseGuilds,
    staleTime: 3_600_000,
  })

  const fmtNum = (n: number) =>
    new Intl.NumberFormat(i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US').format(n)

  // Smooth scroll handler
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      const headerOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  // Discord — window.__CONFIG__ (.env → build / server inject)
  const clientId = DISCORD_CLIENT_ID ?? ''
  const callbackPath = '/auth/discord/callback'
  const panelOrigin = (PANEL_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).trim()
  const redirectUri = encodeURIComponent(`${panelOrigin}${callbackPath}`)

  // Bot invite URL (granüler izinler — permissions=8 Yönetici değil)
  const discordInviteUrl = getBotInviteUrl()

  // Discord OAuth URL - Kullanıcı girişi için
  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds`

  // Login durumuna göre CTA hedefi: zaten girişliyse OAuth atlanır.
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const isLoggedIn = !!auth.user

  function handleCta() {
    if (!isLoggedIn) {
      window.location.href = discordOAuthUrl
      return
    }
    navigate({ to: '/apps' })
  }

  return (
    <div className='relative flex min-h-svh flex-col bg-gradient-to-b from-background to-muted/20 scroll-smooth overflow-hidden'>
      {/* Background tint (statik gradient — viewport-genelinde backdrop-blur kaldırıldı: kaydırma takılmasını önler) */}
      <div className='fixed inset-0 z-0 bg-gradient-to-b from-background/80 via-background/60 to-muted/40'></div>

      {/* Stars Background */}
      <div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
        <div className='stars-container absolute inset-0'></div>
        {/* Shooting stars */}
        <div className='shooting-star-1 absolute w-1 h-1 bg-white rounded-full opacity-0'></div>
        <div className='shooting-star-2 absolute w-1 h-1 bg-white rounded-full opacity-0'></div>
        <div className='shooting-star-3 absolute w-1 h-1 bg-white rounded-full opacity-0'></div>
        {/* Network Map */}
        <svg className='network-map absolute inset-0 w-full h-full opacity-40' xmlns='http://www.w3.org/2000/svg'>
          <defs>
            <linearGradient id='lineGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
              <stop offset='0%' stopColor='rgba(255, 255, 255, 0.5)' />
              <stop offset='100%' stopColor='rgba(255, 255, 255, 0.2)' />
            </linearGradient>
          </defs>
          {/* Network nodes and connections */}
          <g className='network-nodes'>
            {/* Nodes */}
            <circle cx='10%' cy='20%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='25%' cy='15%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='40%' cy='25%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='60%' cy='20%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='80%' cy='30%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='15%' cy='50%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='35%' cy='55%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='55%' cy='60%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='75%' cy='50%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='90%' cy='45%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='20%' cy='75%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='45%' cy='80%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='70%' cy='75%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            <circle cx='85%' cy='85%' r='3' fill='rgba(255, 255, 255, 0.8)' className='network-node' />
            {/* Connections */}
            <line x1='10%' y1='20%' x2='25%' y2='15%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='25%' y1='15%' x2='40%' y2='25%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='40%' y1='25%' x2='60%' y2='20%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='60%' y1='20%' x2='80%' y2='30%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='10%' y1='20%' x2='15%' y2='50%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='25%' y1='15%' x2='35%' y2='55%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='40%' y1='25%' x2='55%' y2='60%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='60%' y1='20%' x2='75%' y2='50%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='80%' y1='30%' x2='90%' y2='45%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='15%' y1='50%' x2='35%' y2='55%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='35%' y1='55%' x2='55%' y2='60%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='55%' y1='60%' x2='75%' y2='50%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='75%' y1='50%' x2='90%' y2='45%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='15%' y1='50%' x2='20%' y2='75%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='35%' y1='55%' x2='45%' y2='80%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='55%' y1='60%' x2='70%' y2='75%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='75%' y1='50%' x2='85%' y2='85%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='20%' y1='75%' x2='45%' y2='80%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='45%' y1='80%' x2='70%' y2='75%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
            <line x1='70%' y1='75%' x2='85%' y2='85%' stroke='url(#lineGradient)' strokeWidth='1.5' className='network-line' />
          </g>
        </svg>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .feature-card {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
        
        .feature-card:hover {
          box-shadow: 
            0 0 20px rgba(255, 255, 255, 0.3),
            0 0 40px rgba(255, 255, 255, 0.15),
            inset 0 0 20px rgba(255, 255, 255, 0.1),
            0 0 60px rgba(255, 255, 255, 0.05) !important;
        }

        /* Stars Animation */
        .stars-container {
          background-image: 
            radial-gradient(2px 2px at 10% 20%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 30% 15%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 40% 25%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 50% 35%, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 60% 45%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 70% 55%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 80% 65%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 90% 75%, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 15% 40%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 25% 50%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 35% 60%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 45% 70%, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 55% 80%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 65% 10%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 75% 20%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 85% 30%, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 95% 40%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 5% 60%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 12% 70%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 18% 80%, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 22% 90%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 28% 5%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 32% 12%, rgba(255, 255, 255, 0.9), transparent);
          background-size: 200% 200%;
          background-position: 0% 0%;
          opacity: 0.7;
        }

        /* Twinkling stars */
        .stars-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(1px 1px at 8% 18%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 15% 28%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 22% 38%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 28% 48%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 35% 58%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 42% 68%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 48% 78%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 55% 88%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 62% 8%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 68% 18%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 75% 28%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 82% 38%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 88% 48%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 92% 58%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 3% 68%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 7% 78%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 11% 88%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 17% 3%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 25% 13%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 33% 23%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 38% 33%, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 45% 43%, rgba(255, 255, 255, 1), transparent),
            radial-gradient(1px 1px at 52% 53%, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(1px 1px at 58% 63%, rgba(255, 255, 255, 0.8), transparent);
          background-size: 200% 200%;
          animation: starsTwinkle 3s ease-in-out infinite alternate;
          opacity: 0.9;
        }

        @keyframes starsTwinkle {
          0% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }

        /* Shooting stars */
        .shooting-star-1 {
          top: 0;
          left: 20%;
          box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
          animation: shootStar1 8s linear infinite;
        }

        .shooting-star-2 {
          top: 0;
          left: 50%;
          box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
          animation: shootStar2 12s linear infinite;
          animation-delay: 3s;
        }

        .shooting-star-3 {
          top: 0;
          left: 80%;
          box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
          animation: shootStar3 10s linear infinite;
          animation-delay: 6s;
        }

        @keyframes shootStar1 {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(300px);
            opacity: 0;
          }
        }

        @keyframes shootStar2 {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(-200px);
            opacity: 0;
          }
        }

        @keyframes shootStar3 {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(400px);
            opacity: 0;
          }
        }

        /* Network Map — tek bir composited opacity "nefes" animasyonu.
           (Eski hâl: 14 düğümde r, 19 çizgide stroke-dashoffset animasyonu →
           tam ekran SVG'de sürekli repaint/takılma. Düğüm ve çizgiler artık statik.) */
        .network-map {
          animation: mapBreathe 10s ease-in-out infinite;
          will-change: opacity;
        }

        @keyframes mapBreathe {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }

        /* Hareket azaltma tercihi: kalan animasyonları kapat, kartları görünür bırak */
        @media (prefers-reduced-motion: reduce) {
          .stars-container,
          .stars-container::before,
          .shooting-star-1,
          .shooting-star-2,
          .shooting-star-3,
          .network-map,
          .feature-card {
            animation: none !important;
          }
          .feature-card {
            opacity: 1 !important;
          }
        }
      `}</style>

      <PublicSiteHeader />

      {/* Hero Section */}
      <section className='relative z-10 flex min-h-[70vh] items-center justify-center px-4 pt-4 pb-8 sm:px-6 lg:px-8'>
        <div className='container mx-auto max-w-6xl'>
          <div className='grid gap-12 lg:grid-cols-2 lg:gap-16'>
            {/* Left Column - Hero Content */}
            <div className='flex flex-col justify-center space-y-8'>
              {/* Badge */}
              <div className='space-y-4'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-fit rounded-full border-primary/20 bg-primary/5 text-xs hover:bg-primary/10'
                >
                  <Bot className='mr-2 size-3' />
                  {t('heroBadge')}
                  <ArrowRight className='ml-2 size-3' />
                </Button>
              </div>

              <div className='space-y-4'>
                <h1 className='text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
                  {t('heroTitle')}
                </h1>
                <p className='text-muted-foreground text-lg leading-relaxed'>
                  {t('heroDesc')}
                </p>
              </div>

              <div className='flex flex-col gap-3 sm:flex-row'>
                {!isLoggedIn && (
                  <Button
                    size='lg'
                    className='rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white'
                    asChild
                  >
                    <a
                      href={discordInviteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center justify-center gap-2'
                    >
                      <Bot className='size-5' />
                      {t('heroAddDiscord')}
                      <ArrowRight className='size-4' />
                    </a>
                  </Button>
                )}
                <Button
                  size='lg'
                  variant='outline'
                  className='rounded-lg'
                  onClick={(e) => {
                    e.preventDefault()
                    handleSmoothScroll(e as unknown as React.MouseEvent<HTMLAnchorElement>, 'features')
                  }}
                >
                  <Zap className='size-5' />
                  {t('heroExploreFeatures')}
                  <ArrowRight className='size-4' />
                </Button>
              </div>

              <div className='flex flex-wrap items-center justify-center gap-8 md:gap-12 pt-8'>
                <div className='text-center'>
                  <div className='text-3xl font-bold tabular-nums'>
                    {showcase && showcase.totalMembersApprox > 0 ? fmtNum(showcase.totalMembersApprox) : '—'}
                  </div>
                  <div className='text-muted-foreground text-sm mt-1'>{t('heroLabelMembers')}</div>
                </div>
                <div className='text-center'>
                  <div className='text-3xl font-bold tabular-nums'>
                    {showcase && showcase.totalGuilds > 0 ? fmtNum(showcase.totalGuilds) : '—'}
                  </div>
                  <div className='text-muted-foreground text-sm mt-1'>{t('heroLabelGuilds')}</div>
                </div>
                  <div className='text-center'>
                  <div className='text-3xl font-bold tabular-nums'>{LANDING_FEATURES.length}+</div>
                  <div className='text-muted-foreground text-sm mt-1'>{t('heroLabelModules')}</div>
                </div>
                <div className='text-center'>
                  <div className='text-3xl font-bold'>7/24</div>
                  <div className='text-muted-foreground text-sm mt-1'>{t('heroLabelUptime')}</div>
                </div>
              </div>
            </div>

            {/* Right Column - Login Card */}
            <div className='flex items-center justify-center'>
              {!isLoggedIn ? (
                <div className='w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lg'>
                  <div className='space-y-2 text-center'>
                    <h3 className='text-2xl font-bold tracking-tight'>{t('loginTitle')}</h3>
                    <p className='text-muted-foreground text-sm'>{t('loginDesc')}</p>
                  </div>

                  <Button
                    size='lg'
                    className='w-full rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-md flex items-center justify-center gap-2'
                    onClick={() => handleCta()}
                  >
                    <Bot className='size-5' />
                    {t('loginSignInDiscord')}
                    <ArrowRight className='size-4' />
                  </Button>

                  <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-card text-muted-foreground px-2'>{t('loginSecure')}</span>
                    </div>
                  </div>

                  <p className='text-muted-foreground text-center text-xs leading-relaxed'>
                    {t('loginTermsBefore')}{' '}
                    <Link
                      to='/terms'
                      className='font-medium text-primary underline underline-offset-4 hover:text-primary/90'
                    >
                      {t('termsLink')}
                    </Link>{' '}
                    {t('loginTermsAnd')}{' '}
                    <Link
                      to='/privacy'
                      className='font-medium text-primary underline underline-offset-4 hover:text-primary/90'
                    >
                      {t('privacyLink')}
                    </Link>
                    {t('loginTermsSuffix')}
                  </p>
                </div>
              ) : (
                <div className='w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lg'>
                  <div className='space-y-2 text-center'>
                    <h3 className='text-2xl font-bold tracking-tight'>{t('loggedInCardTitle')}</h3>
                    <p className='text-muted-foreground text-sm'>{t('loggedInCardDesc')}</p>
                  </div>
                  <div className='flex flex-col gap-3'>
                    <Button size='lg' className='w-full rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white' asChild>
                      <Link to='/apps' className='flex items-center justify-center gap-2'>
                        <LayoutDashboard className='size-5' />
                        {t('loggedInCardOpenPanel')}
                        <ArrowRight className='size-4' />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Vitrin: Redis'teki canlı sunucu listesi */}
      <section
        id='communities'
        className='relative z-15 scroll-mt-20 border-t border-border/50 bg-gradient-to-b from-muted/20 to-background py-16'
      >
        <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-10 text-center md:text-left md:flex md:items-end md:justify-between gap-6'>
            <div className='space-y-2'>
              <h2 className='text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
                {t('showcaseTitle')}
              </h2>
            </div>
            {showcase && showcase.totalGuilds > 0 && (
              <p className='text-sm text-muted-foreground shrink-0 tabular-nums'>
                {t('signIn:showcaseStats', {
                  servers: fmtNum(showcase.totalGuilds),
                  members: fmtNum(showcase.totalMembersApprox),
                })}
              </p>
            )}
          </div>

          {showcase && showcase.guilds && showcase.guilds.length > 0 ? (
            <div className='mx-auto max-w-4xl'>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-5'>
                {showcase.guilds.slice(0, 5).map((g) => {
                  const bannerSrc = g.bannerDataUrl ?? g.bannerUrl ?? null
                  const iconSrc = g.iconDataUrl ?? g.iconUrl ?? null
                  return (
                  <div
                    key={g.id}
                    className='group rounded-xl border border-border/70 bg-card/80 overflow-hidden shadow-sm hover:border-primary/35 hover:shadow-md transition-all duration-300'
                  >
                    <div
                      className='relative h-12 sm:h-14 bg-gradient-to-br from-primary/12 via-primary/5 to-muted w-full'
                      style={
                        bannerSrc
                          ? { backgroundImage: `url(${bannerSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : undefined
                      }
                    >
                      <div className='absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent' />
                      <div className='absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-end'>
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt=''
                            className='h-9 w-9 rounded-lg border-2 border-background shadow-sm object-cover sm:h-10 sm:w-10 sm:rounded-xl'
                            loading='lazy'
                          />
                        ) : (
                          <div className='h-9 w-9 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm'>
                            {g.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='space-y-0.5 px-2 pb-2.5 pt-5 text-center sm:pt-6'>
                      <p className='text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem] sm:text-[13px]' title={g.name}>
                        {g.name}
                      </p>
                      <p className='text-[10px] text-muted-foreground tabular-nums sm:text-xs'>
                        {t('signIn:guildMemberCount', { count: fmtNum(g.memberCount) })}
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className='text-center text-sm text-muted-foreground py-8 border border-dashed rounded-2xl bg-muted/20'>
              {t('showcaseEmpty')}
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='relative z-20 scroll-mt-20 mt-4 pb-16 bg-gradient-to-b from-background via-background to-muted/20'>
        <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-8 text-center'>
            <div className='inline-block mb-3'>
              <span className='inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20'>
                <Zap className='mr-1.5 size-3' />
                {t('navFeatures')}
              </span>
            </div>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent'>
              {t('featuresTitle')}
            </h2>
            <p className='text-muted-foreground mt-4 text-base max-w-2xl mx-auto'>
              {t('featuresSubtitle')}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
            {LANDING_FEATURES.map((feature, index) => {
              const Icon = featureIcons[feature.slug]
              return (
                <div
                  key={index}
                  className='feature-card group relative flex flex-col gap-4 rounded-xl border border-white/20 bg-card/80 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-white/20 hover:border-white/40 hover:-translate-y-1 hover:bg-card'
                  style={{
                    animationDelay: `${index * 50}ms`,
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div className='absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                  <div className='relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-all duration-300'>
                    <Icon className='size-6 text-primary transition-all duration-300' />
                  </div>
                  <div className='space-y-2 relative z-10'>
                    <h3 className='text-lg font-semibold group-hover:text-primary transition-colors duration-300'>
                      {t(feature.titleKey)}
                    </h3>
                    <p className='text-muted-foreground text-sm leading-relaxed group-hover:text-foreground/70 transition-colors duration-300'>
                      {t(feature.descKey)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='relative z-10 border-t bg-muted/30 py-20'>
        <div className='container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-12 text-center'>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {t('howItWorksTitle')}
            </h2>
            <p className='text-muted-foreground mt-4 text-lg'>
              {t('howItWorksSubtitle')}
            </p>
          </div>
          <div className='grid gap-8 md:grid-cols-3'>
            <div className='text-center'>
              <div className='mb-4 flex justify-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-2xl font-bold text-primary'>1</span>
                </div>
              </div>
              <h3 className='mb-2 text-xl font-semibold'>{t('step1Title')}</h3>
              <p className='text-muted-foreground'>{t('step1Desc')}</p>
            </div>
            <div className='text-center'>
              <div className='mb-4 flex justify-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-2xl font-bold text-primary'>2</span>
                </div>
              </div>
              <h3 className='mb-2 text-xl font-semibold'>{t('step2Title')}</h3>
              <p className='text-muted-foreground'>{t('step2Desc')}</p>
            </div>
            <div className='text-center'>
              <div className='mb-4 flex justify-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-2xl font-bold text-primary'>3</span>
                </div>
              </div>
              <h3 className='mb-2 text-xl font-semibold'>{t('step3Title')}</h3>
              <p className='text-muted-foreground'>{t('step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter className='relative z-10' />
    </div>
  )
}
