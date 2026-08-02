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
import { Label } from '@/components/ui/label'
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
import { pollApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Send, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
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

const pollEmbedFields = createEmbedFieldNames('pollEmbed', {
  isEmbed: 'pollFormIsEmbed',
  message: 'pollFormMessage',
})
const resultEmbedFields = createEmbedFieldNames('resultEmbed', {
  isEmbed: 'resultFormIsEmbed',
  message: 'resultFormMessage',
})
const POLL_DESCRIPTION_TAGS = ['{question}', '{options}', '{votes}', '{totalvotes}', '{timestamp}']
const RESULT_DESCRIPTION_TAGS = ['{question}', '{winner}', '{winnervotes}', '{totalvotes}', '{timestamp}']

const pollFormSchema = z
  .object({
  guildId: z.string().min(1, 'Guild ID gerekli'),
  channelId: z.string().min(1, 'Kanal ID gerekli'),
  question: z.string().min(1, 'Soru gerekli'),
  endAfterMinutes: z.number().optional().nullable(),
  endAfterVotes: z.number().optional().nullable(),
  allowMultipleVotes: z.boolean(),
  options: z.array(z.object({
    optionText: z.string().min(1, 'Seçenek metni gerekli'),
    emoji: z.string().optional(),
    orderIndex: z.number(),
  })).min(2, 'En az 2 seçenek gerekli'),
  rolePermissions: z.array(z.object({
    roleId: z.string().min(1, 'Rol ID gerekli'),
    permissionType: z.number(), // 0: Allowed, 1: Disallowed
  })).optional(),
})
  .merge(createEmbedSchema(pollEmbedFields))
  .merge(createEmbedSchema(resultEmbedFields))


export function BotPoll() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  /** Sunucu bazlı: Kanala gönder sonrası geri sayım (API Poll:SendCooldownSeconds ile uyumlu) */
  const [pollSendCooldownLeft, setPollSendCooldownLeft] = React.useState(0)
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [pollCommandEnabled, setPollCommandEnabled] = React.useState(true)
  const [pollEndCommandEnabled, setPollEndCommandEnabled] = React.useState(true)
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [, setSelectedPollActive] = React.useState(true)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'poll', featureDisplayName: t('nav:poll') })

  const form = useForm<any>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      guildId: guildId,
      channelId: '',
      question: '',
      endAfterMinutes: null,
      endAfterVotes: null,
      allowMultipleVotes: false,
      ...createEmptyEmbedValues('pollEmbed', { isEmbed: 'pollFormIsEmbed', message: 'pollFormMessage' }),
      pollFormIsEmbed: true,
      ...createEmptyEmbedValues('resultEmbed', { isEmbed: 'resultFormIsEmbed', message: 'resultFormMessage' }),
      resultFormIsEmbed: true,
      [resultEmbedFields.embedColor]: '#00FF00',
      options: [
        { optionText: '', emoji: '1️⃣', orderIndex: 0 },
        { optionText: '', emoji: '2️⃣', orderIndex: 1 },
      ],
      rolePermissions: [],
    },
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const { fields: rolePermissionFields, append: appendRolePermission, remove: removeRolePermission } = useFieldArray({
    control: form.control,
    name: 'rolePermissions',
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
  }, [guildId, form])

  React.useEffect(() => {
    setPollSendCooldownLeft(0)
    setMode('list')
    setSelectedId(null)
  }, [guildId])

  React.useEffect(() => {
    if (pollSendCooldownLeft <= 0) return
    const id = window.setInterval(() => {
      setPollSendCooldownLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [pollSendCooldownLeft])

  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls', guildId],
    queryFn: () => pollApi.getAllByGuildId(guildId),
    enabled: !!guildId,
  })

  const { data: selectedPoll } = useQuery({
    queryKey: ['poll', selectedId],
    queryFn: () => pollApi.getById(selectedId!),
    enabled: !!selectedId,
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

  // Discord renk kodunu hex'e çevir
  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  React.useEffect(() => {
    if (selectedPoll) {
      form.reset({
        guildId: selectedPoll.guildId,
        channelId: selectedPoll.channelId,
        question: selectedPoll.question,
        endAfterMinutes: selectedPoll.endAfterMinutes || null,
        endAfterVotes: selectedPoll.endAfterVotes || null,
        allowMultipleVotes: selectedPoll.allowMultipleVotes,
        ...fromEmbedApiDto(selectedPoll as unknown as Record<string, unknown>, 'pollEmbed', {
          isEmbed: 'pollFormIsEmbed',
          message: 'pollFormMessage',
        }),
        ...fromEmbedApiDto(selectedPoll as unknown as Record<string, unknown>, 'resultEmbed', {
          isEmbed: 'resultFormIsEmbed',
          message: 'resultFormMessage',
        }),
        options: selectedPoll.options.map((opt: { optionText: string; emoji?: string }, idx: number) => ({
          optionText: opt.optionText,
          emoji: opt.emoji || '',
          orderIndex: idx,
        })),
        rolePermissions: selectedPoll.rolePermissions.map((rp: { roleId: string; isAllowed: boolean }) => ({
          roleId: rp.roleId,
          permissionType: rp.isAllowed ? 0 : 1,
        })),
      })
      setSelectedPollActive(selectedPoll.isActive)
    }
  }, [selectedPoll, form])

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const pollEmbed = toEmbedApiPayload(data, pollEmbedFields)
      const resultEmbed = toEmbedApiPayload(data, resultEmbedFields)
      return pollApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        question: data.question,
        endAfterMinutes: data.endAfterMinutes || undefined,
        endAfterVotes: data.endAfterVotes || undefined,
        allowMultipleVotes: data.allowMultipleVotes,
        pollEmbedTitle: pollEmbed.pollEmbedTitle as string | undefined,
        pollEmbedDescription: pollEmbed.pollEmbedDescription as string | undefined,
        pollEmbedColor: pollEmbed.pollEmbedColor as string | undefined,
        pollEmbedThumbnail: pollEmbed.pollEmbedThumbnail as string | undefined,
        pollEmbedImage: pollEmbed.pollEmbedImage as string | undefined,
        pollEmbedFooter: pollEmbed.pollEmbedFooter as string | undefined,
        resultEmbedTitle: resultEmbed.resultEmbedTitle as string | undefined,
        resultEmbedDescription: resultEmbed.resultEmbedDescription as string | undefined,
        resultEmbedColor: resultEmbed.resultEmbedColor as string | undefined,
        resultEmbedThumbnail: resultEmbed.resultEmbedThumbnail as string | undefined,
        resultEmbedImage: resultEmbed.resultEmbedImage as string | undefined,
        resultEmbedFooter: resultEmbed.resultEmbedFooter as string | undefined,
        options: data.options.map((opt: { optionText: string; emoji?: string }, idx: number) => ({
          optionText: opt.optionText,
          emoji: opt.emoji || undefined,
          orderIndex: idx,
        })),
        rolePermissions: data.rolePermissions?.map((rp: { roleId: string; permissionType: number }) => ({
          roleId: rp.roleId,
          isAllowed: rp.permissionType === 0,
        })) || [],
        createdVia: 'panel',
      })
    },
    onSuccess: (created) => {
      toast.success(t('poll:createdWithSendHint'))
      queryClient.invalidateQueries({ queryKey: ['polls', guildId] })
      setSelectedId(created.id)
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const pollEmbed = toEmbedApiPayload(data, pollEmbedFields)
      const resultEmbed = toEmbedApiPayload(data, resultEmbedFields)
      return pollApi.update(guildId, id, {
        channelId: data.channelId,
        question: data.question,
        endAfterMinutes: data.endAfterMinutes || undefined,
        endAfterVotes: data.endAfterVotes || undefined,
        allowMultipleVotes: data.allowMultipleVotes,
        pollEmbedTitle: pollEmbed.pollEmbedTitle as string | undefined,
        pollEmbedDescription: pollEmbed.pollEmbedDescription as string | undefined,
        pollEmbedColor: pollEmbed.pollEmbedColor as string | undefined,
        pollEmbedThumbnail: pollEmbed.pollEmbedThumbnail as string | undefined,
        pollEmbedImage: pollEmbed.pollEmbedImage as string | undefined,
        pollEmbedFooter: pollEmbed.pollEmbedFooter as string | undefined,
        resultEmbedTitle: resultEmbed.resultEmbedTitle as string | undefined,
        resultEmbedDescription: resultEmbed.resultEmbedDescription as string | undefined,
        resultEmbedColor: resultEmbed.resultEmbedColor as string | undefined,
        resultEmbedThumbnail: resultEmbed.resultEmbedThumbnail as string | undefined,
        resultEmbedImage: resultEmbed.resultEmbedImage as string | undefined,
        resultEmbedFooter: resultEmbed.resultEmbedFooter as string | undefined,
      })
    },
    onSuccess: () => {
      toast.success(t('poll:updated'))
      queryClient.invalidateQueries({ queryKey: ['polls', guildId] })
      queryClient.invalidateQueries({ queryKey: ['poll', selectedId] })
      setSelectedId(null)
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => pollApi.sendToChannel(id),
    onSuccess: (data) => {
      toast.success(t('poll:sent'))
      if (typeof data?.cooldownSeconds === 'number' && data.cooldownSeconds > 0) {
        setPollSendCooldownLeft(data.cooldownSeconds)
      }
      queryClient.invalidateQueries({ queryKey: ['polls', guildId] })
    },
    onError: (error: any) => {
      const status = error.response?.status
      if (status === 429) {
        const r = error.response?.data?.retryAfterSeconds
        const sec = typeof r === 'number' ? r : 45
        setPollSendCooldownLeft(Math.max(1, sec))
        toast.error(error.response?.data?.message || t('poll:rateLimited'))
        return
      }
      if (status === 409) {
        toast.error(error.response?.data?.message || t('poll:alreadySent'))
        void queryClient.invalidateQueries({ queryKey: ['polls', guildId] })
        return
      }
      toast.error(error.response?.data?.message || t('poll:sendFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pollApi.delete(guildId, id),
    onSuccess: (_, id) => {
      toast.success(t('poll:deleted'))
      queryClient.setQueryData(
        ['polls', guildId],
        (old: typeof polls | undefined) => old?.filter((poll) => poll.id !== id) ?? old
      )
      queryClient.removeQueries({ queryKey: ['poll', id] })
      if (selectedId === id) {
        setSelectedId(null)
        setMode('list')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('poll:deleteFailed'))
    },
  })

  const onSubmit = (data: any) => {
    if (selectedId) {
      updateMutation.mutate({ id: selectedId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const selectedListMeta = polls?.find((p) => p.id === selectedId)

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
          {/* Header */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('poll:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('poll:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='poll'
              featureDisplayName={t('poll')}
              confirmDescription={t('poll:disableConfirmDescription')}
            />
          </div>

          {mode === 'list' && (
          <Card className='border'>
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-xl'>{t('poll:savedPolls')}</CardTitle>
                <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setSelectedId(null)
                    form.reset({
                      guildId,
                      channelId: '',
                      question: '',
                      endAfterMinutes: null,
                      endAfterVotes: null,
                      allowMultipleVotes: false,
                      ...createEmptyEmbedValues('pollEmbed', { isEmbed: 'pollFormIsEmbed', message: 'pollFormMessage' }),
                      pollFormIsEmbed: true,
                      ...createEmptyEmbedValues('resultEmbed', { isEmbed: 'resultFormIsEmbed', message: 'resultFormMessage' }),
                      resultFormIsEmbed: true,
                      [resultEmbedFields.embedColor]: '#00FF00',
                      options: [
                        { optionText: '', emoji: '1️⃣', orderIndex: 0 },
                        { optionText: '', emoji: '2️⃣', orderIndex: 1 },
                      ],
                      rolePermissions: [],
                    })
                    setMode('create')
                  }}
                >
                  <Plus className='mr-2 size-4' />
                  {t('poll:create')}
                </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-2'>
              {!polls?.length && !isLoading && (
                <p className='text-sm text-muted-foreground'>{t('poll:emptyState')}</p>
              )}
              {isLoading && (
                <div className='flex justify-center py-6'>
                  <Loader2 className='size-6 animate-spin text-muted-foreground' />
                </div>
              )}
              {polls?.map((p) => {
                const chName = channels.find((c) => c.id === p.channelId)?.name
                const sent = Boolean(p.messageId)
                return (
                  <div
                    key={p.id}
                    className='flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'
                  >
                    <div className='min-w-0 space-y-1'>
                      <p className='font-medium leading-snug line-clamp-2'>{p.question}</p>
                      <p className='text-xs text-muted-foreground'>
                        {chName ? `#${chName}` : p.channelId}
                        {sent && ` · ${t('poll:statusPublished')}`}
                        {!p.isActive && ` · ${t('poll:statusEnded')}`}
                        {p.createdVia === 'slash' && ' · Slash'}
                        {p.createdVia === 'panel' && ' · Panel'}
                      </p>
                    </div>
                    <div className='flex shrink-0 flex-wrap gap-2'>
                      <Button
                        type='button'
                        variant={selectedId === p.id ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => {
                          setSelectedId(p.id)
                          setMode('edit')
                        }}
                      >
                        {t('poll:edit')}
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        size='sm'
                        disabled={
                          sendMutation.isPending ||
                          pollSendCooldownLeft > 0 ||
                          !p.isActive ||
                          sent
                        }
                        title={
                          sent
                            ? t('poll:alreadySentTooltip')
                            : !p.isActive
                              ? t('poll:cannotSendEndedTooltip')
                              : pollSendCooldownLeft > 0
                                ? t('poll:waitTooltip', { seconds: pollSendCooldownLeft })
                                : undefined
                        }
                        onClick={() => sendMutation.mutate(p.id)}
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : pollSendCooldownLeft > 0 ? (
                          <>
                            <Send className='mr-1.5 size-4' />
                            {t('poll:secondsShort', { seconds: pollSendCooldownLeft })}
                          </>
                        ) : (
                          <>
                            <Send className='mr-1.5 size-4' />
                            {t('poll:sendToChannel')}
                          </>
                        )}
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => deleteMutation.mutate(p.id)}
                        disabled={deleteMutation.isPending}
                        title={t('poll:deleteTooltip')}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : (
                          <Trash2 className='size-4 text-destructive' />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
          )}

          {mode !== 'list' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => setMode('list')}
                >
                  <X className='mr-1 size-4' />
                  {t('poll:close')}
                </Button>
              </div>

              <Card className='border'>
                <CardContent className='pt-6'>
                  <FormField
                    control={form.control}
                    name='question'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-base font-semibold'>{t('poll:questionLabel')}</FormLabel>
                        <FormControl>
                          <Input className='h-11' placeholder={t('poll:questionPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('poll:questionHint')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <SectionNav
                items={[
                  { id: 'general', label: t('poll:tabGeneral') },
                  { id: 'poll-message', label: t('poll:tabPollMessage') },
                  { id: 'result-message', label: t('poll:tabResultMessage') },
                  { id: 'permissions', label: t('poll:tabPermissions') },
                  { id: 'commands', label: t('poll:tabCommands') },
                ]}
              />
              <div className='space-y-8'>
                <PageSection id='general'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('poll:generalSettingsTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('poll:generalSettingsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('poll:channelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('poll:channelsLoading') : t('poll:channelSelectPlaceholder')}>
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
                                  searchPlaceholder={t('poll:channelSearchPlaceholder')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('poll:channelDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <Label className='text-base font-semibold'>{t('poll:optionsLabel')}</Label>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => appendOption({ optionText: '', emoji: '', orderIndex: optionFields.length })}
                          >
                            <Plus className='mr-2 size-4' />
                            {t('poll:addOption')}
                          </Button>
                        </div>
                        {optionFields.map((field, index) => (
                          <div key={field.id} className='flex gap-2'>
                            <FormField
                              control={form.control}
                              name={`options.${index}.optionText`}
                              render={({ field }) => (
                                <FormItem className='flex-1'>
                                  <FormControl>
                                    <Input className='h-11' placeholder={t('poll:optionPlaceholder', { number: index + 1 })} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`options.${index}.emoji`}
                              render={({ field }) => (
                                <FormItem className='w-24'>
                                  <FormControl>
                                    <Input className='h-11' placeholder={t('poll:emojiPlaceholder')} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {optionFields.length > 2 && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => removeOption(index)}
                              >
                                <X className='size-4' />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <FormField
                        control={form.control}
                        name='allowMultipleVotes'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <FormLabel className='text-base'>{t('poll:multipleVotesLabel')}</FormLabel>
                              <FormDescription>
                                {t('poll:multipleVotesDescription')}
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

                      <FormField
                        control={form.control}
                        name='endAfterMinutes'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('poll:endAfterMinutesLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                className='h-11'
                                min={1}
                                placeholder={t('poll:endAfterMinutesPlaceholder')}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('poll:endAfterMinutesDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='endAfterVotes'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('poll:endAfterVotesLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                className='h-11'
                                min={1}
                                placeholder={t('poll:endAfterVotesPlaceholder')}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('poll:endAfterVotesDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='poll-message'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('poll:pollMessageTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('poll:pollMessageDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={pollEmbedFields}
                        showIsEmbed={false}
                        showMessage={false}
                        descriptionTags={POLL_DESCRIPTION_TAGS}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='result-message'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('poll:resultMessageTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('poll:resultMessageDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={resultEmbedFields}
                        showIsEmbed={false}
                        showMessage={false}
                        descriptionTags={RESULT_DESCRIPTION_TAGS}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='permissions'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('poll:rolePermissionsTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('poll:rolePermissionsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <Label className='text-base font-semibold'>{t('poll:rolePermissionsLabel')}</Label>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => appendRolePermission({ roleId: '', permissionType: 0 })}
                          >
                            <Plus className='mr-2 size-4' />
                            {t('poll:addRole')}
                          </Button>
                        </div>
                        {rolePermissionFields.map((field, index) => (
                          <div key={field.id} className='flex gap-2 items-center'>
                            <FormField
                              control={form.control}
                              name={`rolePermissions.${index}.roleId`}
                              render={({ field }) => (
                                <FormItem className='flex-1'>
                                  <FormControl>
                                    <Select
                                      value={field.value || ''}
                                      onValueChange={field.onChange}
                                      disabled={rolesLoading}
                                    >
                                      <SelectTrigger className='h-11'>
                                        <SelectValue placeholder={rolesLoading ? t('poll:rolesLoading') : t('poll:roleSelectPlaceholder')}>
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
                                          label: r.managed ? `${r.name} (Bot)` : r.name,
                                        }))}
                                        searchPlaceholder={t('poll:roleSearchPlaceholder')}
                                        loading={rolesLoading}
                                      />
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`rolePermissions.${index}.permissionType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className='flex items-center gap-2'>
                                      <Button
                                        type='button'
                                        variant={field.value === 0 ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={() => field.onChange(0)}
                                      >
                                        {t('poll:allow')}
                                      </Button>
                                      <Button
                                        type='button'
                                        variant={field.value === 1 ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={() => field.onChange(1)}
                                      >
                                        {t('poll:disallow')}
                                      </Button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => removeRolePermission(index)}
                            >
                              <X className='size-4' />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id='commands'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('poll:commandsTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('poll:commandsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {/* /poll komutu */}
                      <div className='flex items-center justify-between p-3 rounded-lg border'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <code className='text-sm font-mono bg-muted px-2 py-1 rounded'>/poll</code>
                            <span className='text-sm text-muted-foreground'>
                              {t('poll:pollCommandDescription')}
                            </span>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Switch
                            checked={pollCommandEnabled}
                            onCheckedChange={setPollCommandEnabled}
                          />
                          {selectedId && (
                            <Button
                              variant='ghost'
                              size='sm'
                              type='button'
                              onClick={() => sendMutation.mutate(selectedId)}
                              disabled={sendMutation.isPending || pollSendCooldownLeft > 0}
                              title={pollSendCooldownLeft > 0 ? t('poll:waitTooltip', { seconds: pollSendCooldownLeft }) : undefined}
                            >
                              {sendMutation.isPending ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : pollSendCooldownLeft > 0 ? (
                                <span className='text-xs tabular-nums'>{pollSendCooldownLeft}s</span>
                              ) : (
                                <Send className='size-4' />
                              )}
                            </Button>
                          )}
                          <Button variant='ghost' size='sm' type='button'>
                            <Pencil className='size-4' />
                          </Button>
                        </div>
                      </div>

                      {/* /poll-end komutu */}
                      <div className='flex items-center justify-between p-3 rounded-lg border'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <code className='text-sm font-mono bg-muted px-2 py-1 rounded'>/poll-end</code>
                            <span className='text-sm text-muted-foreground'>
                              {t('poll:pollEndCommandDescription')}
                            </span>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Switch
                            checked={pollEndCommandEnabled}
                            onCheckedChange={setPollEndCommandEnabled}
                          />
                          <Button variant='ghost' size='sm' type='button'>
                            <Pencil className='size-4' />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </PageSection>
              </div>

              <div className='flex flex-wrap items-center justify-end gap-2'>
                {selectedId && (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setSelectedId(null)
                        form.reset()
                        setMode('list')
                      }}
                    >
                      {t('poll:cancel')}
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      disabled={
                        sendMutation.isPending ||
                        pollSendCooldownLeft > 0 ||
                        Boolean(
                          selectedListMeta &&
                            (!selectedListMeta.isActive || selectedListMeta.messageId)
                        )
                      }
                      title={
                        selectedListMeta?.messageId
                          ? t('poll:alreadySentTooltip')
                          : selectedListMeta && !selectedListMeta.isActive
                            ? t('poll:cannotSendEndedTooltip')
                            : pollSendCooldownLeft > 0
                              ? t('poll:waitTooltip', { seconds: pollSendCooldownLeft })
                              : undefined
                      }
                      onClick={() => sendMutation.mutate(selectedId)}
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className='mr-2 size-4 animate-spin' />
                      ) : (
                        <Send className='mr-2 size-4' />
                      )}
                      {pollSendCooldownLeft > 0 ? t('poll:secondsShort', { seconds: pollSendCooldownLeft }) : t('poll:sendToChannel')}
                    </Button>
                  </>
                )}
                <Button
                  type='submit'
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  ) : (
                    <Save className='mr-2 size-4' />
                  )}
                  {selectedId ? t('poll:update') : t('poll:createSubmit')}
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
