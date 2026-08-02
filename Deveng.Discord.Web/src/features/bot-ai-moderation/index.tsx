import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageSection } from '@/components/layout/page-section'
import { SectionNav } from '@/components/layout/section-nav'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import {
  aiModerationApi,
  discordApi,
  type AIModerationPolicyDto,
  type DiscordChannel,
  type UpsertAIModerationSettingDto,
} from '@/lib/api'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, X } from 'lucide-react'

const categories = ['toxicity', 'spam', 'sexual', 'violence', 'self_harm']

function buildCategoryLabels(t: TFunction): Record<string, string> {
  return {
    toxicity: t('aiModeration:catToxicity'),
    spam: t('aiModeration:catSpam'),
    sexual: t('aiModeration:catSexual'),
    violence: t('aiModeration:catViolence'),
    self_harm: t('aiModeration:catSelfHarm'),
  }
}

function buildActionLabels(t: TFunction): Record<string, string> {
  return {
    log: t('aiModeration:actionLog'),
    delete: t('aiModeration:actionDelete'),
    timeout: t('aiModeration:actionTimeout'),
    none: t('aiModeration:actionNone'),
    approved: t('aiModeration:actionApproved'),
    dismissed: t('aiModeration:actionDismissed'),
    log_only: t('aiModeration:actionLogOnly'),
    delete_high_confidence: t('aiModeration:actionDeleteHighConfidence'),
    delete_and_timeout: t('aiModeration:actionDeleteAndTimeout'),
    auto_delete: t('aiModeration:actionAutoDelete'),
    auto_timeout: t('aiModeration:actionAutoTimeout'),
    keyword_log: t('aiModeration:actionKeywordLog'),
    keyword_no_action: t('aiModeration:actionKeywordNoAction'),
    keyword_delete: t('aiModeration:actionKeywordDelete'),
    keyword_delete_failed: t('aiModeration:actionKeywordDeleteFailed'),
  }
}

function buildProviderLabels(t: TFunction): Record<string, string> {
  return {
    'keyword-fallback': t('aiModeration:providerKeywordFallback'),
    ollama: t('aiModeration:providerOllama'),
  }
}

function buildPolicyActionOptions(t: TFunction): { value: string; label: string; description: string }[] {
  return [
    { value: 'log', label: t('aiModeration:actionLog'), description: t('aiModeration:policyActionLogDesc') },
    { value: 'delete', label: t('aiModeration:actionDelete'), description: t('aiModeration:policyActionDeleteDesc') },
    { value: 'timeout', label: t('aiModeration:policyActionTimeoutLabel'), description: t('aiModeration:policyActionTimeoutDesc') },
  ]
}

function buildThresholdOptions(t: TFunction): { value: number; label: string; description: string }[] {
  return [
    { value: 0.5, label: t('aiModeration:thresholdLowLabel'), description: t('aiModeration:thresholdLowDesc') },
    { value: 0.7, label: t('aiModeration:thresholdMediumLabel'), description: t('aiModeration:thresholdMediumDesc') },
    { value: 0.85, label: t('aiModeration:thresholdHighLabel'), description: t('aiModeration:thresholdHighDesc') },
    { value: 0.95, label: t('aiModeration:thresholdVeryHighLabel'), description: t('aiModeration:thresholdVeryHighDesc') },
  ]
}

function buildSampleRateOptions(t: TFunction): { value: number; label: string }[] {
  return [
    { value: 1, label: t('aiModeration:sampleRateAll') },
    { value: 0.5, label: t('aiModeration:sampleRateHalf') },
    { value: 0.25, label: t('aiModeration:sampleRateQuarter') },
    { value: 0.1, label: t('aiModeration:sampleRateTenth') },
  ]
}

function buildRetentionOptions(t: TFunction): { value: number; label: string }[] {
  return [
    { value: 7, label: t('aiModeration:retention7') },
    { value: 14, label: t('aiModeration:retention14') },
    { value: 30, label: t('aiModeration:retention30') },
    { value: 90, label: t('aiModeration:retention90') },
  ]
}

const defaultSettings: UpsertAIModerationSettingDto = {
  enabled: false,
  mode: 'log_only',
  thresholdLog: 0.5,
  thresholdDelete: 0.85,
  thresholdTimeout: 0.95,
  retentionDays: 14,
  sampleRate: 1,
  excludedChannelIdsJson: '[]',
}

/** Eski panel değerlerini API'nin kabul ettiği modlara çevir */
function normalizeSettingsMode(mode: string): string {
  if (mode === 'auto_delete') return 'delete_high_confidence'
  if (mode === 'auto_timeout') return 'delete_and_timeout'
  return mode
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR')
}

function pretty(value?: string | null) {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function parseChannelIds(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function serializeChannelIds(channelIds: string[]) {
  return JSON.stringify(Array.from(new Set(channelIds)))
}

function formatScore(value?: number | null) {
  if (typeof value !== 'number') return '-'
  return `%${Math.round(value * 100)}`
}

function defaultPolicyForCategory(guildId: string, category: string): AIModerationPolicyDto {
  return {
    id: 0,
    guildId,
    category,
    enabled: true,
    action: 'log',
    logThreshold: 0.5,
    deleteThreshold: 0.85,
    timeoutThreshold: 0.95,
  }
}

function CategoryPolicyCard({
  category,
  guildId,
  existing,
  isSaving,
  onSave,
}: {
  category: string
  guildId: string
  existing?: AIModerationPolicyDto
  isSaving: boolean
  onSave: (policy: AIModerationPolicyDto) => void
}) {
  const { t } = useTranslation()
  const categoryLabels = React.useMemo(() => buildCategoryLabels(t), [t])
  const policyActionOptions = React.useMemo(() => buildPolicyActionOptions(t), [t])
  const thresholdOptions = React.useMemo(() => buildThresholdOptions(t), [t])
  const fallback = React.useMemo(() => defaultPolicyForCategory(guildId, category), [guildId, category])
  const [draft, setDraft] = React.useState<AIModerationPolicyDto>(existing ?? fallback)

  const existingRef = React.useRef(existing)
  existingRef.current = existing

  const serverSyncKey = React.useMemo(() => {
    if (!existing) return 'none'
    return JSON.stringify({
      id: existing.id,
      enabled: existing.enabled,
      action: existing.action,
      logThreshold: existing.logThreshold,
      deleteThreshold: existing.deleteThreshold,
      timeoutThreshold: existing.timeoutThreshold,
    })
  }, [existing])

  React.useEffect(() => {
    setDraft(existingRef.current ?? fallback)
  }, [serverSyncKey, fallback])

  const handleSave = () => {
    if (draft.logThreshold > draft.deleteThreshold || draft.deleteThreshold > draft.timeoutThreshold) {
      toast.error(t('aiModeration:thresholdOrderInvalid'))
      return
    }
    onSave({ ...draft, guildId, category })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{categoryLabels[category] ?? category}</CardTitle>
        <CardDescription>
          {t('aiModeration:categoryCardDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div className='flex items-center justify-between rounded-md border p-3'>
          <Label htmlFor={`ai-pol-${category}-en`}>{t('aiModeration:ruleActiveForCategory')}</Label>
          <Switch
            id={`ai-pol-${category}-en`}
            checked={draft.enabled}
            onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
        </div>
        <div className='grid gap-2'>
          <Label>{t('aiModeration:topThresholdAction')}</Label>
          <Select value={draft.action} onValueChange={(action) => setDraft((d) => ({ ...d, action }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {policyActionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-xs text-muted-foreground'>
            {policyActionOptions.find((o) => o.value === draft.action)?.description}
          </p>
        </div>
        <div className='grid gap-2'>
          <Label>{t('aiModeration:logThresholdLabel')}</Label>
          <Select
            value={String(draft.logThreshold)}
            onValueChange={(value) => setDraft((d) => ({ ...d, logThreshold: Number(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {thresholdOptions.map((option) => (
                <SelectItem key={`log-${option.value}`} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>{t('aiModeration:deleteThresholdLabel')}</Label>
          <Select
            value={String(draft.deleteThreshold)}
            onValueChange={(value) => setDraft((d) => ({ ...d, deleteThreshold: Number(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {thresholdOptions.map((option) => (
                <SelectItem key={`del-${option.value}`} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>{t('aiModeration:timeoutThresholdLabel')}</Label>
          <Select
            value={String(draft.timeoutThreshold)}
            onValueChange={(value) => setDraft((d) => ({ ...d, timeoutThreshold: Number(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {thresholdOptions.map((option) => (
                <SelectItem key={`to-${option.value}`} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type='button' variant='default' onClick={handleSave} disabled={isSaving} className='w-fit'>
          {isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
          {t('aiModeration:saveCategory')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BotAIModeration() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'ai-moderation', featureDisplayName: t('aiModeration:featureDisplayName') })
  const categoryLabels = React.useMemo(() => buildCategoryLabels(t), [t])
  const actionLabels = React.useMemo(() => buildActionLabels(t), [t])
  const providerLabels = React.useMemo(() => buildProviderLabels(t), [t])
  const sampleRateOptions = React.useMemo(() => buildSampleRateOptions(t), [t])
  const thresholdOptions = React.useMemo(() => buildThresholdOptions(t), [t])
  const retentionOptions = React.useMemo(() => buildRetentionOptions(t), [t])
  const [settings, setSettings] = React.useState<UpsertAIModerationSettingDto>(defaultSettings)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)

  const settingsQuery = useQuery({
    queryKey: ['ai-moderation-settings', guildId],
    queryFn: () => aiModerationApi.getSettings(guildId),
    enabled: !!guildId,
  })
  const policiesQuery = useQuery({
    queryKey: ['ai-moderation-policies', guildId],
    queryFn: () => aiModerationApi.getPolicies(guildId),
    enabled: !!guildId,
  })
  const reviewsQuery = useQuery({
    queryKey: ['ai-moderation-reviews', guildId],
    queryFn: () => aiModerationApi.getReviews(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (settingsQuery.data) {
      setSettings({
        ...settingsQuery.data,
        mode: normalizeSettingsMode(settingsQuery.data.mode),
      })
    }
    if (settingsQuery.data === null) setSettings(defaultSettings)
  }, [settingsQuery.data])

  React.useEffect(() => {
    if (!guildId) return
    setChannelsLoading(true)
    discordApi.getChannels(guildId)
      .then((data) => setChannels([...data.channels].sort((a, b) => a.position - b.position)))
      .catch(() => toast.error(t('common:channelsLoadError')))
      .finally(() => setChannelsLoading(false))
  }, [guildId])

  const saveSettings = useMutation({
    mutationFn: () => aiModerationApi.upsertSettings(guildId, settings),
    onSuccess: () => {
      toast.success(t('aiModeration:generalSettingsSaved'), {
        description: t('aiModeration:generalSettingsSavedDesc'),
      })
      queryClient.invalidateQueries({ queryKey: ['ai-moderation-settings', guildId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('aiModeration:settingsSaveError')),
  })

  const savePolicy = useMutation({
    mutationFn: (policy: AIModerationPolicyDto) =>
      aiModerationApi.upsertPolicy(guildId, policy.category, {
        enabled: policy.enabled,
        action: policy.action,
        logThreshold: policy.logThreshold,
        deleteThreshold: policy.deleteThreshold,
        timeoutThreshold: policy.timeoutThreshold,
      }),
    onSuccess: (_data, policy) => {
      const title = categoryLabels[policy.category] ?? policy.category
      toast.success(t('aiModeration:ruleSaved', { title }), {
        description: t('aiModeration:ruleSavedDesc'),
      })
      queryClient.invalidateQueries({ queryKey: ['ai-moderation-policies', guildId] })
    },
    onError: (error: { response?: { data?: { message?: string } } }) =>
      toast.error(error.response?.data?.message || t('aiModeration:ruleSaveError')),
  })

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) => aiModerationApi.decide(guildId, id, decision),
    onSuccess: () => {
      toast.success(t('aiModeration:reviewDecisionSaved'))
      queryClient.invalidateQueries({ queryKey: ['ai-moderation-reviews', guildId] })
    },
  })

  const excludedChannelIds = parseChannelIds(settings.excludedChannelIdsJson)

  const setExcludedChannelIds = (channelIds: string[]) => {
    setSettings((current) => ({ ...current, excludedChannelIdsJson: serializeChannelIds(channelIds) }))
  }

  if (settingsQuery.isLoading) {
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
            <h1 className='text-2xl font-bold tracking-tight'>{t('aiModeration:pageTitle')}</h1>
            <p className='text-muted-foreground'>
              {t('aiModeration:pageDescription')}
            </p>
          </div>
          <FeatureDisableButton guildId={guildId} featureName='ai-moderation' featureDisplayName={t('aiModeration:featureDisplayName')} confirmDescription={t('aiModeration:disableConfirmDescription')} />
        </div>

        <SectionNav
          items={[
            { id: 'settings', label: t('aiModeration:tabSettings') },
            { id: 'policies', label: t('aiModeration:tabPolicies') },
            { id: 'reviews', label: t('aiModeration:tabReviews') },
          ]}
        />
        <div className='space-y-8'>
          <PageSection id='settings'>
            <Card>
              <CardHeader>
                <CardTitle>{t('aiModeration:generalSettingsTitle')}</CardTitle>
                <CardDescription>
                  {t('aiModeration:generalSettingsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 md:grid-cols-3'>
                <div className='flex items-center justify-between rounded-md border p-3'><Label>{t('aiModeration:activeLabel')}</Label><Switch checked={settings.enabled} onCheckedChange={(enabled) => setSettings((s) => ({ ...s, enabled }))} /></div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:modeLabel')}</Label>
                  <Select value={settings.mode} onValueChange={(mode) => setSettings((s) => ({ ...s, mode }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='log_only'>{t('aiModeration:modeLogOnly')}</SelectItem>
                      <SelectItem value='delete_high_confidence'>{t('aiModeration:modeDeleteHighConfidence')}</SelectItem>
                      <SelectItem value='delete_and_timeout'>{t('aiModeration:modeDeleteAndTimeout')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:sampleRateFieldLabel')}</Label>
                  <Select value={String(settings.sampleRate)} onValueChange={(value) => setSettings((s) => ({ ...s, sampleRate: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{sampleRateOptions.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:logSensitivityLabel')}</Label>
                  <Select value={String(settings.thresholdLog)} onValueChange={(value) => setSettings((s) => ({ ...s, thresholdLog: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{thresholdOptions.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:deleteSensitivityLabel')}</Label>
                  <Select value={String(settings.thresholdDelete)} onValueChange={(value) => setSettings((s) => ({ ...s, thresholdDelete: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{thresholdOptions.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:timeoutSensitivityLabel')}</Label>
                  <Select value={String(settings.thresholdTimeout)} onValueChange={(value) => setSettings((s) => ({ ...s, thresholdTimeout: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{thresholdOptions.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('aiModeration:retentionFieldLabel')}</Label>
                  <Select value={String(settings.retentionDays)} onValueChange={(value) => setSettings((s) => ({ ...s, retentionDays: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{retentionOptions.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2 md:col-span-2'>
                  <Label>{t('aiModeration:excludedChannelsLabel')}</Label>
                  <Select
                    value=''
                    onValueChange={(channelId) => setExcludedChannelIds([...excludedChannelIds, channelId])}
                    disabled={channelsLoading}
                  >
                    <SelectTrigger><SelectValue placeholder={channelsLoading ? t('aiModeration:channelsLoading') : t('aiModeration:addChannel')} /></SelectTrigger>
                    <SearchableSelectContent
                      items={channels
                        .filter((channel) => !excludedChannelIds.includes(channel.id))
                        .map((channel) => ({ value: channel.id, label: `#${channel.name}` }))}
                      searchPlaceholder={t('aiModeration:channelSearchPlaceholder')}
                      loading={channelsLoading}
                    />
                  </Select>
                  <div className='flex flex-wrap gap-2'>
                    {excludedChannelIds.length === 0 && <span className='text-xs text-muted-foreground'>{t('aiModeration:noExcludedChannels')}</span>}
                    {excludedChannelIds.map((channelId) => (
                      <Badge key={channelId} variant='secondary' className='gap-1'>
                        #{channels.find((channel) => channel.id === channelId)?.name ?? channelId}
                        <button type='button' onClick={() => setExcludedChannelIds(excludedChannelIds.filter((id) => id !== channelId))}>
                          <X className='size-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className='md:col-span-3 flex flex-col gap-2'>
                  <p className='text-xs text-muted-foreground'>
                    <Trans i18nKey='aiModeration:saveSettingsHint' components={{ strong: <strong /> }} />
                  </p>
                  <Button type='button' onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
                    {t('aiModeration:saveGeneralSettings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection id='policies'>
            <p className='mb-4 max-w-3xl text-sm text-muted-foreground'>
              <Trans i18nKey='aiModeration:policiesHint' components={{ strong: <strong /> }} />
            </p>
            <div className='grid gap-4 lg:grid-cols-2'>
              {categories.map((category) => (
                <CategoryPolicyCard
                  key={category}
                  category={category}
                  guildId={guildId}
                  existing={policiesQuery.data?.find((p) => p.category === category)}
                  isSaving={savePolicy.isPending}
                  onSave={(policy) => savePolicy.mutate(policy)}
                />
              ))}
            </div>
          </PageSection>

          <PageSection id='reviews'>
            <div className='space-y-3'>
              {(reviewsQuery.data ?? []).map((review) => (
                <Card key={review.id}>
                  <CardContent className='pt-6'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <div className='font-medium'>#{review.id} · {review.matchedCategory ? (categoryLabels[review.matchedCategory] ?? review.matchedCategory) : t('aiModeration:noCategory')} · {t('aiModeration:scoreLabel')} {formatScore(review.score)}</div>
                        <div className='text-sm text-muted-foreground'>
                          {providerLabels[review.provider] ?? review.provider}
                          {review.modelName ? ` · ${review.modelName}` : ''} · {formatDate(review.createdAt)}
                        </div>
                        {(review.appliedAction || review.recommendedAction) && (
                          <div className='mt-1 text-xs text-muted-foreground'>
                            {t('aiModeration:recommendedLabel')} {actionLabels[review.recommendedAction ?? ''] ?? review.recommendedAction ?? '-'}
                            {' · '}
                            {t('aiModeration:appliedLabel')} {actionLabels[review.appliedAction ?? ''] ?? review.appliedAction ?? '-'}
                          </div>
                        )}
                      </div>
                      <Badge variant={review.moderatorDecision ? 'default' : 'secondary'}>{actionLabels[review.moderatorDecision ?? review.recommendedAction ?? ''] ?? t('aiModeration:awaitingReview')}</Badge>
                    </div>
                    <pre className='mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs'>{pretty(review.thresholdSnapshotJson)}</pre>
                    <div className='mt-3 flex gap-2'>
                      <Button size='sm' variant='outline' onClick={() => decide.mutate({ id: review.id, decision: 'approved' })}>{t('aiModeration:approveButton')}</Button>
                      <Button size='sm' variant='outline' onClick={() => decide.mutate({ id: review.id, decision: 'dismissed' })}>{t('aiModeration:dismissButton')}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(reviewsQuery.data ?? []).length === 0 && <Card><CardContent className='py-8 text-center text-muted-foreground'>{t('aiModeration:noReviews')}</CardContent></Card>}
            </div>
          </PageSection>
        </div>
      </Main>
    </>
  )
}
