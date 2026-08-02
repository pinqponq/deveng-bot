import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select'
import { discordApi, scheduledAnnouncementApi, type DiscordChannel, type ScheduledAnnouncementDto, type UpsertScheduledAnnouncementDto } from '@/lib/api'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Trash2 } from 'lucide-react'

const defaultDraft: UpsertScheduledAnnouncementDto = {
  channelId: '',
  title: '',
  content: '',
  mentionPolicy: 'none',
  timezone: 'Europe/Istanbul',
  scheduleType: 'once',
  sendAtUtc: '',
  nextRunAtUtc: '',
  paused: false,
  enabled: true,
}

function toLocalInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('tr-TR') : '-'
}

export function BotScheduledAnnouncement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'scheduled-announcement', featureDisplayName: t('scheduledAnnouncement:featureDisplayName') })
  const [draft, setDraft] = React.useState<UpsertScheduledAnnouncementDto>(defaultDraft)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])

  const announcementsQuery = useQuery({
    queryKey: ['scheduled-announcements', guildId],
    queryFn: () => scheduledAnnouncementApi.getByGuildId(guildId),
    enabled: !!guildId,
  })
  const runsQuery = useQuery({
    queryKey: ['scheduled-announcement-runs', guildId],
    queryFn: () => scheduledAnnouncementApi.getRuns(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (!guildId) return
    discordApi.getChannels(guildId)
      .then((data) => setChannels([...data.channels].sort((a, b) => a.position - b.position)))
      .catch(() => toast.error(t('common:channelsLoadError')))
  }, [guildId])

  const saveMutation = useMutation({
    mutationFn: () => scheduledAnnouncementApi.upsert(guildId, { ...draft, id: editingId ?? undefined, sendAtUtc: fromLocalInput(draft.sendAtUtc || ''), nextRunAtUtc: fromLocalInput(draft.nextRunAtUtc || draft.sendAtUtc || '') }),
    onSuccess: () => {
      toast.success(t('scheduledAnnouncement:saved'))
      setDraft(defaultDraft)
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements', guildId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('scheduledAnnouncement:saveError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scheduledAnnouncementApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('scheduledAnnouncement:deleted'))
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements', guildId] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcement-runs', guildId] })
    },
  })

  const startEdit = (item: ScheduledAnnouncementDto) => {
    setEditingId(item.id)
    setDraft({
      id: item.id,
      channelId: item.channelId,
      title: item.title,
      content: item.content,
      mentionPolicy: item.mentionPolicy,
      timezone: item.timezone,
      scheduleType: item.scheduleType,
      sendAtUtc: toLocalInput(item.sendAtUtc),
      nextRunAtUtc: toLocalInput(item.nextRunAtUtc),
      paused: item.paused,
      enabled: item.enabled,
    })
  }

  if (announcementsQuery.isLoading) {
    return (
      <>
        <Main><div className='flex min-h-[60vh] items-center justify-center'><Loader2 className='size-8 animate-spin' /></div></Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('scheduledAnnouncement:pageTitle')}</h1>
            <p className='text-muted-foreground'>{t('scheduledAnnouncement:pageDescription')}</p>
          </div>
          <FeatureDisableButton guildId={guildId} featureName='scheduled-announcement' featureDisplayName={t('scheduledAnnouncement:featureDisplayName')} confirmDescription={t('scheduledAnnouncement:confirmDescription')} />
        </div>

        <div className='grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]'>
          <Card>
            <CardHeader><CardTitle>{editingId ? t('scheduledAnnouncement:editAnnouncement') : t('scheduledAnnouncement:newAnnouncement')}</CardTitle><CardDescription>{t('scheduledAnnouncement:formDescription')}</CardDescription></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-2'>
                <Label>{t('scheduledAnnouncement:channel')}</Label>
                <Select value={draft.channelId} onValueChange={(channelId) => setDraft((s) => ({ ...s, channelId }))}>
                  <SelectTrigger className='w-full'><SelectValue placeholder={t('scheduledAnnouncement:channelPlaceholder')} /></SelectTrigger>
                  <SearchableSelectContent items={channels.map((c) => ({ value: c.id, label: `#${c.name}` }))} />
                </Select>
              </div>
              <div className='grid gap-2'><Label>{t('scheduledAnnouncement:title')}</Label><Input value={draft.title || ''} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} /></div>
              <div className='grid gap-2'><Label>{t('scheduledAnnouncement:content')}</Label><Textarea value={draft.content || ''} onChange={(e) => setDraft((s) => ({ ...s, content: e.target.value }))} /></div>
              <div className='grid gap-2'><Label>{t('scheduledAnnouncement:sendTime')}</Label><Input type='datetime-local' value={draft.sendAtUtc || ''} onChange={(e) => setDraft((s) => ({ ...s, sendAtUtc: e.target.value, nextRunAtUtc: e.target.value }))} /></div>
              <div className='flex items-center justify-between rounded-md border p-3'><Label>{t('scheduledAnnouncement:active')}</Label><Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((s) => ({ ...s, enabled }))} /></div>
              <div className='flex items-center justify-between rounded-md border p-3'><Label>{t('scheduledAnnouncement:pause')}</Label><Switch checked={draft.paused} onCheckedChange={(paused) => setDraft((s) => ({ ...s, paused }))} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />} {t('scheduledAnnouncement:save')}</Button>
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card>
              <CardHeader><CardTitle>{t('scheduledAnnouncement:announcements')}</CardTitle></CardHeader>
              <CardContent className='space-y-3'>
                {(announcementsQuery.data ?? []).map((item) => (
                  <div key={item.id} className='rounded-md border p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div><div className='font-medium'>{item.title || t('scheduledAnnouncement:untitled')}</div><div className='text-sm text-muted-foreground'>#{channels.find((c) => c.id === item.channelId)?.name ?? item.channelId} · {t('scheduledAnnouncement:nextLabel')}: {formatDate(item.nextRunAtUtc)}</div></div>
                      <Badge variant={item.enabled && !item.paused ? 'default' : 'secondary'}>{item.enabled && !item.paused ? t('scheduledAnnouncement:active') : t('scheduledAnnouncement:inactive')}</Badge>
                    </div>
                    <div className='mt-3 flex gap-2'><Button size='sm' variant='outline' onClick={() => startEdit(item)}>{t('scheduledAnnouncement:edit')}</Button><Button size='sm' variant='ghost' onClick={() => deleteMutation.mutate(item.id)}><Trash2 className='size-4' /></Button></div>
                  </div>
                ))}
                {(announcementsQuery.data ?? []).length === 0 && <p className='text-sm text-muted-foreground'>{t('scheduledAnnouncement:noAnnouncements')}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('scheduledAnnouncement:runHistory')}</CardTitle><CardDescription>{t('scheduledAnnouncement:runHistoryDescription')}</CardDescription></CardHeader>
              <CardContent className='space-y-2 text-sm'>
                {(runsQuery.data ?? []).slice(0, 10).map((run) => (
                  <div key={run.id} className='flex items-center justify-between rounded-md border p-2'>
                    <span>{run.title || run.announcementId} · {formatDate(run.plannedRunAtUtc)}</span>
                    <span className='text-muted-foreground'>{run.status} · {run.sentMessageId ?? run.errorCode ?? '-'}</span>
                  </div>
                ))}
                {(runsQuery.data ?? []).length === 0 && <p className='text-muted-foreground'>{t('scheduledAnnouncement:noRuns')}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
