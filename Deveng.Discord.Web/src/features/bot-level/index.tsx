import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ColorPicker } from '@/components/ui/color-picker'
import { PageSection } from '@/components/layout/page-section'
import { SectionNav } from '@/components/layout/section-nav'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { levelApi, discordApi } from '@/lib/api'
import type { LevelDto } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Loader2, Save, Plus, Trash2, X, Edit2 } from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordRole, DiscordChannel } from '@/lib/api/discord'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
} from '@/components/embed-editor'

const notificationEmbedFields = createEmbedFieldNames('notificationEmbed', {
  isEmbed: 'notificationFormIsEmbed',
  message: 'notificationFormMessage',
})
const NOTIFICATION_EMBED_TAGS = ['{user}', '{username}', '{level}', '{xp}', '{currentxp}', '{nextlevelxp}']

const levelFormSchema = z
  .object({
  guildId: z.string().min(1, 'Guild ID gerekli'),
  enabled: z.boolean(),
  xpPerMessage: z.number().min(1, 'XP en az 1 olmalıdır'),
  xpPerMessageMin: z.number().min(1, 'Minimum XP en az 1 olmalıdır'),
  xpPerMessageMax: z.number().min(1, 'Maksimum XP en az 1 olmalıdır'),
  useRandomXp: z.boolean(),
  cooldownSeconds: z.number().min(0, 'Cooldown 0 veya daha büyük olmalıdır'),
  baseXpRequired: z.number().min(1, 'Base XP en az 1 olmalıdır'),
  xpMultiplier: z.number().min(0.1, 'XP çarpanı en az 0.1 olmalıdır'),
  notifyOnLevelUp: z.boolean(),
  notificationChannelId: z.string().optional(),
  useEmbedForNotification: z.boolean(),
  notificationMessage: z.string().optional(),
  useEmbedForXpGain: z.boolean(),
  xpGainMessage: z.string().optional(),
  xpGainEmbedColor: z.string().optional(),
  ignoredChannelIds: z.string().optional(),
  ignoredRoleIds: z.string().optional(),
  enableRoleRewards: z.boolean(),
  roleRewardsJson: z.string().optional(),
})
  .merge(createEmbedSchema(notificationEmbedFields))


interface RoleReward {
  level: number
  roleId: string
  removePreviousRole: boolean
}

function buildLevelDefaults(guildId: string) {
  return {
    guildId,
    enabled: true,
    xpPerMessage: 15,
    xpPerMessageMin: 5,
    xpPerMessageMax: 25,
    useRandomXp: true,
    cooldownSeconds: 60,
    baseXpRequired: 100,
    xpMultiplier: 1.5,
    notifyOnLevelUp: true,
    notificationChannelId: '',
    useEmbedForNotification: true,
    notificationMessage: '',
    ...createEmptyEmbedValues('notificationEmbed', {
      isEmbed: 'notificationFormIsEmbed',
      message: 'notificationFormMessage',
    }),
    notificationFormIsEmbed: true,
    useEmbedForXpGain: false,
    xpGainMessage: '',
    xpGainEmbedColor: '',
    ignoredChannelIds: '',
    ignoredRoleIds: '',
    enableRoleRewards: false,
    roleRewardsJson: '',
  }
}

export function BotLevel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [roleRewards, setRoleRewards] = React.useState<RoleReward[]>([])
  const [selectedIgnoredChannels, setSelectedIgnoredChannels] = React.useState<string[]>([])
  const [selectedIgnoredRoles, setSelectedIgnoredRoles] = React.useState<string[]>([])
  const [mode, setMode] = React.useState<'list' | 'edit'>('list')

  const { renderFeatureGate, isFeatureEnabled } = useFeatureGate({
    guildId,
    featureName: 'level',
    featureDisplayName: t('level:featureDisplayName'),
  })

  const form = useForm<any>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: buildLevelDefaults(guildId),
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
    setMode('list')
  }, [guildId, form])

  // Mevcut level ayarlarını getir (özellik açıkken)
  const { data: levelData, isLoading, error: levelError } = useQuery<LevelDto | null, Error>({
    queryKey: ['level', guildId],
    queryFn: () => levelApi.getByGuildId(guildId),
    enabled: !!guildId && isFeatureEnabled,
    retry: false, // 500 hatası için retry yapma
  })

  React.useEffect(() => {
    if (!levelError) return
    const err = levelError as { response?: { status?: number; data?: { message?: string; error?: string } }; message?: string }
    if (err.response?.status === 404) return
    const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? t('level:loadError')
    if (typeof msg === 'string' && (msg.includes('stored procedure') || msg.includes('Could not find'))) {
      toast.error(t('level:proceduresNotFound'))
    } else {
      toast.error(String(msg))
    }
  }, [levelError])

  // Rolleri getir
  React.useEffect(() => {
    const fetchRoles = async () => {
      if (!guildId) return
      setRolesLoading(true)
      try {
        const data = await discordApi.getRoles(guildId)
        const sortedRoles = [...data.roles].sort((a, b) => b.position - a.position)
        setRoles(sortedRoles)
      } catch (error) {
        console.error('Rol listesi alınamadı:', error)
        toast.error(t('common:rolesLoadError'))
      } finally {
        setRolesLoading(false)
      }
    }
    fetchRoles()
  }, [guildId])

  // Kanalları getir
  React.useEffect(() => {
    const fetchChannels = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        const sortedChannels = [...data.channels].sort((a, b) => a.position - b.position)
        setChannels(sortedChannels)
      } catch (error) {
        console.error('Kanal listesi alınamadı:', error)
        toast.error(t('common:channelsLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }
    fetchChannels()
  }, [guildId])

  // Form'u mevcut verilerle doldur
  React.useEffect(() => {
    if (levelData) {
      form.reset({
        guildId: levelData.guildId,
        enabled: levelData.enabled,
        xpPerMessage: levelData.xpPerMessage,
        xpPerMessageMin: levelData.xpPerMessageMin,
        xpPerMessageMax: levelData.xpPerMessageMax,
        useRandomXp: levelData.useRandomXp,
        cooldownSeconds: levelData.cooldownSeconds,
        baseXpRequired: levelData.baseXpRequired,
        xpMultiplier: levelData.xpMultiplier,
        notifyOnLevelUp: levelData.notifyOnLevelUp,
        notificationChannelId: levelData.notificationChannelId || '',
        useEmbedForNotification: levelData.useEmbedForNotification,
        notificationMessage: levelData.notificationMessage || '',
        ...fromEmbedApiDto(levelData as unknown as Record<string, unknown>, 'notificationEmbed', {
          isEmbed: 'notificationFormIsEmbed',
          message: 'notificationFormMessage',
        }),
        notificationFormIsEmbed: true,
        useEmbedForXpGain: levelData.useEmbedForXpGain ?? false,
        xpGainMessage: levelData.xpGainMessage || '',
        xpGainEmbedColor: levelData.xpGainEmbedColor || '',
        ignoredChannelIds: levelData.ignoredChannelIds || '',
        ignoredRoleIds: levelData.ignoredRoleIds || '',
        enableRoleRewards: levelData.enableRoleRewards,
        roleRewardsJson: levelData.roleRewardsJson || '',
      })

      // Ignored channels ve roles'u parse et
      if (levelData.ignoredChannelIds) {
        setSelectedIgnoredChannels(levelData.ignoredChannelIds.split(',').filter(Boolean))
      } else {
        setSelectedIgnoredChannels([])
      }
      if (levelData.ignoredRoleIds) {
        setSelectedIgnoredRoles(levelData.ignoredRoleIds.split(',').filter(Boolean))
      } else {
        setSelectedIgnoredRoles([])
      }

      // Role rewards'u parse et
      if (levelData.roleRewardsJson) {
        try {
          const parsed = JSON.parse(levelData.roleRewardsJson) as RoleReward[]
          setRoleRewards(parsed)
        } catch {
          setRoleRewards([])
        }
      } else {
        setRoleRewards([])
      }
    } else if (levelData === null) {
      form.reset(buildLevelDefaults(guildId))
      setSelectedIgnoredChannels([])
      setSelectedIgnoredRoles([])
      setRoleRewards([])
    }
  }, [levelData, form, guildId])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const ignoredChannels = selectedIgnoredChannels.join(',')
      const ignoredRoles = selectedIgnoredRoles.join(',')
      const roleRewardsJson = roleRewards.length > 0 ? JSON.stringify(roleRewards) : undefined
      const notificationEmbed = toEmbedApiPayload(data, notificationEmbedFields)

      return levelApi.update(guildId, {
        enabled: data.enabled,
        xpPerMessage: data.xpPerMessage,
        xpPerMessageMin: data.xpPerMessageMin,
        xpPerMessageMax: data.xpPerMessageMax,
        useRandomXp: data.useRandomXp,
        cooldownSeconds: data.cooldownSeconds,
        baseXpRequired: data.baseXpRequired,
        xpMultiplier: data.xpMultiplier,
        notifyOnLevelUp: data.notifyOnLevelUp,
        notificationChannelId: data.notificationChannelId || undefined,
        useEmbedForNotification: data.useEmbedForNotification,
        notificationMessage: data.notificationMessage || undefined,
        notificationEmbedTitle: notificationEmbed.notificationEmbedTitle as string | undefined,
        notificationEmbedDescription: notificationEmbed.notificationEmbedDescription as string | undefined,
        notificationEmbedColor: notificationEmbed.notificationEmbedColor as string | undefined,
        notificationEmbedThumbnail: notificationEmbed.notificationEmbedThumbnail as string | undefined,
        notificationEmbedImage: notificationEmbed.notificationEmbedImage as string | undefined,
        notificationEmbedFooter: notificationEmbed.notificationEmbedFooter as string | undefined,
        useEmbedForXpGain: data.useEmbedForXpGain,
        xpGainMessage: data.xpGainMessage || undefined,
        xpGainEmbedColor: data.xpGainEmbedColor || undefined,
        ignoredChannelIds: ignoredChannels || undefined,
        ignoredRoleIds: ignoredRoles || undefined,
        enableRoleRewards: data.enableRoleRewards,
        roleRewardsJson: roleRewardsJson,
      })
    },
    onSuccess: () => {
      toast.success(t('level:updated'))
      queryClient.invalidateQueries({ queryKey: ['level', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const ignoredChannels = selectedIgnoredChannels.join(',')
      const ignoredRoles = selectedIgnoredRoles.join(',')
      const roleRewardsJson = roleRewards.length > 0 ? JSON.stringify(roleRewards) : undefined
      const notificationEmbed = toEmbedApiPayload(data, notificationEmbedFields)

      return levelApi.createOrUpdate(guildId, {
        enabled: data.enabled,
        xpPerMessage: data.xpPerMessage,
        xpPerMessageMin: data.xpPerMessageMin,
        xpPerMessageMax: data.xpPerMessageMax,
        useRandomXp: data.useRandomXp,
        cooldownSeconds: data.cooldownSeconds,
        baseXpRequired: data.baseXpRequired,
        xpMultiplier: data.xpMultiplier,
        notifyOnLevelUp: data.notifyOnLevelUp,
        notificationChannelId: data.notificationChannelId || undefined,
        useEmbedForNotification: data.useEmbedForNotification,
        notificationMessage: data.notificationMessage || undefined,
        notificationEmbedTitle: notificationEmbed.notificationEmbedTitle as string | undefined,
        notificationEmbedDescription: notificationEmbed.notificationEmbedDescription as string | undefined,
        notificationEmbedColor: notificationEmbed.notificationEmbedColor as string | undefined,
        notificationEmbedThumbnail: notificationEmbed.notificationEmbedThumbnail as string | undefined,
        notificationEmbedImage: notificationEmbed.notificationEmbedImage as string | undefined,
        notificationEmbedFooter: notificationEmbed.notificationEmbedFooter as string | undefined,
        useEmbedForXpGain: data.useEmbedForXpGain,
        xpGainMessage: data.xpGainMessage || undefined,
        xpGainEmbedColor: data.xpGainEmbedColor || undefined,
        ignoredChannelIds: ignoredChannels || undefined,
        ignoredRoleIds: ignoredRoles || undefined,
        enableRoleRewards: data.enableRoleRewards,
        roleRewardsJson: roleRewardsJson,
      })
    },
    onSuccess: () => {
      toast.success(t('level:created'))
      queryClient.invalidateQueries({ queryKey: ['level', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSubmit = (data: any) => {
    if (levelData) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const listModeRoleRewards = React.useMemo((): RoleReward[] => {
    if (!levelData?.roleRewardsJson) return []
    try {
      const parsed = JSON.parse(levelData.roleRewardsJson) as RoleReward[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [levelData?.roleRewardsJson])

  const resolveChannelName = React.useCallback(
    (id: string) => channels.find((c) => c.id === id)?.name ?? id,
    [channels],
  )
  const resolveRoleName = React.useCallback(
    (id: string) => roles.find((r) => r.id === id)?.name ?? id,
    [roles],
  )

  // Discord renk kodunu hex'e çevir
  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  // Özellik kapalıyken sayfa içeriği gösterme; useFeatureGate modal + iptal'de dashboard'a yönlendirir
  const levelContent = (() => {
    if (isLoading) {
      return (
        <>
          <Main>
            <div className='flex items-center justify-center min-h-[60vh]'>
              <Loader2 className='size-8 animate-spin' />
            </div>
          </Main>
        </>
      )
    }

    // Hata durumunda kullanıcıya bilgi göster (404 hariç - 404 normal, level ayarları yok demektir)
    if (levelError && (levelError as any)?.response?.status !== 404) {
      const errorMessage = (levelError as any)?.response?.data?.message ||
                        (levelError as any)?.response?.data?.error ||
                        (levelError as any)?.message ||
                        t('level:loadError')

      const isStoredProcedureError = errorMessage.includes('stored procedure') ||
                                      errorMessage.includes('Could not find') ||
                                      errorMessage.includes('2812')

      return (
      <>
        <Main>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('level:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('level:pageDescription')}
              </p>
            </div>

            <Card className='border-2 border-destructive shadow-lg'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-2xl text-destructive'>{t('level:errorTitle')}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='p-4 bg-destructive/10 rounded-lg border border-destructive/20'>
                  <p className='text-sm font-medium text-destructive mb-2'>{t('level:errorMessageLabel')}</p>
                  <p className='text-sm'>{errorMessage}</p>
                </div>

                {isStoredProcedureError && (
                  <div className='p-4 bg-muted rounded-lg space-y-2'>
                    <p className='text-sm font-medium'>{t('level:solutionLabel')}</p>
                    <ol className='text-sm list-decimal list-inside space-y-1 text-muted-foreground'>
                      <li>{t('level:solutionStep1')}</li>
                      <li>{t('level:solutionStep2')}</li>
                      <li>{t('level:solutionStep3Prefix')}<code className='bg-background px-1 rounded'>Deveng.Discord.Bot\database\level_schema.sql</code>{t('level:solutionStep3Suffix')}</li>
                      <li>{t('level:solutionStep4')}</li>
                      <li>{t('level:solutionStep5')}</li>
                    </ol>
                  </div>
                )}

                <Button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['level', guildId] })
                  }}
                  className='w-full'
                >
                  {t('level:retry')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
      )
    }

    return (
      <>
        <Main>
          <div className='space-y-6'>
            {/* Başlık Bölümü */}
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-2'>
                <h1 className='text-2xl font-semibold tracking-tight'>
                  {t('level:pageTitle')}
                </h1>
                <p className='text-lg text-muted-foreground'>
                  {t('level:pageDescription')}
                </p>
              </div>
              <FeatureDisableButton
                guildId={guildId}
                featureName='level'
                featureDisplayName={t('level:featureDisplayName')}
                confirmDescription={t('level:disableConfirmDescription')}
              />
            </div>

            {mode === 'list' && (
              <Card className='border'>
                <CardHeader className='pb-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <CardTitle className='text-base'>{t('level:currentConfig')}</CardTitle>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setMode('edit')}
                    >
                      <Edit2 className='mr-2 size-4' />
                      {levelData ? t('level:edit') : t('level:create')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {!levelData ? (
                    <p className='text-sm text-muted-foreground'>{t('level:noData')}</p>
                  ) : (
                    <>
                      <p className='text-sm text-muted-foreground'>
                        {t('level:configSummaryHint')}
                      </p>
                      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summarySystem')}</div>
                          <div className='mt-1 font-medium'>
                            {levelData.enabled ? (
                              <Badge variant='default'>{t('level:statusOn')}</Badge>
                            ) : (
                              <Badge variant='secondary'>{t('level:statusOff')}</Badge>
                            )}
                          </div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryCooldown')}</div>
                          <div className='mt-1 font-medium'>{t('level:secondsShort', { value: levelData.cooldownSeconds })}</div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryXpPerMessage')}</div>
                          <div className='mt-1 font-medium'>
                            {levelData.useRandomXp
                              ? t('level:xpRandom', { min: levelData.xpPerMessageMin, max: levelData.xpPerMessageMax })
                              : t('level:xpFixed', { value: levelData.xpPerMessage })}
                          </div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryBaseXp')}</div>
                          <div className='mt-1 font-medium'>{levelData.baseXpRequired}</div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryMultiplier')}</div>
                          <div className='mt-1 font-medium'>{levelData.xpMultiplier}</div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryLevelNotification')}</div>
                          <div className='mt-1 font-medium'>
                            {levelData.notifyOnLevelUp ? t('level:statusOn') : t('level:statusOff')}
                            {levelData.notifyOnLevelUp && levelData.notificationChannelId ? (
                              <span className='mt-0.5 block text-xs font-normal text-muted-foreground'>
                                {t('level:channelLabel')}{' '}
                                {resolveChannelName(levelData.notificationChannelId)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className='grid gap-2 sm:grid-cols-2'>
                        <div className='rounded-md border bg-muted/30 px-3 py-2 sm:col-span-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryIgnoredChannels')}</div>
                          <div className='mt-1 text-sm font-medium leading-relaxed'>
                            {(() => {
                              const ids = (levelData.ignoredChannelIds ?? '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                              if (ids.length === 0) return '—'
                              const shown = ids.slice(0, 8).map(resolveChannelName)
                              const extra = ids.length > 8 ? t('level:moreChannels', { count: ids.length - 8 }) : ''
                              return `${shown.join(', ')}${extra}`
                            })()}
                          </div>
                        </div>
                        <div className='rounded-md border bg-muted/30 px-3 py-2 sm:col-span-2'>
                          <div className='text-xs text-muted-foreground'>{t('level:summaryIgnoredRoles')}</div>
                          <div className='mt-1 text-sm font-medium leading-relaxed'>
                            {(() => {
                              const ids = (levelData.ignoredRoleIds ?? '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                              if (ids.length === 0) return '—'
                              const shown = ids.slice(0, 8).map(resolveRoleName)
                              const extra = ids.length > 8 ? t('level:moreRoles', { count: ids.length - 8 }) : ''
                              return `${shown.join(', ')}${extra}`
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className='rounded-md border bg-muted/30 px-3 py-2'>
                        <div className='text-xs text-muted-foreground'>{t('level:summaryRoleRewards')}</div>
                        <div className='mt-1 text-sm font-medium'>
                          {!levelData.enableRoleRewards ? (
                            t('level:statusOff')
                          ) : listModeRoleRewards.length === 0 ? (
                            t('level:roleRewardsOnNoneDefined')
                          ) : (
                            <ul className='mt-1 list-inside list-disc space-y-0.5 font-normal text-muted-foreground'>
                              {listModeRoleRewards.slice(0, 12).map((rr) => (
                                <li key={`${rr.level}-${rr.roleId}`}>
                                  <span className='font-medium text-foreground'>{t('level:levelShort', { level: rr.level })}</span>
                                  {' → '}
                                  {resolveRoleName(rr.roleId)}
                                  {rr.removePreviousRole ? (
                                    <span className='text-xs'> {t('level:previousRoleRemoved')}</span>
                                  ) : null}
                                </li>
                              ))}
                              {listModeRoleRewards.length > 12 ? (
                                <li className='list-none text-xs'>
                                  {t('level:moreRewards', { count: listModeRoleRewards.length - 12 })}
                                </li>
                              ) : null}
                            </ul>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === 'edit' && (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => setMode('list')}
                >
                  <X className='mr-1 size-4' />
                  {t('level:close')}
                </Button>
              </div>
              <SectionNav
                items={[
                  { id: 'general', label: t('level:navGeneral') },
                  { id: 'xp', label: t('level:navXp') },
                  { id: 'notifications', label: t('level:navNotifications') },
                  { id: 'rewards', label: t('level:navRewards') },
                ]}
              />
              <div className='space-y-8'>
                {/* Genel Ayarlar */}
                <PageSection id='general'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('level:generalSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='cooldownSeconds'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('level:cooldownLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                min={0}
                                className='h-11'
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('level:cooldownDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                {/* XP Ayarları */}
                <PageSection id='xp'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('level:xpSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='useRandomXp'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('level:useRandomXpLabel')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('useRandomXp') ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            control={form.control}
                            name='xpPerMessageMin'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('level:minXpLabel')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type='number'
                                    min={1}
                                    className='h-11'
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('level:minXpDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name='xpPerMessageMax'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('level:maxXpLabel')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type='number'
                                    min={1}
                                    className='h-11'
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('level:maxXpDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <FormField
                          control={form.control}
                          name='xpPerMessage'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('level:xpPerMessageLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min={1}
                                  className='h-11'
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('level:xpPerMessageDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <FormField
                          control={form.control}
                          name='baseXpRequired'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('level:baseXpLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min={1}
                                  className='h-11'
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('level:baseXpDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='xpMultiplier'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('level:xpMultiplierLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  step='0.1'
                                  min={0.1}
                                  className='h-11'
                                  {...field}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value)
                                    field.onChange(Number.isNaN(v) ? 1.5 : v)
                                  }}
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('level:xpMultiplierDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Ignored Channels */}
                      <div className='space-y-4'>
                        <FormLabel className='text-base font-semibold'>{t('level:ignoredChannelsLabel')}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (!selectedIgnoredChannels.includes(value)) {
                              setSelectedIgnoredChannels([...selectedIgnoredChannels, value])
                            }
                          }}
                        >
                          <SelectTrigger className='h-11'>
                            <SelectValue placeholder={channelsLoading ? t('level:channelsLoading') : t('level:addChannel')} />
                          </SelectTrigger>
                          <SearchableSelectContent
                            className='max-h-[300px]'
                            items={channels
                              .filter((c) => !selectedIgnoredChannels.includes(c.id))
                              .map((c) => ({ value: c.id, label: `# ${c.name}` }))}
                            searchPlaceholder={t('level:searchChannel')}
                            loading={channelsLoading}
                          />
                        </Select>
                        <FormDescription className='text-sm'>
                          {t('level:ignoredChannelsDescription')}
                        </FormDescription>
                        {selectedIgnoredChannels.length > 0 && (
                          <div className='flex flex-wrap gap-2'>
                            {selectedIgnoredChannels.map((channelId) => {
                              const channel = channels.find(c => c.id === channelId)
                              return channel ? (
                                <div
                                  key={channelId}
                                  className='flex items-center gap-2 px-3 py-1 bg-muted rounded-md'
                                >
                                  <span className='text-sm'>#{channel.name}</span>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setSelectedIgnoredChannels(selectedIgnoredChannels.filter(id => id !== channelId))
                                    }}
                                    className='text-muted-foreground hover:text-foreground'
                                  >
                                    <Trash2 className='size-4' />
                                  </button>
                                </div>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>

                      {/* Ignored Roles */}
                      <div className='space-y-4'>
                        <FormLabel className='text-base font-semibold'>{t('level:ignoredRolesLabel')}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (!selectedIgnoredRoles.includes(value)) {
                              setSelectedIgnoredRoles([...selectedIgnoredRoles, value])
                            }
                          }}
                        >
                          <SelectTrigger className='h-11'>
                            <SelectValue placeholder={rolesLoading ? t('level:rolesLoading') : t('level:addRole')} />
                          </SelectTrigger>
                          <SearchableSelectContent
                            className='max-h-[300px]'
                            items={roles
                              .filter((r) => !selectedIgnoredRoles.includes(r.id))
                              .map((r) => ({ value: r.id, label: r.name }))}
                            searchPlaceholder={t('level:searchRole')}
                            loading={rolesLoading}
                          />
                        </Select>
                        <FormDescription className='text-sm'>
                          {t('level:ignoredRolesDescription')}
                        </FormDescription>
                        {selectedIgnoredRoles.length > 0 && (
                          <div className='flex flex-wrap gap-2'>
                            {selectedIgnoredRoles.map((roleId) => {
                              const role = roles.find(r => r.id === roleId)
                              return role ? (
                                <div
                                  key={roleId}
                                  className='flex items-center gap-2 px-3 py-1 bg-muted rounded-md'
                                >
                                  <div
                                    className='size-3 rounded-full border border-background flex-shrink-0'
                                    style={{
                                      backgroundColor: getRoleColor(role.color),
                                    }}
                                  />
                                  <span className='text-sm'>{role.name}</span>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setSelectedIgnoredRoles(selectedIgnoredRoles.filter(id => id !== roleId))
                                    }}
                                    className='text-muted-foreground hover:text-foreground'
                                  >
                                    <Trash2 className='size-4' />
                                  </button>
                                </div>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* XP Kazanım Mesajı */}
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('level:xpGainMessageTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='useEmbedForXpGain'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('level:useEmbedLabel')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='xpGainMessage'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('level:messageTemplateLabel')}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t('level:xpGainMessagePlaceholder')}
                                rows={3}
                                className='resize-none text-base'
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('level:xpGainMessageDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('useEmbedForXpGain') && (
                        <FormField
                          control={form.control}
                          name='xpGainEmbedColor'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('level:embedColorLabel')}</FormLabel>
                              <FormControl>
                                <ColorPicker
                                  value={field.value || '#5865F2'}
                                  onChange={field.onChange}
                                  placeholder='#5865F2'
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('level:embedColorDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Bildirimler */}
                <PageSection id='notifications'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('level:notificationSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='notifyOnLevelUp'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('level:levelUpNotificationLabel')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('notifyOnLevelUp') && (
                        <>
                          <FormField
                            control={form.control}
                            name='notificationChannelId'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('level:notificationChannelLabel')}</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value || '__none__'}
                                    onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                                    disabled={channelsLoading}
                                  >
                                    <SelectTrigger className='h-11 w-full'>
                                      <SelectValue placeholder={channelsLoading ? t('level:channelsLoading') : t('level:notificationChannelPlaceholder')}>
                                        {field.value && channels.find((c) => c.id === field.value) && (
                                          <div className='flex items-center gap-2'>
                                            <span className='text-lg'>#</span>
                                            <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                          </div>
                                        )}
                                        {!field.value && (
                                          <span className='text-muted-foreground'>{t('level:messageChannelOption')}</span>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SearchableSelectContent
                                      className='max-h-[300px]'
                                      items={[
                                        { value: '__none__', label: t('level:messageChannelOption') },
                                        ...channels.map((c) => ({ value: c.id, label: `# ${c.name}` })),
                                      ]}
                                      searchPlaceholder={t('level:searchChannel')}
                                      loading={channelsLoading}
                                    />
                                  </Select>
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('level:notificationChannelDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name='useEmbedForNotification'
                            render={({ field }) => (
                              <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                                <div className='space-y-1 flex-1'>
                                  <FormLabel className='text-base font-semibold'>{t('level:useEmbedLabel')}</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className='scale-110'
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {form.watch('useEmbedForNotification') && (
                            <EmbedFormSection
                              control={form.control}
                              watch={form.watch}
                              fieldNames={notificationEmbedFields}
                              showIsEmbed={false}
                              showMessage={false}
                              descriptionTags={NOTIFICATION_EMBED_TAGS}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name='notificationMessage'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('level:customNotificationMessageLabel')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={t('level:customNotificationMessagePlaceholder')}
                                    rows={3}
                                    className='resize-none text-base'
                                  />
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('level:customNotificationMessageDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Ödüller */}
                <PageSection id='rewards'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('level:roleRewardsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='enableRoleRewards'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('level:enableRoleRewardsLabel')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('enableRoleRewards') && (
                        <div className='space-y-4'>
                          {roleRewards.map((reward, index) => (
                            <div key={index} className='flex gap-2 items-center p-4 border rounded-lg'>
                              <div className='flex-1 grid grid-cols-2 gap-4'>
                                <div>
                                  <label className='text-sm font-medium mb-1 block'>{t('level:rewardLevelLabel')}</label>
                                  <Input
                                    type='number'
                                    min={1}
                                    value={reward.level}
                                    onChange={(e) => {
                                      const newRewards = [...roleRewards]
                                      newRewards[index].level = parseInt(e.target.value) || 1
                                      setRoleRewards(newRewards)
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className='text-sm font-medium mb-1 block'>{t('level:rewardRoleLabel')}</label>
                                  <Select
                                    value={reward.roleId}
                                    onValueChange={(value) => {
                                      const newRewards = [...roleRewards]
                                      newRewards[index].roleId = value
                                      setRoleRewards(newRewards)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue>
                                        {roles.find(r => r.id === reward.roleId)?.name || t('level:selectRole')}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SearchableSelectContent
                                      items={roles.map((r) => ({ value: r.id, label: r.name }))}
                                      searchPlaceholder={t('level:searchRole')}
                                    />
                                  </Select>
                                </div>
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={() => {
                                  setRoleRewards(roleRewards.filter((_, i) => i !== index))
                                }}
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() => {
                              setRoleRewards([...roleRewards, { level: 1, roleId: '', removePreviousRole: false }])
                            }}
                            className='w-full'
                          >
                            <Plus className='size-4 mr-2' />
                            {t('level:addRoleReward')}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </PageSection>
              </div>

              <div className='flex justify-end gap-4 pt-4 border-t'>
                <Button
                  type='submit'
                  size='lg'
                  className='min-w-[140px] h-11 text-base font-semibold'
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {(updateMutation.isPending || createMutation.isPending) && (
                    <Loader2 className='mr-2 size-5 animate-spin' />
                  )}
                  <Save className='mr-2 size-5' />
                  {levelData ? t('level:saveSettings') : t('level:create')}
                </Button>
              </div>
            </form>
          </Form>
          )}
        </div>
      </Main>
    </>
    )
  })()

  return renderFeatureGate(levelContent)
}
