import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { panelAuditLogApi, type PanelAuditLogDto } from '@/lib/api'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { discordCdnAvatarUrl } from '@/utils/discord-avatar'

function pretty(value?: string | null) {
  if (!value) return '-'
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR')
}

function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function BotAuditLogs() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'audit-logs', featureDisplayName: t('auditLogs:featureDisplayName') })
  const [filters, setFilters] = React.useState({ action: 'all', resourceType: 'all', actorUserId: '' })
  const [selected, setSelected] = React.useState<PanelAuditLogDto | null>(null)

  const auditActionOptions = React.useMemo(() => [
    { value: 'all', label: t('auditLogs:actions.all') },
    { value: 'ai_moderation.settings.upsert', label: t('auditLogs:actions.aiModerationSettingsUpsert') },
    { value: 'ai_moderation.policy.upsert', label: t('auditLogs:actions.aiModerationPolicyUpsert') },
    { value: 'ai_moderation.review.decision', label: t('auditLogs:actions.aiModerationReviewDecision') },
    { value: 'feed.create', label: t('auditLogs:actions.feedCreate') },
    { value: 'feed.update', label: t('auditLogs:actions.feedUpdate') },
    { value: 'feed.delete', label: t('auditLogs:actions.feedDelete') },
    { value: 'locale.upsert', label: t('auditLogs:actions.localeUpsert') },
    { value: 'feature.enable', label: t('auditLogs:actions.featureEnable') },
    { value: 'feature.disable', label: t('auditLogs:actions.featureDisable') },
    { value: 'autorole.upsert', label: t('auditLogs:actions.autoroleUpsert') },
    { value: 'moderator.upsert', label: t('auditLogs:actions.moderatorUpsert') },
    { value: 'moderator.update', label: t('auditLogs:actions.moderatorUpdate') },
    { value: 'moderator.delete', label: t('auditLogs:actions.moderatorDelete') },
    { value: 'moderator.rule.update', label: t('auditLogs:actions.moderatorRuleUpdate') },
    { value: 'moderator.forbidden_word.add', label: t('auditLogs:actions.moderatorForbiddenWordAdd') },
    { value: 'moderator.forbidden_word.delete', label: t('auditLogs:actions.moderatorForbiddenWordDelete') },
  ], [t])

  const resourceTypeOptions = React.useMemo(() => [
    { value: 'all', label: t('auditLogs:resources.all') },
    { value: 'AIModerationSetting', label: t('auditLogs:resources.aiModerationSetting') },
    { value: 'AIModerationPolicy', label: t('auditLogs:resources.aiModerationPolicy') },
    { value: 'AIModerationReview', label: t('auditLogs:resources.aiModerationReview') },
    { value: 'FeedSubscription', label: t('auditLogs:resources.feedSubscription') },
    { value: 'GuildLocaleSetting', label: t('auditLogs:resources.guildLocaleSetting') },
    { value: 'GuildFeature', label: t('auditLogs:resources.guildFeature') },
    { value: 'AutoRole', label: t('auditLogs:resources.autoRole') },
    { value: 'Moderator', label: t('auditLogs:resources.moderator') },
    { value: 'ModeratorRule', label: t('auditLogs:resources.moderatorRule') },
    { value: 'ForbiddenWord', label: t('auditLogs:resources.forbiddenWord') },
  ], [t])

  const resultLabels: Record<string, string> = React.useMemo(() => ({
    success: t('auditLogs:results.success'),
    failed: t('auditLogs:results.failed'),
    error: t('auditLogs:results.error'),
  }), [t])

  const actorTypeLabels: Record<string, string> = React.useMemo(() => ({
    user: t('auditLogs:actorTypes.user'),
    bot: t('auditLogs:actorTypes.bot'),
    system: t('auditLogs:actorTypes.system'),
  }), [t])

  const query = useQuery({
    queryKey: ['panel-audit-logs', guildId, filters],
    queryFn: () => panelAuditLogApi.query(guildId, {
      action: filters.action === 'all' ? undefined : filters.action,
      resourceType: filters.resourceType === 'all' ? undefined : filters.resourceType,
      actorUserId: filters.actorUserId || undefined,
      limit: 100,
    }),
    enabled: !!guildId,
  })

  if (query.isLoading) return <><Main><div className='flex min-h-[60vh] items-center justify-center'><Loader2 className='size-8 animate-spin' /></div></Main></>

  const recentByResource = (query.data ?? []).slice(0, 5)

  return renderFeatureGate(
    <>
      
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div><h1 className='text-2xl font-bold tracking-tight'>{t('auditLogs:title')}</h1><p className='text-muted-foreground'>{t('auditLogs:description')}</p></div>
          <FeatureDisableButton guildId={guildId} featureName='audit-logs' featureDisplayName={t('auditLogs:featureDisplayName')} confirmDescription={t('auditLogs:confirmDescription')} />
        </div>

        <Card className='mb-4'>
          <CardHeader><CardTitle>{t('auditLogs:filters')}</CardTitle></CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2 md:grid-cols-4'>
            <div className='grid gap-2'><Label>{t('auditLogs:actionLabel')}</Label><Select value={filters.action} onValueChange={(action) => setFilters((s) => ({ ...s, action }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{auditActionOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className='grid gap-2'><Label>{t('auditLogs:resourceLabel')}</Label><Select value={filters.resourceType} onValueChange={(resourceType) => setFilters((s) => ({ ...s, resourceType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{resourceTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className='grid gap-2'><Label>{t('auditLogs:actorLabel')}</Label><Input value={filters.actorUserId} onChange={(e) => setFilters((s) => ({ ...s, actorUserId: e.target.value }))} /></div>
            <div className='flex items-end'><Button variant='outline' onClick={() => query.refetch()}><RefreshCw className='mr-2 size-4' /> {t('auditLogs:refresh')}</Button></div>
          </CardContent>
        </Card>

        <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          {recentByResource.map((log) => <Card key={log.id}><CardContent className='pt-4 text-sm'><div className='font-medium'>{labelFor(resourceTypeOptions, log.resourceType)}</div><div className='text-muted-foreground'>{labelFor(auditActionOptions, log.action)}</div><Badge className='mt-2' variant={log.result === 'success' ? 'default' : 'destructive'}>{resultLabels[log.result] ?? log.result}</Badge></CardContent></Card>)}
        </div>

        <div className='grid gap-4 lg:grid-cols-[1fr_minmax(0,460px)]'>
          <Card>
            <CardHeader>
              <CardTitle>{t('auditLogs:records')}</CardTitle>
              <CardDescription>{t('auditLogs:recordsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {(query.data ?? []).map((log) => {
                const actorLabel = log.actorUsernameSnapshot?.trim() || log.actorUserId || '—'
                const avatarSrc = discordCdnAvatarUrl(log.actorUserId ?? undefined, log.actorAvatarSnapshot ?? undefined)
                const showIdSuffix =
                  Boolean(log.actorUsernameSnapshot?.trim() && log.actorUserId?.trim())
                return (
                  <button
                    key={log.id}
                    type='button'
                    className='flex w-full gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted'
                    onClick={() => setSelected(log)}
                  >
                    <Avatar className='size-9 shrink-0'>
                      {avatarSrc ? <AvatarImage src={avatarSrc} alt='' /> : null}
                      <AvatarFallback className='text-xs'>{actorLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='flex justify-between gap-2'>
                        <span className='font-medium'>{labelFor(auditActionOptions, log.action)}</span>
                        <span className='shrink-0 text-muted-foreground'>{formatDate(log.createdAtUtc)}</span>
                      </div>
                      <div className='truncate text-muted-foreground'>
                        {labelFor(resourceTypeOptions, log.resourceType)} · {actorTypeLabels[log.actorType] ?? log.actorType}:{' '}
                        <span className='text-foreground'>{actorLabel}</span>
                        {showIdSuffix ? <span className='opacity-70'> ({log.actorUserId})</span> : null}
                      </div>
                    </div>
                  </button>
                )
              })}
              {(query.data ?? []).length === 0 && <p className='text-sm text-muted-foreground'>{t('auditLogs:noRecords')}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('auditLogs:changeDetail')}</CardTitle><CardDescription>{t('auditLogs:changeDetailDescription')}</CardDescription></CardHeader>
            <CardContent className='space-y-3'>
              {selected ? <><div><Label>{t('auditLogs:before')}</Label><pre className='mt-1 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs'>{pretty(selected.beforeJson)}</pre></div><div><Label>{t('auditLogs:after')}</Label><pre className='mt-1 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs'>{pretty(selected.afterJson)}</pre></div><div><Label>{t('auditLogs:changedFields')}</Label><pre className='mt-1 max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs'>{pretty(selected.changedFieldsJson)}</pre></div></> : <p className='text-sm text-muted-foreground'>{t('auditLogs:selectRecord')}</p>}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
