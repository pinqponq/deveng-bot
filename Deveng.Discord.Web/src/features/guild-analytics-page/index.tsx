import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { guildAnalyticsApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export function GuildAnalyticsPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { guildId } = useParams({ from: '/_authenticated/dashboard/$guildId/guild-analytics' })
  const summaryQuery = useQuery({
    queryKey: ['guild-analytics-summary', guildId],
    queryFn: () => guildAnalyticsApi.getSummary(guildId),
    enabled: !!guildId,
  })

  if (summaryQuery.isLoading) {
    return (
      <Main>
        <div className='flex min-h-[40vh] items-center justify-center'>
          <Loader2 className='size-8 animate-spin' />
        </div>
      </Main>
    )
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Main>
        <p className='text-muted-foreground text-sm'>{t('common:listLoadError')}</p>
      </Main>
    )
  }

  const s = summaryQuery.data

  const stat = (label: string, value: string | number) => (
    <Card>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-2xl'>{value}</CardTitle>
      </CardHeader>
    </Card>
  )

  return (
    <Main>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold tracking-tight'>{t('dashboard:analyticsPageTitle')}</h1>
        <p className='text-muted-foreground mt-1 text-sm'>{t('dashboard:analyticsPageSubtitle')}</p>
      </div>

      <div className='mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {stat(t('dashboard:metricMembers'), s.approximateMemberCount ?? '—')}
        {stat(t('dashboard:metricPresence'), s.approximatePresenceCount ?? '—')}
        {stat(t('dashboard:metricDau'), s.dauToday)}
        {stat(t('dashboard:metricWau'), s.wau7)}
        {stat(t('dashboard:metricMau'), s.mau30)}
        {stat(t('dashboard:metricMessagesRange'), s.messagesInRange)}
        {stat(t('dashboard:metricActiveUsersRange'), s.distinctActiveUsersInRange)}
        {stat(t('dashboard:metricJoins'), s.joinCount)}
        {stat(t('dashboard:metricLeaves'), s.leaveCount)}
        {stat(t('dashboard:metricNet'), s.netMemberDeltaInRange)}
        {stat(t('dashboard:metricInviteJoins'), s.inviteJoinsInRange)}
        {stat(t('dashboard:metricModeration'), s.moderationActionsInRange)}
        {stat(t('dashboard:metricOpenTickets'), s.openTickets)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:analyticsRangeNoteTitle')}</CardTitle>
          <CardDescription>{t('dashboard:analyticsRangeNote')}</CardDescription>
        </CardHeader>
      </Card>
    </Main>
  )
}
