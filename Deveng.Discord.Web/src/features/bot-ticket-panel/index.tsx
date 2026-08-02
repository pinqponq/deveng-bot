import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { ticketPanelApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Plus, Trash2, Send, Pencil, X } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import type { DiscordRole, DiscordChannel, DiscordCategory } from '@/lib/api/discord'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
  EMBED_DESCRIPTION_INSERT_TAGS,
} from '@/components/embed-editor'

const panelEmbedFields = createEmbedFieldNames('embed', { message: 'panelMessage' })
const welcomeEmbedFields = createEmbedFieldNames('welcomeEmbed', {
  isEmbed: 'isWelcomeEmbed',
  message: 'welcomeMessage',
})

type TFn = (key: string, options?: Record<string, unknown>) => string

const createTicketPanelFormSchema = (t: TFn) =>
  z
    .object({
    guildId: z.string().min(1, t('ticket:guildIdRequired')),
    channelId: z.string().min(1, t('ticket:channelIdRequired')),
    panelMessage: z.string().optional(),
    welcomeMessage: z.string().optional(),
    transcriptChannelId: z.string().optional(),
    sendTranscriptToUser: z.boolean(),
    openCategoryId: z.string().optional(),
    openCategoryName: z.string().optional(),
    claimedCategoryId: z.string().optional(),
    claimedCategoryName: z.string().optional(),
    closedCategoryId: z.string().optional(),
    closedCategoryName: z.string().optional(),
    enabled: z.boolean(),
    roleIds: z.array(z.string()),
    ticketTypes: z.array(z.object({
      type: z.number(), // 0: Buton, 1: Açılır Menü
      label: z.string().min(1, t('ticket:labelRequired')),
      emoji: z.string().optional(),
      style: z.number(),
      placeholder: z.string().optional(),
      orderIndex: z.number(),
      openCategoryId: z.string().optional(),
      openCategoryName: z.string().optional(),
      claimedCategoryId: z.string().optional(),
      claimedCategoryName: z.string().optional(),
      closedCategoryId: z.string().optional(),
      closedCategoryName: z.string().optional(),
      enabled: z.boolean(),
    })),
  })
    .merge(createEmbedSchema(panelEmbedFields))
    .merge(createEmbedSchema(welcomeEmbedFields))
    .superRefine((val, ctx) => {
      // En az bir aktif talep türü zorunlu: aksi halde panel Discord'da butonsuz görünür
      const types = (val as { ticketTypes?: Array<{ enabled?: boolean }> }).ticketTypes ?? []
      if (!types.some((tt) => tt?.enabled)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ticketTypes'],
          message: t('ticket:atLeastOneActiveTypeError'),
        })
      }
    })

type TicketPanelFormValues = z.infer<ReturnType<typeof createTicketPanelFormSchema>>

/** Kategori seçiminde: mevcut sunucu kategorisi yoksa isimle yeni oluştur */
const CATEGORY_BY_NAME = '__by_name__'

/** Yeni paneller için varsayılan "Talep Oluştur" buton türü */
const createDefaultTicketType = (t: TFn, orderIndex = 0) => ({
  type: 0,
  label: t('ticket:createTicket'),
  emoji: '',
  style: 1,
  placeholder: '',
  orderIndex,
  enabled: true,
})

function buildTicketPanelDefaults(guildId: string, t: TFn) {
  return {
    guildId,
    channelId: '',
    panelMessage: t('ticket:defaultPanelMessage'),
    ...createEmptyEmbedValues('embed', { message: 'panelMessage' }),
    embedTitle: t('ticket:defaultPanelTitle'),
    embedDescription: t('ticket:defaultPanelMessage'),
    welcomeMessage: t('ticket:defaultWelcomeMessage'),
    ...createEmptyEmbedValues('welcomeEmbed', { isEmbed: 'isWelcomeEmbed', message: 'welcomeMessage' }),
    isWelcomeEmbed: true,
    welcomeEmbedTitle: t('ticket:defaultWelcomeTitle'),
    welcomeEmbedDescription: t('ticket:defaultWelcomeMessage'),
    sendTranscriptToUser: true,
    enabled: true,
    roleIds: [] as string[],
    ticketTypes: [createDefaultTicketType(t, 0)],
  }
}

export function BotTicketPanel() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [categories, setCategories] = React.useState<DiscordCategory[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'ticket', featureDisplayName: t('nav:ticketPanel') })

  const ticketPanelFormSchema = React.useMemo(() => createTicketPanelFormSchema(t), [t])

  const form = useForm<any>({
    resolver: zodResolver(ticketPanelFormSchema),
    defaultValues: buildTicketPanelDefaults(guildId, t),
  })

  // roleIds is string[]; useFieldArray's FieldArrayPath inference sometimes narrows to ticketTypes only
  const roleFields = useFieldArray({
    control: form.control,
    name: 'roleIds',
  })

  const ticketTypeFields = useFieldArray({
    control: form.control,
    name: 'ticketTypes',
  })

  // En az bir aktif talep türü var mı? (Yayınla butonu + uyarı için)
  const watchedTicketTypes = form.watch('ticketTypes') as Array<{ enabled?: boolean }> | undefined
  const hasEnabledTicketType =
    Array.isArray(watchedTicketTypes) && watchedTicketTypes.some((tt) => tt?.enabled)

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
        setCategories([...(data.categories ?? [])].sort((a, b) => a.position - b.position))
      } catch (error) {
        console.error('Kanal listesi alınamadı:', error)
        toast.error(t('common:channelsLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }
    fetchChannels()
  }, [guildId])

  // Discord renk kodunu hex'e çevir
  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
  }, [guildId, form])

  const { data: ticketPanelData, isLoading, isSuccess: panelLoaded } = useQuery({
    queryKey: ['ticketPanel', guildId],
    queryFn: () => ticketPanelApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (ticketPanelData) {
      form.reset({
        guildId: ticketPanelData.guildId,
        channelId: ticketPanelData.channelId,
        panelMessage: ticketPanelData.panelMessage || '',
        ...fromEmbedApiDto(ticketPanelData as unknown as Record<string, unknown>, 'embed', { message: 'panelMessage' }),
        welcomeMessage: ticketPanelData.welcomeMessage || '',
        ...fromEmbedApiDto(ticketPanelData as unknown as Record<string, unknown>, 'welcomeEmbed', {
          isEmbed: 'isWelcomeEmbed',
          message: 'welcomeMessage',
        }),
        transcriptChannelId: ticketPanelData.transcriptChannelId || '',
        sendTranscriptToUser: ticketPanelData.sendTranscriptToUser,
        openCategoryId: ticketPanelData.openCategoryId || '',
        openCategoryName: ticketPanelData.openCategoryName || '',
        claimedCategoryId: ticketPanelData.claimedCategoryId || '',
        claimedCategoryName: ticketPanelData.claimedCategoryName || '',
        closedCategoryId: ticketPanelData.closedCategoryId || '',
        closedCategoryName: ticketPanelData.closedCategoryName || '',
        enabled: ticketPanelData.enabled,
        roleIds: ticketPanelData.roleIds || [],
        ticketTypes: ticketPanelData.ticketTypes.map(tt => ({
          type: tt.type,
          label: tt.label,
          emoji: tt.emoji || '',
          style: tt.style,
          placeholder: tt.placeholder || '',
          orderIndex: tt.orderIndex,
          openCategoryId: tt.openCategoryId || '',
          openCategoryName: tt.openCategoryName || '',
          claimedCategoryId: tt.claimedCategoryId || '',
          claimedCategoryName: tt.claimedCategoryName || '',
          closedCategoryId: tt.closedCategoryId || '',
          closedCategoryName: tt.closedCategoryName || '',
          enabled: tt.enabled,
        })),
      })
    } else if (panelLoaded) {
      form.reset(buildTicketPanelDefaults(guildId, t))
    }
  }, [ticketPanelData, panelLoaded, form, guildId, t])

  React.useEffect(() => {
    setMode('list')
  }, [guildId])

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      ticketPanelApi.update(guildId, {
        guildId: data.guildId,
        channelId: data.channelId,
        panelMessage: data.panelMessage || undefined,
        ...toEmbedApiPayload(data, panelEmbedFields),
        welcomeMessage: data.welcomeMessage || undefined,
        ...toEmbedApiPayload(data, welcomeEmbedFields),
        transcriptChannelId: data.transcriptChannelId || undefined,
        sendTranscriptToUser: data.sendTranscriptToUser,
        openCategoryId: data.openCategoryId || undefined,
        openCategoryName: data.openCategoryName || undefined,
        claimedCategoryId: data.claimedCategoryId || undefined,
        claimedCategoryName: data.claimedCategoryName || undefined,
        closedCategoryId: data.closedCategoryId || undefined,
        closedCategoryName: data.closedCategoryName || undefined,
        enabled: data.enabled,
        roleIds: data.roleIds,
        ticketTypes: data.ticketTypes,
      }),
    onSuccess: () => {
      toast.success(t('ticket:updated'))
      queryClient.invalidateQueries({ queryKey: ['ticketPanel', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      ticketPanelApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        panelMessage: data.panelMessage || undefined,
        ...toEmbedApiPayload(data, panelEmbedFields),
        welcomeMessage: data.welcomeMessage || undefined,
        ...toEmbedApiPayload(data, welcomeEmbedFields),
        transcriptChannelId: data.transcriptChannelId || undefined,
        sendTranscriptToUser: data.sendTranscriptToUser,
        openCategoryId: data.openCategoryId || undefined,
        openCategoryName: data.openCategoryName || undefined,
        claimedCategoryId: data.claimedCategoryId || undefined,
        claimedCategoryName: data.claimedCategoryName || undefined,
        closedCategoryId: data.closedCategoryId || undefined,
        closedCategoryName: data.closedCategoryName || undefined,
        enabled: data.enabled,
        roleIds: data.roleIds,
        ticketTypes: data.ticketTypes,
      }),
    onSuccess: () => {
      toast.success(t('ticket:created'))
      queryClient.invalidateQueries({ queryKey: ['ticketPanel', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => ticketPanelApi.sendToChannel(guildId),
    onSuccess: () => {
      toast.success(t('ticket:sent'))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('ticket:sendFailed'))
    },
  })

  const onSubmit = (data: TicketPanelFormValues) => {
    if (ticketPanelData) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const onSaveAndSend = form.handleSubmit(async (data) => {
    if (ticketPanelData) {
      await updateMutation.mutateAsync(data)
    } else {
      await createMutation.mutateAsync(data)
    }
    await sendMutation.mutateAsync()
  })

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

  return renderFeatureGate(
    <>
      <Main>
        <div className='space-y-8'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('ticket:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('ticket:pageDescription')}
              </p>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <FeatureDisableButton
                guildId={guildId}
                featureName='ticket'
                featureDisplayName={t('ticketPanel')}
                confirmDescription={t('ticket:disableConfirmDescription')}
              />
              <Button
                onClick={() => {
                  if (mode !== 'list') {
                    void onSaveAndSend()
                    return
                  }
                  sendMutation.mutate()
                }}
                disabled={
                  sendMutation.isPending ||
                  updateMutation.isPending ||
                  createMutation.isPending ||
                  (mode === 'list' && !ticketPanelData) ||
                  (mode !== 'list' && !hasEnabledTicketType)
                }
                variant='outline'
              >
                {sendMutation.isPending || updateMutation.isPending || createMutation.isPending ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Send className='mr-2 size-4' />
                )}
                {mode !== 'list' ? t('ticket:saveAndPublish') : t('ticket:publishToChannel')}
              </Button>
            </div>
          </div>

          {mode === 'list' && (
          <Card className='border shadow-sm'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-base'>{t('ticket:currentConfiguration')}</CardTitle>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setMode(ticketPanelData ? 'edit' : 'create')}
                  >
                    {ticketPanelData ? <Pencil className='mr-2 size-4' /> : <Plus className='mr-2 size-4' />}
                    {ticketPanelData ? t('ticket:edit') : t('ticket:create')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ticketPanelData ? (
                <div className='text-sm text-muted-foreground'>
                  {t('ticket:panelChannelLabel')} <span className='font-medium'>{channels.find((c) => c.id === ticketPanelData.channelId)?.name || ticketPanelData.channelId}</span>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('ticket:noDataYet')}</p>
              )}
            </CardContent>
          </Card>
          )}

          {mode !== 'list' && (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='flex justify-end'>
                <Button type='button' variant='ghost' className='h-8 px-2' onClick={() => setMode('list')}>
                  <X className='mr-1 size-4' />
                  {t('ticket:close')}
                </Button>
              </div>
              <SectionNav
                items={[
                  { id: 'general', label: t('ticket:navGeneral') },
                  { id: 'panel', label: t('ticket:navPanelMessage') },
                  { id: 'welcome', label: t('ticket:navWelcomeMessage') },
                  { id: 'types', label: t('ticket:navTicketTypes') },
                  { id: 'categories', label: t('ticket:navCategories') },
                  { id: 'transcript', label: t('ticket:navTranscript') },
                ]}
              />
              <div className='space-y-8'>
                <PageSection id='general'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:generalSettingsTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:generalSettingsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('ticket:publishChannelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('ticket:channelsLoading') : t('ticket:selectChannel')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>#</span>
                                        <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                        {channels.find((c) => c.id === field.value)?.nsfw && (
                                          <span className='text-xs text-muted-foreground'>(NSFW)</span>
                                        )}
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  items={channels.map((c) => ({
                                    value: c.id,
                                    label: c.nsfw ? `# ${c.name} (NSFW)` : `# ${c.name}`,
                                  }))}
                                  searchPlaceholder={t('ticket:searchChannel')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('ticket:publishChannelDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='roleIds'
                        render={() => (
                          <FormItem>
                            <FormLabel>{t('ticket:managerRolesLabel')}</FormLabel>
                            <FormDescription>
                              {t('ticket:managerRolesDescription')}
                            </FormDescription>
                            {roleFields.fields.map((field, index) => (
                              <div key={field.id} className='flex items-center gap-2'>
                                <FormField
                                  control={form.control}
                                  name={`roleIds.${index}`}
                                  render={({ field }) => (
                                    <FormItem className='flex-1'>
                                      <FormControl>
                                        <Select
                                          value={field.value || ''}
                                          onValueChange={field.onChange}
                                          disabled={rolesLoading}
                                        >
                                          <SelectTrigger className='h-11'>
                                            <SelectValue placeholder={rolesLoading ? t('ticket:rolesLoading') : t('ticket:selectRole')}>
                                              {field.value && roles.find((r) => r.id === field.value) && (
                                                <div className='flex items-center gap-2'>
                                                  <div
                                                    className='size-4 rounded-full border-2 border-background'
                                                    style={{
                                                      backgroundColor: getRoleColor(
                                                        roles.find((r) => r.id === field.value)?.color || 0
                                                      ),
                                                    }}
                                                  />
                                                  <span>{roles.find((r) => r.id === field.value)?.name}</span>
                                                </div>
                                              )}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SearchableSelectContent
                                            className='max-h-[300px]'
                                            items={roles.map((r) => ({
                                              value: r.id,
                                              label: r.managed ? t('ticket:roleBotSuffix', { name: r.name }) : r.name,
                                            }))}
                                            searchPlaceholder={t('ticket:searchRole')}
                                            loading={rolesLoading}
                                          />
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => roleFields.remove(index)}
                                >
                                  <Trash2 className='size-4' />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => (roleFields.append as unknown as (value: string) => void)('')}
                            >
                              <Plus className='mr-2 size-4' />
                              {t('ticket:addRole')}
                            </Button>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='panel'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:panelMessageTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:panelMessageDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={panelEmbedFields}
                        showMessage={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />

                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='welcome'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:welcomeMessageTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:welcomeMessageDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={welcomeEmbedFields}
                        showMessage={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />

                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='types'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:ticketTypesTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:ticketTypesDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {!hasEnabledTicketType && (
                        <div className='rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400'>
                          {t('ticket:noActiveTypeWarningPre')} <strong>{t('ticket:noActiveTypeWarningActive')}</strong> {t('ticket:noActiveTypeWarningPost')}
                        </div>
                      )}
                      {ticketTypeFields.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className='pt-6 space-y-4'>
                            <div className='flex items-center justify-between'>
                              <h3 className='text-lg font-semibold'>{t('ticket:ticketTypeHeading', { index: index + 1 })}</h3>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={() => ticketTypeFields.remove(index)}
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </div>

                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('ticket:typeLabel')}</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value?.toString() || '0'}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('ticket:selectType')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value='0'>{t('ticket:typeButton')}</SelectItem>
                                      <SelectItem value='1'>{t('ticket:typeDropdown')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('ticket:buttonOrMenuLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('ticket:createTicket')} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.emoji`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('ticket:emojiLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder='🎫' {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {form.watch(`ticketTypes.${index}.type`) === 0 && (
                              <FormField
                                control={form.control}
                                name={`ticketTypes.${index}.style`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('ticket:buttonColorLabel')}</FormLabel>
                                    <Select
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      value={field.value?.toString() || '1'}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder={t('ticket:selectColor')} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value='1'>{t('ticket:colorPrimary')}</SelectItem>
                                        <SelectItem value='2'>{t('ticket:colorSecondary')}</SelectItem>
                                        <SelectItem value='3'>{t('ticket:colorSuccess')}</SelectItem>
                                        <SelectItem value='4'>{t('ticket:colorDanger')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {form.watch(`ticketTypes.${index}.type`) === 1 && (
                              <FormField
                                control={form.control}
                                name={`ticketTypes.${index}.placeholder`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('ticket:placeholderLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t('ticket:selectTicketTypePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.enabled`}
                              render={({ field }) => (
                                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                                  <div className='space-y-0.5'>
                                    <FormLabel className='text-base'>{t('ticket:activeLabel')}</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      ))}

                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => ticketTypeFields.append({
                          type: 0,
                          label: '',
                          emoji: '',
                          style: 1,
                          placeholder: '',
                          orderIndex: ticketTypeFields.fields.length,
                          enabled: true,
                        })}
                      >
                        <Plus className='mr-2 size-4' />
                        {t('ticket:addTicketType')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='categories'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:categoriesTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:categoriesDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <FormField
                        control={form.control}
                        name='openCategoryId'
                        render={({ field }) => {
                          const selectValue =
                            field.value && categories.some((c) => c.id === field.value)
                              ? field.value
                              : CATEGORY_BY_NAME
                          return (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('ticket:openCategoryLabel')}</FormLabel>
                              <FormControl>
                                <Select
                                  value={selectValue}
                                  onValueChange={(v) => {
                                    if (v === CATEGORY_BY_NAME) {
                                      field.onChange('')
                                      form.setValue('openCategoryName', '')
                                    } else {
                                      const cat = categories.find((c) => c.id === v)
                                      field.onChange(v)
                                      form.setValue('openCategoryName', cat?.name ?? '')
                                    }
                                  }}
                                  disabled={channelsLoading}
                                >
                                  <SelectTrigger className='h-11 w-full'>
                                    <SelectValue
                                      placeholder={channelsLoading ? t('ticket:loading') : t('ticket:selectCategory')}
                                    />
                                  </SelectTrigger>
                                  <SearchableSelectContent
                                    items={[
                                      {
                                        value: CATEGORY_BY_NAME,
                                        label: t('ticket:newCategoryOption'),
                                      },
                                      ...categories.map((c) => ({
                                        value: c.id,
                                        label: `📁 ${c.name}`,
                                      })),
                                    ]}
                                    searchPlaceholder={t('ticket:searchCategory')}
                                    loading={channelsLoading}
                                  />
                                </Select>
                              </FormControl>
                              <FormDescription>
                                {t('ticket:openCategorySelectDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                      <FormField
                        control={form.control}
                        name='openCategoryName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ticket:categoryNameLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('ticket:openCategoryNamePlaceholder')}
                                {...field}
                                disabled={channelsLoading}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('ticket:categoryNameDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='claimedCategoryId'
                        render={({ field }) => {
                          const selectValue =
                            field.value && categories.some((c) => c.id === field.value)
                              ? field.value
                              : CATEGORY_BY_NAME
                          return (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('ticket:claimedCategoryLabel')}</FormLabel>
                              <FormControl>
                                <Select
                                  value={selectValue}
                                  onValueChange={(v) => {
                                    if (v === CATEGORY_BY_NAME) {
                                      field.onChange('')
                                      form.setValue('claimedCategoryName', '')
                                    } else {
                                      const cat = categories.find((c) => c.id === v)
                                      field.onChange(v)
                                      form.setValue('claimedCategoryName', cat?.name ?? '')
                                    }
                                  }}
                                  disabled={channelsLoading}
                                >
                                  <SelectTrigger className='h-11 w-full'>
                                    <SelectValue placeholder={channelsLoading ? t('ticket:loading') : t('ticket:selectCategory')} />
                                  </SelectTrigger>
                                  <SearchableSelectContent
                                    items={[
                                      {
                                        value: CATEGORY_BY_NAME,
                                        label: t('ticket:newCategoryOption'),
                                      },
                                      ...categories.map((c) => ({
                                        value: c.id,
                                        label: `📁 ${c.name}`,
                                      })),
                                    ]}
                                    searchPlaceholder={t('ticket:searchCategory')}
                                    loading={channelsLoading}
                                  />
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                      <FormField
                        control={form.control}
                        name='claimedCategoryName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ticket:categoryNameLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('ticket:claimedCategoryNamePlaceholder')} {...field} disabled={channelsLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='closedCategoryId'
                        render={({ field }) => {
                          const selectValue =
                            field.value && categories.some((c) => c.id === field.value)
                              ? field.value
                              : CATEGORY_BY_NAME
                          return (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('ticket:closedCategoryLabel')}</FormLabel>
                              <FormControl>
                                <Select
                                  value={selectValue}
                                  onValueChange={(v) => {
                                    if (v === CATEGORY_BY_NAME) {
                                      field.onChange('')
                                      form.setValue('closedCategoryName', '')
                                    } else {
                                      const cat = categories.find((c) => c.id === v)
                                      field.onChange(v)
                                      form.setValue('closedCategoryName', cat?.name ?? '')
                                    }
                                  }}
                                  disabled={channelsLoading}
                                >
                                  <SelectTrigger className='h-11 w-full'>
                                    <SelectValue placeholder={channelsLoading ? t('ticket:loading') : t('ticket:selectCategory')} />
                                  </SelectTrigger>
                                  <SearchableSelectContent
                                    items={[
                                      {
                                        value: CATEGORY_BY_NAME,
                                        label: t('ticket:newCategoryOption'),
                                      },
                                      ...categories.map((c) => ({
                                        value: c.id,
                                        label: `📁 ${c.name}`,
                                      })),
                                    ]}
                                    searchPlaceholder={t('ticket:searchCategory')}
                                    loading={channelsLoading}
                                  />
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                      <FormField
                        control={form.control}
                        name='closedCategoryName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ticket:categoryNameLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('ticket:closedCategoryNamePlaceholder')} {...field} disabled={channelsLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='transcript'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('ticket:transcriptTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('ticket:transcriptDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <FormField
                        control={form.control}
                        name='transcriptChannelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('ticket:transcriptChannelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || '__none__'}
                                onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('ticket:channelsLoading') : t('ticket:selectChannelOptional')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>#</span>
                                        <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                        {channels.find((c) => c.id === field.value)?.nsfw && (
                                          <span className='text-xs text-muted-foreground'>(NSFW)</span>
                                        )}
                                      </div>
                                    )}
                                    {!field.value && (
                                      <span className='text-muted-foreground'>{t('ticket:noChannelSelected')}</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  items={[
                                    { value: '__none__', label: t('ticket:noChannelSelected') },
                                    ...channels.map((c) => ({
                                      value: c.id,
                                      label: c.nsfw ? `# ${c.name} (NSFW)` : `# ${c.name}`,
                                    })),
                                  ]}
                                  searchPlaceholder={t('ticket:searchChannel')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('ticket:transcriptChannelDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='sendTranscriptToUser'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <FormLabel className='text-base'>{t('ticket:sendToUserLabel')}</FormLabel>
                              <FormDescription>
                                {t('ticket:sendToUserDescription')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>
              </div>

              <div className='flex justify-end'>
                <Button
                  type='submit'
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {updateMutation.isPending || createMutation.isPending ? (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  ) : (
                    <Save className='mr-2 size-4' />
                  )}
                  {t('ticket:save')}
                </Button>
              </div>
            </form>
          </Form>
          )}
        </div>
      </Main>
    </>
  )
}




