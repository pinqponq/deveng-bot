import { useTranslation } from 'react-i18next'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { useAuthStore } from '@/stores/auth-store'
import { resolveNavUrl, splitHrefPathAndSearch } from '@/utils/nav-url'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { guildAnalyticsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'

export function Dashboard() {
  const { t } = useTranslation(['common', 'dashboard', 'nav'])
  const { guildId } = useParams({ from: '/_authenticated/dashboard/$guildId' })
  const { auth } = useAuthStore()

  const guildFromUser = auth.user?.discord?.guilds?.find((g) => g.id === guildId)
  const selectedGuild =
    auth.selectedGuild?.id === guildId
      ? auth.selectedGuild
      : guildFromUser
        ? {
            id: guildId,
            name: guildFromUser.name,
            icon: guildFromUser.icon,
            iconUrl:
              guildFromUser.iconUrl ||
              (guildFromUser.icon
                ? `https://cdn.discordapp.com/icons/${guildId}/${guildFromUser.icon}.png?size=256`
                : undefined),
          }
        : null

  const summaryQuery = useQuery({
    queryKey: ['guild-analytics-summary', guildId, 'dashboard'],
    queryFn: () => guildAnalyticsApi.getSummary(guildId!, { includeMyUnreadTickets: true }),
    enabled: !!guildId,
    staleTime: 60_000,
  })

  if (!guildId || !selectedGuild) {
    return null
  }

  // Sol menüyle aynı öğeler: sadece link olan öğeleri al, URL'leri guildId ile çöz
  const menuCards = sidebarData.navGroups.flatMap((group) =>
    group.items
      .filter((item): item is typeof item & { url: string } => 'url' in item && typeof item.url === 'string')
      .filter((item) => item.url !== '/dashboard' && item.url !== '/apps')
      .map((item) => ({ ...item, url: resolveNavUrl(item.url, guildId) }))
  )

  const welcomeMessage = `${selectedGuild.name} — ${t('dashboard:title')}`

  const metricCard = (label: string, value: string | number) => (
    <Card key={label}>
      <CardHeader className='space-y-1 p-4'>
        <CardDescription className='text-xs'>{label}</CardDescription>
        <CardTitle className='text-xl font-semibold tabular-nums'>{value}</CardTitle>
      </CardHeader>
    </Card>
  )

  return (
    <>
      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>
            {welcomeMessage}
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('dashboard:subtitle', { server: selectedGuild.name })}
          </p>
        </div>

        <div className='mb-8'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold tracking-tight'>{t('dashboard:metricsTitle')}</h2>
            <Button variant='outline' size='sm' asChild>
              <Link to='/dashboard/$guildId/guild-analytics' params={{ guildId }}>
                {t('dashboard:linkFullAnalytics')}
              </Link>
            </Button>
          </div>
          <p className='text-muted-foreground mb-3 text-xs'>{t('dashboard:metricsHint')}</p>
          {summaryQuery.isLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='size-6 animate-spin text-muted-foreground' />
            </div>
          ) : summaryQuery.isError ? (
            <p className='text-muted-foreground text-sm'>{t('dashboard:noData')}</p>
          ) : summaryQuery.data ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'>
              {metricCard(t('dashboard:metricMembersApprox'), summaryQuery.data.approximateMemberCount ?? '—')}
              {metricCard(t('dashboard:metricOnlineApprox'), summaryQuery.data.approximatePresenceCount ?? '—')}
              {metricCard(t('dashboard:metricDau'), summaryQuery.data.dauToday)}
              {metricCard(t('dashboard:metricWau'), summaryQuery.data.wau7)}
              {metricCard(t('dashboard:metricMau'), summaryQuery.data.mau30)}
              {metricCard(t('dashboard:metricMessages30d'), summaryQuery.data.messagesInRange)}
              {metricCard(t('dashboard:metricJoins30d'), summaryQuery.data.joinCount)}
              {metricCard(t('dashboard:metricLeaves30d'), summaryQuery.data.leaveCount)}
              {metricCard(t('dashboard:metricOpenTickets'), summaryQuery.data.openTickets)}
              {metricCard(t('dashboard:metricPendingReply'), summaryQuery.data.pendingStaffReplyTickets)}
              {metricCard(t('dashboard:ticketUnread'), summaryQuery.data.unreadTicketsForStaff)}
            </div>
          ) : null}
        </div>

        <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {menuCards.map((item) => {
            const href = item.url
            const { to, search } = splitHrefPathAndSearch(href)
            const title = item.titleKey ? t(item.titleKey) : item.title
            const Icon = item.icon
            const descriptionKey = 'descriptionKey' in item ? item.descriptionKey : undefined

            return (
              <Link key={item.url} to={to} {...(search ? { search } : {})} className='block h-full'>
                <Card className='group h-full cursor-pointer border border-border/80 bg-card transition-all duration-200 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md'>
                  <CardHeader className='flex flex-row items-start gap-4 space-y-0 p-5 pb-3'>
                    {Icon && (
                      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20'>
                        <Icon className='h-5 w-5' strokeWidth={2} />
                      </span>
                    )}
                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <CardTitle className='text-sm font-semibold leading-tight'>
                          {title}
                        </CardTitle>
                        <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                      </div>
                      {descriptionKey && (
                        <p className='text-muted-foreground text-xs leading-snug'>
                          {t(descriptionKey)}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </Main>
    </>
  )
}
