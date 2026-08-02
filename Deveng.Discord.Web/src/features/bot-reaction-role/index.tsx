import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { reactionRoleApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Plus, Trash2, Send, MessageSquareOff, X, Edit2 } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { DiscordRole, DiscordChannel } from '@/lib/api/discord'
import {
  createEmbedSchema,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
  EMBED_DESCRIPTION_INSERT_TAGS,
} from '@/components/embed-editor'

const embedFields = defaultEmbedFieldNames

const createReactionRoleFormSchema = (t: (key: string) => string) =>
  z
    .object({
      guildId: z.string().min(1, t('reactionRole:validationGuildIdRequired')),
      channelId: z.string().optional(),
      normalMessage: z.string().optional(),
      enabled: z.boolean(),
      enableEmoji: z.boolean(),
      enableButton: z.boolean(),
      enableMenu: z.boolean(),
      emojis: z.array(z.object({
        emoji: z.string().min(1, t('reactionRole:validationEmojiRequired')),
        roleId: z.string().min(1, t('reactionRole:validationRoleIdRequired')),
        orderIndex: z.number(),
        enabled: z.boolean(),
      })),
      buttons: z.array(z.object({
        label: z.string().min(1, t('reactionRole:validationLabelRequired')),
        emoji: z.string().optional(),
        roleId: z.string().min(1, t('reactionRole:validationRoleIdRequired')),
        style: z.number(),
        orderIndex: z.number(),
        enabled: z.boolean(),
      })),
      menus: z.array(z.object({
        placeholder: z.string().optional(),
        minValues: z.number(),
        maxValues: z.number(),
        enabled: z.boolean(),
        options: z.array(z.object({
          label: z.string().min(1, t('reactionRole:validationLabelRequired')),
          description: z.string().optional(),
          roleId: z.string().min(1, t('reactionRole:validationRoleIdRequired')),
          emoji: z.string().optional(),
          orderIndex: z.number(),
          enabled: z.boolean(),
        })),
      })),
    })
    .merge(createEmbedSchema(embedFields))

type ReactionRoleFormValues = z.infer<ReturnType<typeof createReactionRoleFormSchema>>

export function BotReactionRole() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false)
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')
  /** Düzenlenen panel veritabanı Id (yalnızca mode=edit) */
  const [editingPanelId, setEditingPanelId] = React.useState<number | null>(null)
  const [removeTargetId, setRemoveTargetId] = React.useState<number | null>(null)

  const { t } = useTranslation(['reactionRole', 'common'])
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'reaction-role', featureDisplayName: t('reactionRole:featureDisplayName') })

  const reactionRoleFormSchema = React.useMemo(() => createReactionRoleFormSchema(t), [t])

  const form = useForm<any>({
    resolver: zodResolver(reactionRoleFormSchema),
    defaultValues: {
      guildId: guildId,
      channelId: '',
      normalMessage: '',
      ...createEmptyEmbedValues('embed'),
      enabled: true,
      enableEmoji: true,
      enableButton: true,
      enableMenu: true,
      emojis: [],
      buttons: [],
      menus: [],
    },
  })

  const emojiFields = useFieldArray({
    control: form.control,
    name: 'emojis',
  })

  const buttonFields = useFieldArray({
    control: form.control,
    name: 'buttons',
  })

  const menuFields = useFieldArray({
    control: form.control,
    name: 'menus',
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
  }, [guildId, form])

  React.useEffect(() => {
    setMode('list')
    setEditingPanelId(null)
  }, [guildId])

  const { data: reactionRoleList = [], isLoading } = useQuery({
    queryKey: ['reactionRole', guildId],
    queryFn: () => reactionRoleApi.listByGuildId(guildId),
    enabled: !!guildId,
  })

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
        toast.error(t('reactionRole:rolesLoadError'))
      } finally {
        setRolesLoading(false)
      }
    }
    fetchRoles()
  }, [guildId, t])

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
        toast.error(t('reactionRole:channelsLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }
    fetchChannels()
  }, [guildId, t])

  // Discord renk kodunu hex'e çevir
  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  React.useEffect(() => {
    if (mode !== 'edit' || editingPanelId == null) return
    const panel = reactionRoleList.find((r) => r.id === editingPanelId)
    if (!panel) return
    form.reset({
      guildId: panel.guildId,
      channelId: panel.channelId || '',
      normalMessage: panel.normalMessage || '',
      ...fromEmbedApiDto(panel as unknown as Record<string, unknown>, 'embed'),
      enabled: panel.enabled,
      enableEmoji: panel.enableEmoji,
      enableButton: panel.enableButton,
      enableMenu: panel.enableMenu,
      emojis: panel.emojis.map((e) => ({
        emoji: e.emoji,
        roleId: e.roleId,
        orderIndex: e.orderIndex,
        enabled: e.enabled,
      })),
      buttons: panel.buttons.map((b) => ({
        label: b.label,
        emoji: b.emoji || '',
        roleId: b.roleId,
        style: b.style,
        orderIndex: b.orderIndex,
        enabled: b.enabled,
      })),
      menus: panel.menus.map((m) => ({
        placeholder: m.placeholder || '',
        minValues: m.minValues,
        maxValues: m.maxValues,
        enabled: m.enabled,
        options: m.options.map((o) => ({
          label: o.label,
          description: o.description || '',
          roleId: o.roleId,
          emoji: o.emoji || '',
          orderIndex: o.orderIndex,
          enabled: o.enabled,
        })),
      })),
    })
  }, [reactionRoleList, editingPanelId, mode, form])

  const updateMutation = useMutation({
    mutationFn: (vars: { panelId: number; data: any }) =>
      reactionRoleApi.update(guildId, vars.panelId, {
        guildId,
        channelId: vars.data.channelId || undefined,
        normalMessage: vars.data.normalMessage || undefined,
        ...toEmbedApiPayload(vars.data, embedFields),
        enabled: vars.data.enabled,
        enableEmoji: vars.data.enableEmoji,
        enableButton: vars.data.enableButton,
        enableMenu: vars.data.enableMenu,
        emojis: vars.data.emojis,
        buttons: vars.data.buttons,
        menus: vars.data.menus,
      }),
    onSuccess: () => {
      toast.success(t('reactionRole:updated'))
      queryClient.invalidateQueries({ queryKey: ['reactionRole', guildId] })
      setMode('list')
      setEditingPanelId(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      reactionRoleApi.create({
        guildId,
        channelId: data.channelId || undefined,
        normalMessage: data.normalMessage || undefined,
        ...toEmbedApiPayload(data, embedFields),
        enabled: data.enabled,
        enableEmoji: data.enableEmoji,
        enableButton: data.enableButton,
        enableMenu: data.enableMenu,
        emojis: data.emojis,
        buttons: data.buttons,
        menus: data.menus,
      }),
    onSuccess: () => {
      toast.success(t('reactionRole:created'))
      queryClient.invalidateQueries({ queryKey: ['reactionRole', guildId] })
      setMode('list')
      setEditingPanelId(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const sendMutation = useMutation({
    mutationFn: (panelId: number) => reactionRoleApi.sendToChannel(guildId, panelId),
    onSuccess: () => {
      toast.success(t('reactionRole:sent'))
      queryClient.invalidateQueries({ queryKey: ['reactionRole', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('reactionRole:sendFailed'))
    },
  })

  const removeSentMutation = useMutation({
    mutationFn: (panelId: number) => reactionRoleApi.removeSentMessage(guildId, panelId),
    onSuccess: () => {
      toast.success(t('reactionRole:removed'))
      queryClient.invalidateQueries({ queryKey: ['reactionRole', guildId] })
      setRemoveConfirmOpen(false)
      setRemoveTargetId(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('reactionRole:removeFailed'))
    },
  })

  const deletePanelMutation = useMutation({
    mutationFn: (panelId: number) => reactionRoleApi.delete(guildId, panelId),
    onSuccess: () => {
      toast.success(t('reactionRole:panelDeleted'))
      queryClient.invalidateQueries({ queryKey: ['reactionRole', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSubmit = (data: ReactionRoleFormValues) => {
    if (mode === 'edit' && editingPanelId != null) {
      updateMutation.mutate({ panelId: editingPanelId, data })
    } else {
      createMutation.mutate(data)
    }
  }

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
        <div className='space-y-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-1'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('reactionRole:pageTitle')}</h1>
              <p className='text-sm text-muted-foreground'>{t('reactionRole:pageDescription')}</p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='reaction-role'
              featureDisplayName={t('reactionRole:featureDisplayName')}
              confirmDescription={t('reactionRole:disableConfirmDescription')}
            />
          </div>

          <ConfirmDialog
            open={removeConfirmOpen}
            onOpenChange={(open) => {
              setRemoveConfirmOpen(open)
              if (!open) setRemoveTargetId(null)
            }}
            title={t('reactionRole:removeSentConfirmTitle')}
            desc={t('reactionRole:removeSentConfirmDesc')}
            cancelBtnText={t('common:cancel')}
            confirmText={t('reactionRole:removeSent')}
            destructive
            isLoading={removeSentMutation.isPending}
            handleConfirm={() => {
              if (removeTargetId != null) removeSentMutation.mutate(removeTargetId)
            }}
          />

          {mode === 'list' && (
            <Card className='shadow-sm'>
              <CardHeader className='pb-3'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <CardTitle className='text-base'>{t('reactionRole:panelsTitle')}</CardTitle>
                  <Button
                    type='button'
                    variant='default'
                    size='sm'
                    onClick={() => {
                      setEditingPanelId(null)
                      form.reset({
                        guildId,
                        channelId: '',
                        normalMessage: '',
                        ...createEmptyEmbedValues('embed'),
                        enabled: true,
                        enableEmoji: true,
                        enableButton: true,
                        enableMenu: true,
                        emojis: [],
                        buttons: [],
                        menus: [],
                      })
                      setMode('create')
                    }}
                  >
                    <Plus className='mr-2 size-4' />
                    {t('reactionRole:newPanel')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {reactionRoleList.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>{t('reactionRole:emptyPanels')}</p>
                ) : (
                  <div className='space-y-3'>
                    {reactionRoleList.map((panel) => (
                      <div
                        key={panel.id}
                        className='flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between'
                      >
                        <div className='min-w-0 space-y-1 text-sm'>
                          <p className='font-medium text-foreground'>
                            {t('reactionRole:panelRowTitle', { id: panel.id })}
                            {panel.embedTitle ? ` — ${panel.embedTitle}` : ''}
                          </p>
                          {panel.messageId ? (
                            <p className='text-muted-foreground'>
                              <span>{t('reactionRole:messageIdShort')}: </span>
                              <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>{panel.messageId}</code>
                            </p>
                          ) : (
                            <p className='text-muted-foreground'>{t('reactionRole:messageNotLinked')}</p>
                          )}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setEditingPanelId(panel.id)
                              setMode('edit')
                            }}
                          >
                            <Edit2 className='mr-2 size-4' />
                            {t('common:edit')}
                          </Button>
                          <Button
                            type='button'
                            variant='default'
                            size='sm'
                            disabled={sendMutation.isPending || removeSentMutation.isPending}
                            onClick={() => sendMutation.mutate(panel.id)}
                          >
                            {sendMutation.isPending ? (
                              <Loader2 className='mr-2 size-4 animate-spin' />
                            ) : (
                              <Send className='mr-2 size-4' />
                            )}
                            {t('reactionRole:sendToChannel')}
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            disabled={!panel.messageId || sendMutation.isPending || removeSentMutation.isPending}
                            onClick={() => {
                              setRemoveTargetId(panel.id)
                              setRemoveConfirmOpen(true)
                            }}
                          >
                            <MessageSquareOff className='mr-2 size-4' />
                            {t('reactionRole:removeSent')}
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            disabled={deletePanelMutation.isPending}
                            onClick={() => {
                              if (window.confirm(t('reactionRole:deletePanelConfirm'))) {
                                deletePanelMutation.mutate(panel.id)
                              }
                            }}
                          >
                            <Trash2 className='mr-2 size-4' />
                            {t('common:delete')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mode !== 'list' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => {
                    setMode('list')
                    setEditingPanelId(null)
                  }}
                >
                  <X className='mr-1 size-4' />
                  {t('common:close')}
                </Button>
              </div>

              <Card className='shadow-sm'>
                <CardContent className='pt-6'>
                  <FormField
                    control={form.control}
                    name='channelId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-base font-semibold'>{t('reactionRole:selectChannel')}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || '__none__'}
                            onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                            disabled={channelsLoading}
                          >
                            <SelectTrigger className='h-11 w-full'>
                              <SelectValue placeholder={channelsLoading ? t('common:channelsLoading') : t('reactionRole:channelOptionalPlaceholder')}>
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
                                  <span className='text-muted-foreground'>{t('reactionRole:channelNotSelected')}</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SearchableSelectContent
                              items={[
                                { value: '__none__', label: t('reactionRole:channelNotSelected') },
                                ...channels.map((c) => ({
                                  value: c.id,
                                  label: c.nsfw ? `# ${c.name} (NSFW)` : `# ${c.name}`,
                                })),
                              ]}
                              searchPlaceholder={t('reactionRole:channelSearch')}
                              loading={channelsLoading}
                            />
                          </Select>
                        </FormControl>
                        <FormDescription className='text-sm'>
                          {t('reactionRole:messageChannelDesc')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <SectionNav
                items={[
                  { id: 'general', label: t('reactionRole:tabGeneral') },
                  { id: 'embed', label: t('reactionRole:tabEmbed') },
                  { id: 'emojis', label: t('reactionRole:tabEmojis') },
                  { id: 'buttons', label: t('reactionRole:tabButtons') },
                  { id: 'menus', label: t('reactionRole:tabMenus') },
                ]}
              />
              <div className='space-y-8'>
                {/* Genel Ayarlar */}
                <PageSection id='general'>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reactionRole:generalSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {!form.watch('isEmbed') && (
                        <FormField
                          control={form.control}
                          name='normalMessage'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('reactionRole:normalMessage')}</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder={t('reactionRole:normalMessagePlaceholder')}
                                  rows={3}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('reactionRole:normalMessageDesc')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className='grid grid-cols-2 gap-4'>
                        <FormField
                          control={form.control}
                          name='enableEmoji'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                              <div className='space-y-0.5'>
                                <FormLabel className='text-base'>{t('reactionRole:emojiActive')}</FormLabel>
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

                        <FormField
                          control={form.control}
                          name='enableButton'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                              <div className='space-y-0.5'>
                                <FormLabel className='text-base'>{t('reactionRole:buttonActive')}</FormLabel>
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

                        <FormField
                          control={form.control}
                          name='enableMenu'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                              <div className='space-y-0.5'>
                                <FormLabel className='text-base'>{t('reactionRole:menuActive')}</FormLabel>
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
                      </div>
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Embed Ayarları */}
                <PageSection id='embed'>
                  <Card className='shadow-sm'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-lg'>{t('reactionRole:embedSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={embedFields}
                        showMessage={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />

                    </CardContent>
                  </Card>
                </PageSection>

                {/* Emojiler */}
                <PageSection id='emojis'>
                  <Card className='shadow-sm'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-lg'>{t('reactionRole:emojiSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      {emojiFields.fields.map((field, index) => (
                        <Card key={field.id} className='border p-4'>
                          <div className='space-y-5'>
                            <div className='flex items-center justify-between'>
                              <h4 className='text-lg font-semibold'>{t('reactionRole:emojiN', { n: index + 1 })}</h4>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => emojiFields.remove(index)}
                                className='h-8 w-8 p-0'
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                              <FormField
                                control={form.control}
                                name={`emojis.${index}.emoji`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:emojiLabel')}</FormLabel>
                                    <FormControl>
                                      <Input {...field} className='h-11' placeholder={t('reactionRole:emojiPlaceholder')} />
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:emojiExample')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`emojis.${index}.roleId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:selectRole')}</FormLabel>
                                    <FormControl>
                                      <Select
                                        value={field.value || ''}
                                        onValueChange={field.onChange}
                                        disabled={rolesLoading}
                                      >
                                        <SelectTrigger className='h-11 w-full'>
                                          <SelectValue placeholder={rolesLoading ? t('common:rolesLoading') : t('common:selectRole')}>
                                            {field.value && roles.find((r) => r.id === field.value) && (
                                              <div className='flex items-center gap-2'>
                                                <div
                                                  className='size-4 rounded-full border-2 border-background flex-shrink-0'
                                                  style={{
                                                    backgroundColor: getRoleColor(
                                                      roles.find((r) => r.id === field.value)?.color || 0
                                                    ),
                                                  }}
                                                />
                                                <span className='truncate'>{roles.find((r) => r.id === field.value)?.name}</span>
                                              </div>
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SearchableSelectContent
                                          className='max-h-[300px]'
                                          items={roles.map((r) => ({
                                            value: r.id,
                                            label: r.managed ? `${r.name} ${t('reactionRole:botRoleSuffix')}` : r.name,
                                          }))}
                                          searchPlaceholder={t('common:searchPlaceholder')}
                                          loading={rolesLoading}
                                        />
                                      </Select>
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:roleForEmojiDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                              <FormField
                                control={form.control}
                                name={`emojis.${index}.orderIndex`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:order')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type='number'
                                        className='h-11'
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:emojiOrderDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`emojis.${index}.enabled`}
                                render={({ field }) => (
                                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                                    <div className='space-y-0.5'>
                                      <FormLabel className='text-base font-semibold'>{t('common:active')}</FormLabel>
                                      <FormDescription className='text-sm'>
                                        {t('reactionRole:enableThisEmoji')}
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
                            </div>
                          </div>
                        </Card>
                      ))}

                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => emojiFields.append({
                          emoji: '',
                          roleId: '',
                          orderIndex: emojiFields.fields.length,
                          enabled: true,
                        })}
                        className='w-full'
                      >
                        <Plus className='mr-2 size-4' />
                        {t('reactionRole:addEmoji')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Butonlar */}
                <PageSection id='buttons'>
                  <Card className='shadow-sm'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-lg'>{t('reactionRole:buttonSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      {buttonFields.fields.map((field, index) => (
                        <Card key={field.id} className='border p-4'>
                          <div className='space-y-5'>
                            <div className='flex items-center justify-between'>
                              <h4 className='text-lg font-semibold'>{t('reactionRole:buttonN', { n: index + 1 })}</h4>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => buttonFields.remove(index)}
                                className='h-8 w-8 p-0'
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </div>

                            <FormField
                              control={form.control}
                              name={`buttons.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('reactionRole:buttonLabelLabel')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} className='h-11' />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('reactionRole:buttonLabelDesc')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className='grid grid-cols-2 gap-4'>
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.emoji`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:emojiOptional')}</FormLabel>
                                    <FormControl>
                                      <Input {...field} className='h-11' placeholder={t('reactionRole:emojiPlaceholder')} />
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:emojiOnButtonDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`buttons.${index}.roleId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:selectRole')}</FormLabel>
                                    <FormControl>
                                      <Select
                                        value={field.value || ''}
                                        onValueChange={field.onChange}
                                        disabled={rolesLoading}
                                      >
                                        <SelectTrigger className='h-11 w-full'>
                                          <SelectValue placeholder={rolesLoading ? t('common:rolesLoading') : t('common:selectRole')}>
                                            {field.value && roles.find((r) => r.id === field.value) && (
                                              <div className='flex items-center gap-2'>
                                                <div
                                                  className='size-4 rounded-full border-2 border-background flex-shrink-0'
                                                  style={{
                                                    backgroundColor: getRoleColor(
                                                      roles.find((r) => r.id === field.value)?.color || 0
                                                    ),
                                                  }}
                                                />
                                                <span className='truncate'>{roles.find((r) => r.id === field.value)?.name}</span>
                                              </div>
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SearchableSelectContent
                                          className='max-h-[300px]'
                                          items={roles.map((r) => ({
                                            value: r.id,
                                            label: r.managed ? `${r.name} ${t('reactionRole:botRoleSuffix')}` : r.name,
                                          }))}
                                          searchPlaceholder={t('common:searchPlaceholder')}
                                          loading={rolesLoading}
                                        />
                                      </Select>
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:roleForButtonDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.style`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:style')}</FormLabel>
                                    <Select
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      value={field.value?.toString() || '1'}
                                    >
                                      <FormControl>
                                        <SelectTrigger className='h-11 w-full'>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value='1'>Primary</SelectItem>
                                        <SelectItem value='2'>Secondary</SelectItem>
                                        <SelectItem value='3'>Success</SelectItem>
                                        <SelectItem value='4'>Danger</SelectItem>
                                        <SelectItem value='5'>Link</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:styleDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`buttons.${index}.orderIndex`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:order')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type='number'
                                        className='h-11'
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:orderDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`buttons.${index}.enabled`}
                                render={({ field }) => (
                                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                                    <div className='space-y-0.5'>
                                      <FormLabel className='text-base font-semibold'>{t('common:active')}</FormLabel>
                                      <FormDescription className='text-sm'>
                                        {t('reactionRole:enableThisButton')}
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
                            </div>
                          </div>
                        </Card>
                      ))}

                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => buttonFields.append({
                          label: '',
                          emoji: '',
                          roleId: '',
                          style: 1,
                          orderIndex: buttonFields.fields.length,
                          enabled: true,
                        })}
                        className='w-full'
                      >
                        <Plus className='mr-2 size-4' />
                        {t('reactionRole:addButton')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Menüler */}
                <PageSection id='menus'>
                  <Card className='shadow-sm'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-lg'>{t('reactionRole:menuSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      {menuFields.fields.map((field, menuIndex) => {
                        return (
                          <Card key={field.id} className='border p-4'>
                            <div className='space-y-5'>
                              <div className='flex items-center justify-between'>
                                <h4 className='text-lg font-semibold'>{t('reactionRole:menuN', { n: menuIndex + 1 })}</h4>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => menuFields.remove(menuIndex)}
                                  className='h-8 w-8 p-0'
                                >
                                  <Trash2 className='size-4' />
                                </Button>
                              </div>

                              <FormField
                                control={form.control}
                                name={`menus.${menuIndex}.placeholder`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('reactionRole:menuPlaceholderField')}</FormLabel>
                                    <FormControl>
                                      <Input {...field} className='h-11' placeholder={t('reactionRole:menuPlaceholderInputPlaceholder')} />
                                    </FormControl>
                                    <FormDescription className='text-sm'>
                                      {t('reactionRole:menuPlaceholderDesc')}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                                <FormField
                                  control={form.control}
                                  name={`menus.${menuIndex}.minValues`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className='text-base font-semibold'>{t('reactionRole:menuMinField')}</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type='number'
                                          className='h-11'
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                      </FormControl>
                                      <FormDescription className='text-sm'>
                                        {t('reactionRole:menuMinDesc')}
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`menus.${menuIndex}.maxValues`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className='text-base font-semibold'>{t('reactionRole:menuMaxField')}</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type='number'
                                          className='h-11'
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                      </FormControl>
                                      <FormDescription className='text-sm'>
                                        {t('reactionRole:menuMaxDesc')}
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`menus.${menuIndex}.enabled`}
                                  render={({ field }) => (
                                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                                      <div className='space-y-0.5'>
                                        <FormLabel className='text-base font-semibold'>{t('reactionRole:menuEnabledField')}</FormLabel>
                                        <FormDescription className='text-sm'>
                                          {t('reactionRole:menuEnabledDesc')}
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
                              </div>

                              <div className='space-y-3'>
                                <h5 className='text-base font-semibold'>{t('reactionRole:menuOptionsTitle')}</h5>
                                {form.watch(`menus.${menuIndex}.options`)?.map((_: any, optionIndex: number) => (
                                  <Card key={optionIndex} className='border p-3'>
                                    <div className='space-y-4'>
                                      <div className='flex items-center justify-between'>
                                        <span className='text-sm font-medium text-muted-foreground'>
                                          {t('reactionRole:menuOptionN', { n: optionIndex + 1 })}
                                        </span>
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='sm'
                                          onClick={() => {
                                            const currentOptions = form.getValues(`menus.${menuIndex}.options`) || []
                                            const newOptions = currentOptions.filter((_: any, idx: number) => idx !== optionIndex)
                                            form.setValue(`menus.${menuIndex}.options`, newOptions)
                                          }}
                                          className='h-8 w-8 p-0'
                                        >
                                          <Trash2 className='size-4' />
                                        </Button>
                                      </div>

                                      <FormField
                                        control={form.control}
                                        name={`menus.${menuIndex}.options.${optionIndex}.label`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className='text-base font-semibold'>{t('reactionRole:menuOptionLabel')}</FormLabel>
                                            <FormControl>
                                              <Input {...field} className='h-11' placeholder={t('reactionRole:menuOptionLabelPlaceholder')} />
                                            </FormControl>
                                            <FormDescription className='text-sm'>
                                              {t('reactionRole:menuOptionLabelDesc')}
                                            </FormDescription>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={`menus.${menuIndex}.options.${optionIndex}.description`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className='text-base font-semibold'>{t('reactionRole:menuOptionDescription')}</FormLabel>
                                            <FormControl>
                                              <Input {...field} className='h-11' placeholder={t('reactionRole:menuOptionDescriptionPlaceholder')} />
                                            </FormControl>
                                            <FormDescription className='text-sm'>
                                              {t('reactionRole:menuOptionDescriptionDesc')}
                                            </FormDescription>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                                        <FormField
                                          control={form.control}
                                          name={`menus.${menuIndex}.options.${optionIndex}.roleId`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className='text-base font-semibold'>{t('reactionRole:selectRole')}</FormLabel>
                                              <FormControl>
                                                <Select
                                                  value={field.value || ''}
                                                  onValueChange={field.onChange}
                                                  disabled={rolesLoading}
                                                >
                                                  <SelectTrigger className='h-11 w-full'>
                                                    <SelectValue placeholder={rolesLoading ? t('common:rolesLoading') : t('common:selectRole')}>
                                                      {field.value && roles.find((r) => r.id === field.value) && (
                                                        <div className='flex items-center gap-2'>
                                                          <div
                                                            className='size-4 rounded-full border-2 border-background flex-shrink-0'
                                                            style={{ backgroundColor: getRoleColor(roles.find((r) => r.id === field.value)!.color) }}
                                                          />
                                                          <span className='truncate'>{roles.find((r) => r.id === field.value)?.name}</span>
                                                        </div>
                                                      )}
                                                    </SelectValue>
                                                  </SelectTrigger>
                                                  <SearchableSelectContent
                                                    className='max-h-[300px]'
                                                    items={roles.map((r) => ({
                                                      value: r.id,
                                                      label: r.managed ? `${r.name} ${t('reactionRole:botRoleSuffix')}` : r.name,
                                                    }))}
                                                    searchPlaceholder={t('common:searchPlaceholder')}
                                                    loading={rolesLoading}
                                                  />
                                                </Select>
                                              </FormControl>
                                              <FormDescription className='text-sm'>
                                                {t('reactionRole:menuOptionRoleDesc')}
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name={`menus.${menuIndex}.options.${optionIndex}.emoji`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className='text-base font-semibold'>{t('reactionRole:emojiLabel')}</FormLabel>
                                              <FormControl>
                                                <Input {...field} className='h-11' placeholder={t('reactionRole:menuOptionEmojiPlaceholder')} />
                                              </FormControl>
                                              <FormDescription className='text-sm'>
                                                {t('reactionRole:menuOptionEmojiDesc')}
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name={`menus.${menuIndex}.options.${optionIndex}.orderIndex`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className='text-base font-semibold'>{t('reactionRole:order')}</FormLabel>
                                              <FormControl>
                                                <Input
                                                  {...field}
                                                  type='number'
                                                  className='h-11'
                                                  placeholder={t('reactionRole:menuOptionOrderPlaceholder')}
                                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                              </FormControl>
                                              <FormDescription className='text-sm'>
                                                {t('reactionRole:menuOptionOrderDesc')}
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>

                                      <FormField
                                        control={form.control}
                                        name={`menus.${menuIndex}.options.${optionIndex}.enabled`}
                                        render={({ field }) => (
                                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                                            <div className='space-y-0.5'>
                                              <FormLabel className='text-base font-semibold'>{t('reactionRole:menuOptionEnabled')}</FormLabel>
                                              <FormDescription className='text-sm'>
                                                {t('reactionRole:menuOptionEnabledDesc')}
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
                                    </div>
                                  </Card>
                                ))}

                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    const currentOptions = form.getValues(`menus.${menuIndex}.options`) || []
                                    form.setValue(`menus.${menuIndex}.options`, [
                                      ...currentOptions,
                                      {
                                        label: '',
                                        description: '',
                                        roleId: '',
                                        emoji: '',
                                        orderIndex: currentOptions.length,
                                        enabled: true,
                                      },
                                    ])
                                  }}
                                  className='w-full'
                                >
                                  <Plus className='mr-2 size-4' />
                                  {t('reactionRole:addMenuOption')}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}

                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => menuFields.append({
                          placeholder: t('reactionRole:menuPlaceholderInputPlaceholder'),
                          minValues: 1,
                          maxValues: 1,
                          enabled: true,
                          options: [],
                        })}
                        className='w-full'
                      >
                        <Plus className='mr-2 size-4' />
                        {t('reactionRole:addMenu')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>
              </div>

              <div className='flex justify-end gap-4'>
                <Button
                  type='submit'
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {(updateMutation.isPending || createMutation.isPending) && (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  )}
                  <Save className='mr-2 size-4' />
                  {mode === 'edit' ? t('reactionRole:saveUpdate') : t('reactionRole:saveCreate')}
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

