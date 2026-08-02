import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  feedAnnouncementApi,
  type DiscordChannel,
  type DiscordRole,
  type FeedSubscriptionDto,
  type UpsertFeedSubscriptionDto,
} from '@/lib/api'
import { Loader2, RefreshCw, Save, Trash2 } from 'lucide-react'

type FeedType = UpsertFeedSubscriptionDto['type']

const fixedFeedBases: Partial<Record<FeedType, string>> = {
  youtube: 'https://www.youtube.com/',
  twitch: 'https://www.twitch.tv/',
}

const defaultDraft: UpsertFeedSubscriptionDto = {
  type: 'rss',
  url: '',
  targetChannelId: '',
  mentionRoleId: null,
  enabled: true,
  pollIntervalSeconds: 900,
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('tr-TR')
}

function isFixedBaseFeedType(type: FeedType) {
  return type === 'youtube' || type === 'twitch'
}

function stripFeedBase(type: FeedType, value: string) {
  const trimmed = value.trim()
  if (!isFixedBaseFeedType(type)) return trimmed

  return trimmed
    .replace(/^https?:\/\/(www\.)?youtube\.com\//i, '')
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
    .replace(/^\/+/, '')
}

function normalizeFeedUrl(type: FeedType, value: string) {
  if (!isFixedBaseFeedType(type)) return value.trim()
  const path = stripFeedBase(type, value)
  const base = fixedFeedBases[type] ?? ''
  return path ? `${base}${path}` : ''
}

export function BotFeeds() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({
    guildId,
    featureName: 'feed-announcement',
    featureDisplayName: t('feeds:featureDisplayName'),
  })

  const [draft, setDraft] = React.useState<UpsertFeedSubscriptionDto>(defaultDraft)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState('')

  React.useEffect(() => {
    setEditingId(null)
    setDraft(defaultDraft)
    setPreviewUrl('')
  }, [guildId])

  const subscriptionsQuery = useQuery({
    queryKey: ['feed-subscriptions', guildId],
    queryFn: () => feedAnnouncementApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  const deliveriesQuery = useQuery({
    queryKey: ['feed-deliveries', guildId],
    queryFn: () => feedAnnouncementApi.getDeliveries(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (!guildId) return
    setChannelsLoading(true)
    discordApi.getChannels(guildId)
      .then((data) => setChannels([...data.channels].sort((a, b) => a.position - b.position)))
      .catch(() => toast.error(t('common:channelsLoadError')))
      .finally(() => setChannelsLoading(false))

    setRolesLoading(true)
    discordApi.getRoles(guildId)
      .then((data) => setRoles([...data.roles].sort((a, b) => b.position - a.position)))
      .catch(() => toast.error(t('common:rolesLoadError')))
      .finally(() => setRolesLoading(false))
  }, [guildId])

  const saveMutation = useMutation({
    mutationFn: (data: UpsertFeedSubscriptionDto) => feedAnnouncementApi.upsert(guildId, data),
    onSuccess: () => {
      toast.success(t('feeds:subscriptionSaved'))
      setDraft(defaultDraft)
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['feed-subscriptions', guildId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('feeds:saveError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => feedAnnouncementApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('feeds:subscriptionDeleted'))
      queryClient.invalidateQueries({ queryKey: ['feed-subscriptions', guildId] })
      queryClient.invalidateQueries({ queryKey: ['feed-deliveries', guildId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('feeds:deleteError')),
  })

  const previewMutation = useMutation({
    mutationFn: () => feedAnnouncementApi.preview(guildId, normalizeFeedUrl(draft.type, previewUrl || draft.url)),
    onSuccess: (preview) => {
      toast.success(t('feeds:previewRead', { title: preview.title, count: preview.items.length }))
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('feeds:previewError')),
  })

  const startEdit = React.useCallback((item: FeedSubscriptionDto) => {
    setEditingId(item.id)
    setDraft({
      id: item.id,
      type: item.type,
      url: item.url,
      externalId: item.externalId,
      targetChannelId: item.targetChannelId,
      mentionRoleId: item.mentionRoleId,
      enabled: item.enabled,
      pollIntervalSeconds: item.pollIntervalSeconds,
    })
    setPreviewUrl(item.url)
  }, [])

  const { mutate: deleteFeed } = deleteMutation

  const subscriptionColumns = React.useMemo<ColumnDef<FeedSubscriptionDto, any>[]>(
    () => [
      {
        accessorKey: 'url',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colSource')} />,
        cell: ({ row }) => (
          <div>
            <div className='font-medium'>{row.original.url}</div>
            <div className='text-muted-foreground text-xs'>
              {row.original.type} · {row.original.pollIntervalSeconds}s
            </div>
          </div>
        ),
      },
      {
        id: 'channel',
        meta: { className: 'hidden md:table-cell' },
        accessorFn: (item: any) =>
          `#${channels.find((c) => c.id === item.targetChannelId)?.name ?? item.targetChannelId}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colChannel')} />,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        accessorKey: 'enabled',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colStatus')} />,
        cell: ({ row }) => (
          <>
            <Badge variant={row.original.enabled ? 'default' : 'secondary'}>
              {row.original.enabled ? t('feeds:statusActive') : t('feeds:statusPassive')}
            </Badge>
            {row.original.errorCount > 0 && (
              <Badge variant='destructive' className='ms-2'>
                {t('feeds:errorCount', { count: row.original.errorCount })}
              </Badge>
            )}
          </>
        ),
      },
      {
        accessorKey: 'lastSuccessAt',
        meta: { className: 'hidden lg:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colLastSuccess')} />,
        cell: ({ row }) => formatDate(row.original.lastSuccessAt),
      },
      {
        accessorKey: 'lastErrorAt',
        meta: { className: 'hidden lg:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colLastError')} />,
        cell: ({ row }) => (
          <span className='text-muted-foreground text-xs'>{formatDate(row.original.lastErrorAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('feeds:colActions')}</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button variant='ghost' size='sm' onClick={() => startEdit(row.original)}>
              {t('feeds:edit')}
            </Button>
            <Button variant='ghost' size='sm' onClick={() => deleteFeed(row.original.id)}>
              <Trash2 className='size-4' />
            </Button>
          </div>
        ),
      },
    ],
    [channels, startEdit, deleteFeed, t]
  )

  const deliveryColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'itemId',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colItem')} />,
        cell: ({ row }) => <span className='block max-w-[420px] truncate'>{row.original.itemId}</span>,
      },
      {
        accessorKey: 'messageId',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colMessage')} />,
        cell: ({ row }) => row.original.messageId || '-',
      },
      {
        accessorKey: 'deliveredAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('feeds:colDate')} />,
        cell: ({ row }) => formatDate(row.original.deliveredAt),
      },
    ],
    [t]
  )

  const submit = () => {
    const url = normalizeFeedUrl(draft.type, draft.url)
    if (!url) return toast.error(isFixedBaseFeedType(draft.type) ? t('feeds:sourcePathRequired') : t('feeds:feedUrlRequired'))
    if (!draft.targetChannelId) return toast.error(t('feeds:targetChannelRequired'))
    saveMutation.mutate({ ...draft, id: editingId ?? undefined, url })
  }

  if (subscriptionsQuery.isLoading) {
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
            <h1 className='text-2xl font-bold tracking-tight'>{t('feeds:pageTitle')}</h1>
            <p className='text-muted-foreground'>
              {t('feeds:pageDescription')}
            </p>
          </div>
          <FeatureDisableButton
            guildId={guildId}
            featureName='feed-announcement'
            featureDisplayName={t('feeds:featureDisplayName')}
            confirmDescription={t('feeds:confirmDescription')}
          />
        </div>

        <div className='grid gap-4 lg:grid-cols-[420px_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? t('feeds:editFeed') : t('feeds:newFeed')}</CardTitle>
              <CardDescription>{t('feeds:privateBlockedNote')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-2'>
                <Label>{t('feeds:typeLabel')}</Label>
                <Select value={draft.type} onValueChange={(value: FeedType) => setDraft((s) => ({
                  ...s,
                  type: value,
                  url: normalizeFeedUrl(value, stripFeedBase(value, s.url)),
                }))}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='rss'>RSS / Atom</SelectItem>
                    <SelectItem value='youtube'>YouTube</SelectItem>
                    <SelectItem value='twitch'>Twitch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label>{isFixedBaseFeedType(draft.type) ? t('feeds:sourcePathLabel') : t('feeds:feedUrlLabel')}</Label>
                <div className='flex overflow-hidden rounded-md border bg-background'>
                  {isFixedBaseFeedType(draft.type) && (
                    <span className='flex items-center border-e bg-muted px-3 text-sm text-muted-foreground'>
                      {fixedFeedBases[draft.type]?.replace(/^https?:\/\/(www\.)?/i, '')}
                    </span>
                  )}
                  <Input
                    className='border-0 shadow-none focus-visible:ring-0'
                    value={isFixedBaseFeedType(draft.type) ? stripFeedBase(draft.type, draft.url) : draft.url}
                    onChange={(e) => {
                      const url = normalizeFeedUrl(draft.type, e.target.value)
                      setDraft((s) => ({ ...s, url }))
                      setPreviewUrl(url)
                    }}
                    placeholder={isFixedBaseFeedType(draft.type) ? t('feeds:sourcePathPlaceholder') : t('feeds:feedUrlPlaceholder')}
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  {isFixedBaseFeedType(draft.type)
                    ? t('feeds:sourcePathHint')
                    : t('feeds:feedUrlHint')}
                </p>
              </div>

              <div className='grid gap-2'>
                <Label>{t('feeds:targetChannelLabel')}</Label>
                <Select value={draft.targetChannelId} onValueChange={(value) => setDraft((s) => ({ ...s, targetChannelId: value }))}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={channelsLoading ? t('feeds:channelsLoading') : t('feeds:selectChannel')} />
                  </SelectTrigger>
                  <SearchableSelectContent
                    items={channels.map((channel) => ({ value: channel.id, label: `#${channel.name}` }))}
                    searchPlaceholder={t('feeds:searchChannel')}
                    loading={channelsLoading}
                  />
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label>{t('feeds:mentionRoleLabel')}</Label>
                <Select
                  value={draft.mentionRoleId || 'none'}
                  onValueChange={(value) => setDraft((s) => ({ ...s, mentionRoleId: value === 'none' ? null : value }))}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={rolesLoading ? t('feeds:rolesLoading') : t('feeds:selectRole')} />
                  </SelectTrigger>
                  <SearchableSelectContent
                    items={[
                      { value: 'none', label: t('feeds:noRoleMention') },
                      ...roles.map((role) => ({ value: role.id, label: `@${role.name}` })),
                    ]}
                    searchPlaceholder={t('feeds:searchRole')}
                    loading={rolesLoading}
                  />
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label>{t('feeds:pollIntervalLabel')}</Label>
                <Input
                  type='number'
                  min={300}
                  max={86400}
                  value={draft.pollIntervalSeconds}
                  onChange={(e) => setDraft((s) => ({ ...s, pollIntervalSeconds: Number(e.target.value) }))}
                />
              </div>

              <div className='flex items-center justify-between rounded-md border p-3'>
                <div>
                  <Label>{t('feeds:enabledLabel')}</Label>
                  <p className='text-xs text-muted-foreground'>{t('feeds:enabledHint')}</p>
                </div>
                <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((s) => ({ ...s, enabled }))} />
              </div>

              <div className='flex gap-2'>
                <Button onClick={submit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
                  {t('feeds:save')}
                </Button>
                <Button variant='outline' onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !draft.url}>
                  {previewMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <RefreshCw className='mr-2 size-4' />}
                  {t('feeds:test')}
                </Button>
              </div>

              {previewMutation.data && (
                <div className='rounded-md border p-3 text-sm'>
                  <div className='font-medium'>{previewMutation.data.title}</div>
                  <ul className='mt-2 list-inside list-disc space-y-1 text-muted-foreground'>
                    {previewMutation.data.items.map((item) => <li key={item.id}>{item.title}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>{t('feeds:subscriptionsTitle')}</CardTitle>
                <CardDescription>{t('feeds:subscriptionsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleDataTable
                  columns={subscriptionColumns}
                  data={subscriptionsQuery.data ?? []}
                  searchPlaceholder={t('feeds:subscriptionsSearchPlaceholder')}
                  emptyMessage={t('feeds:subscriptionsEmpty')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('feeds:deliveriesTitle')}</CardTitle>
                <CardDescription>{t('feeds:deliveriesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleDataTable
                  columns={deliveryColumns}
                  data={deliveriesQuery.data ?? []}
                  searchPlaceholder={t('feeds:deliveriesSearchPlaceholder')}
                  emptyMessage={t('feeds:deliveriesEmpty')}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
