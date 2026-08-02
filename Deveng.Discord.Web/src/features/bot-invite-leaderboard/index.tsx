import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { inviteLeaderboardApi } from '@/lib/api'
import { Loader2, RefreshCw, Trophy } from 'lucide-react'

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function previousMonthKey() {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('tr-TR')
}

export function BotInviteLeaderboard() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [periodKey, setPeriodKey] = React.useState('all')
  const { renderFeatureGate } = useFeatureGate({
    guildId,
    featureName: 'invite-leaderboard',
    featureDisplayName: t('inviteLeaderboard:featureDisplayName'),
  })

  const leaderboardQuery = useQuery({
    queryKey: ['invite-leaderboard', guildId, periodKey],
    queryFn: () => inviteLeaderboardApi.getLeaderboard(guildId, periodKey),
    enabled: !!guildId,
  })

  const contributionsQuery = useQuery({
    queryKey: ['invite-contributions', guildId],
    queryFn: () => inviteLeaderboardApi.getContributions(guildId),
    enabled: !!guildId,
  })

  const snapshotsQuery = useQuery({
    queryKey: ['invite-snapshots', guildId],
    queryFn: () => inviteLeaderboardApi.getSnapshots(guildId),
    enabled: !!guildId,
  })

  const sourceBreakdown = React.useMemo(() => {
    const rows = contributionsQuery.data ?? []
    const counts = new Map<string, number>()
    for (const r of rows) {
      const k = r.sourceType || 'unknown'
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [contributionsQuery.data])

  const leaderboardColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'rank',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('inviteLeaderboard:columnRank')} />,
        cell: ({ row }) => <span className='font-medium'>{row.original.rank}</span>,
      },
      {
        accessorKey: 'userId',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('inviteLeaderboard:columnUser')} />,
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.userId}</span>,
      },
      {
        accessorKey: 'count',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('inviteLeaderboard:columnInvites')} />,
        cell: ({ row }) => (
          <Badge>
            <Trophy className='mr-1 size-3' /> {row.original.count}
          </Badge>
        ),
      },
      {
        accessorKey: 'lastContributedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('inviteLeaderboard:columnLastContribution')} />,
        cell: ({ row }) => formatDate(row.original.lastContributedAt),
      },
    ],
    [t]
  )

  if (leaderboardQuery.isLoading) {
    return (
      <>
        <Main>
          <div className='flex min-h-[60vh] items-center justify-center'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  const refresh = () => {
    leaderboardQuery.refetch()
    contributionsQuery.refetch()
    snapshotsQuery.refetch()
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('inviteLeaderboard:pageTitle')}</h1>
            <p className='text-muted-foreground'>
              {t('inviteLeaderboard:pageDescription')}
            </p>
          </div>
          <FeatureDisableButton
            guildId={guildId}
            featureName='invite-leaderboard'
            featureDisplayName={t('inviteLeaderboard:featureDisplayName')}
            confirmDescription={t('inviteLeaderboard:disableConfirmDescription')}
          />
        </div>

        <div className='mb-4 flex items-center gap-2'>
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className='w-full sm:w-[220px]'><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('inviteLeaderboard:periodAllTime')}</SelectItem>
              <SelectItem value={currentMonthKey()}>{t('inviteLeaderboard:periodCurrentMonth', { month: currentMonthKey() })}</SelectItem>
              <SelectItem value={previousMonthKey()}>{t('inviteLeaderboard:periodPreviousMonth', { month: previousMonthKey() })}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='outline' onClick={refresh}>
            <RefreshCw className='mr-2 size-4' /> {t('inviteLeaderboard:refresh')}
          </Button>
        </div>

        {sourceBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>{t('inviteLeaderboard:sourceSummaryTitle')}</CardTitle>
              <CardDescription>{t('inviteLeaderboard:sourceSummaryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              {sourceBreakdown.map(([k, n]) => (
                <Badge key={k} variant='secondary'>{k}: {n}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <div className='grid gap-4 lg:grid-cols-[1fr_minmax(0,420px)]'>
          <Card>
            <CardHeader>
              <CardTitle>{t('inviteLeaderboard:leaderboardTitle')}</CardTitle>
              <CardDescription>{t('inviteLeaderboard:leaderboardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleDataTable
                columns={leaderboardColumns}
                data={(leaderboardQuery.data ?? []).map((entry, index) => ({
                  ...entry,
                  rank: index + 1,
                }))}
                searchPlaceholder={t('inviteLeaderboard:searchPlaceholder')}
                emptyMessage={t('inviteLeaderboard:emptyLeaderboard')}
              />
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>{t('inviteLeaderboard:recentContributionsTitle')}</CardTitle>
                <CardDescription>{t('inviteLeaderboard:recentContributionsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {(contributionsQuery.data ?? []).slice(0, 10).map((item) => (
                    <div key={item.id} className='rounded-md border p-3 text-sm'>
                      <div className='flex justify-between gap-2'>
                        <span className='font-medium'>{item.inviterUserId ?? t('inviteLeaderboard:unknownSource')}</span>
                        <Badge variant='secondary'>{item.sourceType}</Badge>
                      </div>
                      <div className='mt-1 text-muted-foreground'>{t('inviteLeaderboard:joinedLabel', { user: item.joinedUserId })}</div>
                      <div className='text-muted-foreground'>{t('inviteLeaderboard:codeLabel', { code: item.inviteCode ?? '-' })}</div>
                      <div className='text-muted-foreground'>{formatDate(item.joinedAt)}</div>
                    </div>
                  ))}
                  {(contributionsQuery.data ?? []).length === 0 && <p className='text-sm text-muted-foreground'>{t('inviteLeaderboard:emptyContributions')}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('inviteLeaderboard:snapshotSummaryTitle')}</CardTitle>
                <CardDescription>{t('inviteLeaderboard:snapshotSummaryDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2 text-sm'>
                  {(snapshotsQuery.data ?? []).slice(0, 8).map((snapshot) => (
                    <div key={snapshot.inviteCode} className='flex items-center justify-between rounded-md border p-2'>
                      <span className='font-mono'>{snapshot.inviteCode}</span>
                      <span>{t('inviteLeaderboard:usesLabel', { count: snapshot.uses })}</span>
                    </div>
                  ))}
                  {(snapshotsQuery.data ?? []).length === 0 && <p className='text-muted-foreground'>{t('inviteLeaderboard:emptySnapshots')}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
