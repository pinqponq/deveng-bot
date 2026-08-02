import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import {
  discordApi,
  moderationLogsApi,
  type DiscordChannel,
  type ModerationActionLogDto,
} from '@/lib/api'
import { Loader2, RefreshCw } from 'lucide-react'

type Filters = {
  source: string
  action: string
  ruleType: string
  channelId: string
  userIdHash: string
  from: string
  to: string
}

const defaultFilters: Filters = {
  source: 'all',
  action: 'all',
  ruleType: 'all',
  channelId: 'all',
  userIdHash: '',
  from: '',
  to: '',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR')
}

function safeJson(value?: string | null) {
  if (!value) return null
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'failed' || status === 'error') return 'destructive'
  if (status === 'applied' || status === 'success') return 'default'
  return 'secondary'
}

const QUERY_LIMIT = 100

export function BotModerationLogs() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({
    guildId,
    featureName: 'moderation-logs',
    featureDisplayName: t('moderationLogs:featureDisplayName'),
  })

  const sourceLabels = React.useMemo<Record<string, string>>(
    () => ({
      all: t('moderationLogs:sourceAll'),
      keyword: t('moderationLogs:sourceKeyword'),
      ai: t('moderationLogs:sourceAi'),
      manual: t('moderationLogs:sourceManual'),
    }),
    [t]
  )

  const actionOptions = React.useMemo(
    () => [
      { value: 'all', label: t('moderationLogs:actionAll') },
      { value: 'none', label: t('moderationLogs:actionNone') },
      { value: 'warn', label: t('moderationLogs:actionWarn') },
      { value: 'delete', label: t('moderationLogs:actionDelete') },
      { value: 'delete_and_warn', label: t('moderationLogs:actionDeleteAndWarn') },
      { value: 'notice', label: t('moderationLogs:actionNotice') },
    ],
    [t]
  )

  const ruleTypeOptions = React.useMemo(
    () => [
      { value: 'all', label: t('moderationLogs:ruleTypeAll') },
      { value: 'ForbiddenWords', label: t('moderationLogs:ruleForbiddenWords') },
      { value: 'RepeatedText', label: t('moderationLogs:ruleRepeatedText') },
      { value: 'ServerInvites', label: t('moderationLogs:ruleServerInvites') },
      { value: 'ExternalLinks', label: t('moderationLogs:ruleExternalLinks') },
      { value: 'ExcessiveCaps', label: t('moderationLogs:ruleExcessiveCaps') },
      { value: 'ExcessiveEmoji', label: t('moderationLogs:ruleExcessiveEmoji') },
      { value: 'ExcessiveSpoiler', label: t('moderationLogs:ruleExcessiveSpoiler') },
      { value: 'ExcessiveMention', label: t('moderationLogs:ruleExcessiveMention') },
      { value: 'Zalgo', label: t('moderationLogs:ruleZalgo') },
      { value: 'SpamProtection', label: t('moderationLogs:ruleSpamProtection') },
    ],
    [t]
  )

  const statusLabels = React.useMemo<Record<string, string>>(
    () => ({
      applied: t('moderationLogs:statusApplied'),
      success: t('moderationLogs:statusSuccess'),
      recommended: t('moderationLogs:statusRecommended'),
      failed: t('moderationLogs:statusFailed'),
      error: t('moderationLogs:statusError'),
      notice_sent: t('moderationLogs:statusNoticeSent'),
      notice_failed: t('moderationLogs:statusNoticeFailed'),
    }),
    [t]
  )
  const [filters, setFilters] = React.useState<Filters>(defaultFilters)
  const [selected, setSelected] = React.useState<ModerationActionLogDto | null>(null)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)

  const query = useQuery({
    queryKey: ['moderation-logs', guildId, filters],
    queryFn: () => moderationLogsApi.query(guildId, {
      source: filters.source === 'all' ? undefined : filters.source,
      action: filters.action === 'all' ? undefined : filters.action,
      ruleType: filters.ruleType === 'all' ? undefined : filters.ruleType,
      channelId: filters.channelId === 'all' ? undefined : filters.channelId,
      userIdHash: filters.userIdHash || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      limit: QUERY_LIMIT,
    }),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (!guildId) return
    setChannelsLoading(true)
    discordApi.getChannels(guildId)
      .then((data) => setChannels([...data.channels].sort((a, b) => a.position - b.position)))
      .catch(() => setChannels([]))
      .finally(() => setChannelsLoading(false))
  }, [guildId])

  const logColumns = React.useMemo<ColumnDef<ModerationActionLogDto, any>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnTime')} />,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: 'source',
        meta: { className: 'hidden md:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnSource')} />,
        cell: ({ row }) => (
          <Badge variant='secondary'>{sourceLabels[row.original.source] ?? row.original.source}</Badge>
        ),
      },
      {
        accessorKey: 'ruleType',
        meta: { className: 'hidden md:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnRule')} />,
        cell: ({ row }) =>
          ruleTypeOptions.find((o) => o.value === row.original.ruleType)?.label ??
          row.original.ruleType ??
          '-',
      },
      {
        accessorKey: 'action',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnAction')} />,
        cell: ({ row }) =>
          actionOptions.find((o) => o.value === row.original.action)?.label ?? row.original.action,
      },
      {
        id: 'channel',
        meta: { className: 'hidden lg:table-cell' },
        accessorFn: (log: any) =>
          log.channelId
            ? `#${channels.find((c) => c.id === log.channelId)?.name ?? log.channelId}`
            : '-',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnChannel')} />,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        accessorKey: 'actionStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('moderationLogs:columnStatus')} />,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.actionStatus)}>
            {statusLabels[row.original.actionStatus] ?? row.original.actionStatus}
          </Badge>
        ),
      },
    ],
    [channels, sourceLabels, ruleTypeOptions, actionOptions, statusLabels, t]
  )

  if (query.isLoading) {
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

  return renderFeatureGate(
    <>
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('moderationLogs:pageTitle')}</h1>
            <p className='text-muted-foreground'>{t('moderationLogs:pageDescription')}</p>
          </div>
          <FeatureDisableButton
            guildId={guildId}
            featureName='moderation-logs'
            featureDisplayName={t('moderationLogs:featureDisplayName')}
            confirmDescription={t('moderationLogs:disableConfirmDescription')}
          />
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>{t('moderationLogs:filtersTitle')}</CardTitle>
            <CardDescription>{t('moderationLogs:filtersDescription')}</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-4'>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelSource')}</Label>
              <Select value={filters.source} onValueChange={(source) => setFilters((s) => ({ ...s, source }))}>
                <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelAction')}</Label>
              <Select value={filters.action} onValueChange={(action) => setFilters((s) => ({ ...s, action }))}>
                <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {actionOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelRuleType')}</Label>
              <Select value={filters.ruleType} onValueChange={(ruleType) => setFilters((s) => ({ ...s, ruleType }))}>
                <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ruleTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelChannel')}</Label>
              <Select value={filters.channelId} onValueChange={(channelId) => setFilters((s) => ({ ...s, channelId }))}>
                <SelectTrigger className='w-full'><SelectValue placeholder={channelsLoading ? t('moderationLogs:channelsLoading') : t('moderationLogs:channelSelectPlaceholder')} /></SelectTrigger>
                <SearchableSelectContent
                  items={[
                    { value: 'all', label: t('moderationLogs:channelAll') },
                    ...channels.map((channel) => ({ value: channel.id, label: `#${channel.name}` })),
                  ]}
                  searchPlaceholder={t('moderationLogs:channelSearchPlaceholder')}
                  loading={channelsLoading}
                />
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelUserHash')}</Label>
              <Input value={filters.userIdHash} onChange={(e) => setFilters((s) => ({ ...s, userIdHash: e.target.value }))} />
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelFrom')}</Label>
              <Input type='datetime-local' value={filters.from} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))} />
            </div>
            <div className='grid gap-2'>
              <Label>{t('moderationLogs:labelTo')}</Label>
              <Input type='datetime-local' value={filters.to} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))} />
            </div>
            <div className='flex items-end gap-2'>
              <Button variant='outline' onClick={() => query.refetch()}>
                <RefreshCw className='mr-2 size-4' /> {t('moderationLogs:refresh')}
              </Button>
              <Button variant='ghost' onClick={() => setFilters(defaultFilters)}>{t('moderationLogs:clear')}</Button>
            </div>
          </CardContent>
        </Card>

        <div className='grid gap-4 lg:grid-cols-[1fr_minmax(0,420px)]'>
          <Card>
            <CardHeader>
              <CardTitle>{t('moderationLogs:recordsTitle')}</CardTitle>
              <CardDescription>
                {t('moderationLogs:recordsDescription', { limit: QUERY_LIMIT })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleDataTable
                columns={logColumns}
                data={query.data ?? []}
                searchPlaceholder={t('moderationLogs:recordsSearchPlaceholder')}
                emptyMessage={t('moderationLogs:recordsEmpty')}
                onRowClick={(log) => setSelected(log)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('moderationLogs:detailTitle')}</CardTitle>
              <CardDescription>{t('moderationLogs:detailDescription')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {selected ? (
                <>
                  <div className='grid gap-1 text-sm'>
                    <span className='text-muted-foreground'>{t('moderationLogs:detailRecordId')}</span>
                    <span className='font-medium'>{selected.id}</span>
                  </div>
                  <div className='grid gap-1 text-sm'>
                    <span className='text-muted-foreground'>{t('moderationLogs:detailMessage')}</span>
                    <span>{selected.messageId || '-'}</span>
                  </div>
                  <div className='grid gap-1 text-sm'>
                    <span className='text-muted-foreground'>{t('moderationLogs:detailReason')}</span>
                    <span>{selected.reasonKey || '-'}</span>
                  </div>
                  <div className='grid gap-1 text-sm'>
                    <span className='text-muted-foreground'>{t('moderationLogs:detailNoticeError')}</span>
                    <span>{selected.errorCode || t('moderationLogs:detailNoError')}</span>
                  </div>
                  <div className='grid gap-2'>
                    <Label>{t('moderationLogs:detailReasonParams')}</Label>
                    <pre className='max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs'>{safeJson(selected.reasonParamsJson) || '-'}</pre>
                  </div>
                  <div className='grid gap-2'>
                    <Label>{t('moderationLogs:detailScoreSnapshot')}</Label>
                    <pre className='max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs'>{safeJson(selected.scoreSnapshotJson) || '-'}</pre>
                  </div>
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('moderationLogs:detailEmpty')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
