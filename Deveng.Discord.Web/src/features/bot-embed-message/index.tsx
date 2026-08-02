import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { embedMessageApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Plus, Save, Send, Trash2, X } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordChannel } from '@/lib/api/discord'
import { SimpleDataTable } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
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

const createEmbedMessageFormSchema = (messages: {
  guildIdRequired: string
  channelIdRequired: string
  nameRequired: string
}) =>
  z
    .object({
      guildId: z.string().min(1, messages.guildIdRequired),
      channelId: z.string().min(1, messages.channelIdRequired),
      name: z.string().min(1, messages.nameRequired),
    })
    .merge(createEmbedSchema(embedFields))

type EmbedMessageFormValues = z.infer<
  ReturnType<typeof createEmbedMessageFormSchema>
>

function getEmptyEmbedFormValues(guildId: string): EmbedMessageFormValues {
  return {
    guildId,
    channelId: '',
    name: '',
    ...createEmptyEmbedValues('embed'),
  } as EmbedMessageFormValues
}

export function BotEmbedMessage() {
  const { t } = useTranslation(['common', 'embed'])
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [screen, setScreen] = React.useState<'list' | 'form'>('list')
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)

  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'embed-message', featureDisplayName: t('common:embedMessage') })

  const embedMessageFormSchema = React.useMemo(
    () =>
      createEmbedMessageFormSchema({
        guildIdRequired: t('embed:guildIdRequired'),
        channelIdRequired: t('embed:channelIdRequired'),
        nameRequired: t('embed:nameRequired'),
      }),
    [t]
  )

  const form = useForm<any>({
    resolver: zodResolver(embedMessageFormSchema),
    defaultValues: getEmptyEmbedFormValues(guildId),
  })

  React.useEffect(() => {
    setScreen('list')
    setSelectedId(null)
    form.reset(getEmptyEmbedFormValues(guildId))
  }, [guildId, form])

  const { data: embedMessages, isLoading } = useQuery({
    queryKey: ['embedMessages', guildId],
    queryFn: () => embedMessageApi.getAllByGuildId(guildId),
    enabled: !!guildId,
  })

  const { data: selectedEmbedMessage } = useQuery({
    queryKey: ['embedMessage', selectedId],
    queryFn: () => embedMessageApi.getById(selectedId!),
    enabled: !!selectedId,
  })

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
        toast.error(t('common:listLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }
    fetchChannels()
  }, [guildId])

  React.useEffect(() => {
    if (selectedEmbedMessage) {
      form.reset({
        guildId: selectedEmbedMessage.guildId,
        channelId: selectedEmbedMessage.channelId,
        name: selectedEmbedMessage.name,
        ...fromEmbedApiDto(selectedEmbedMessage as unknown as Record<string, unknown>, 'embed'),
      })
    }
  }, [selectedEmbedMessage, form])

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      embedMessageApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        name: data.name,
        ...toEmbedApiPayload(data, embedFields),
      }),
    onSuccess: () => {
      toast.success(t('embed:created'))
      queryClient.invalidateQueries({ queryKey: ['embedMessages', guildId] })
      form.reset(getEmptyEmbedFormValues(guildId))
      setSelectedId(null)
      setScreen('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      embedMessageApi.update(guildId, id, {
        channelId: data.channelId,
        name: data.name,
        ...toEmbedApiPayload(data, embedFields),
      }),
    onSuccess: () => {
      toast.success(t('embed:updated'))
      queryClient.invalidateQueries({ queryKey: ['embedMessages', guildId] })
      queryClient.invalidateQueries({ queryKey: ['embedMessage', selectedId] })
      setSelectedId(null)
      form.reset(getEmptyEmbedFormValues(guildId))
      setScreen('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => embedMessageApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('embed:deleted'))
      queryClient.invalidateQueries({ queryKey: ['embedMessages', guildId] })
      if (selectedId) {
        setSelectedId(null)
        form.reset()
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => embedMessageApi.sendToChannel(id),
    onSuccess: () => {
      toast.success(t('embed:sent'))
      queryClient.invalidateQueries({ queryKey: ['embedMessages', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('embed:sendFailed'))
    },
  })

  const onSubmit = (data: any) => {
    if (selectedId) {
      updateMutation.mutate({ id: selectedId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const goToList = React.useCallback(() => {
    setScreen('list')
    setSelectedId(null)
    form.reset(getEmptyEmbedFormValues(guildId))
  }, [form, guildId])

  const openCreateForm = React.useCallback(() => {
    setSelectedId(null)
    form.reset(getEmptyEmbedFormValues(guildId))
    setScreen('form')
  }, [form, guildId])

  const handleEdit = React.useCallback((id: number) => {
    setSelectedId(id)
    setScreen('form')
  }, [])

  const { mutate: sendEmbed, isPending: isSendingEmbed } = sendMutation
  const { mutate: deleteEmbed, isPending: isDeletingEmbed } = deleteMutation
  const embedColumns = React.useMemo<ColumnDef<{ id: number; name: string }, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('embed:columnName'),
        cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
      },
      {
        id: 'actions',
        header: t('embed:columnActions'),
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={() => handleEdit(row.original.id)}>
              {t('embed:edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => sendEmbed(row.original.id)}
              disabled={isSendingEmbed}
            >
              {isSendingEmbed ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => deleteEmbed(row.original.id)}
              disabled={isDeletingEmbed}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        ),
      },
    ],
    [t, handleEdit, sendEmbed, isSendingEmbed, deleteEmbed, isDeletingEmbed]
  )

  if (isLoading) {
    return (
      <>
        <Main fluid>
          <div className='flex items-center justify-center min-h-[60vh]'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main fluid>
        <div className='space-y-6'>
          {/* Başlık Bölümü - MEE6 Tarzı */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('embed:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('embed:pageDescription')}
              </p>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <FeatureDisableButton
                guildId={guildId}
                featureName='embed-message'
                featureDisplayName={t('common:embedMessage')}
                confirmDescription={t('embed:disableConfirmDescription')}
              />
            </div>
          </div>

          {screen === 'list' ? (
            <Card className='border w-full'>
              <CardHeader className='pb-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
                  <div>
                    <CardTitle className='text-2xl'>{t('embed:listCardTitle')}</CardTitle>
                  </div>
                  <Button type='button' size='lg' className='shrink-0 gap-2' onClick={openCreateForm}>
                    <Plus className='size-5' />
                    {t('common:create')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {embedMessages && embedMessages.length > 0 ? (
                  <SimpleDataTable
                    columns={embedColumns}
                    data={embedMessages.map((e) => ({ id: e.id, name: e.name }))}
                    searchPlaceholder={t('embed:searchByName')}
                    emptyMessage={t('embed:emptyList')}
                  />
                ) : (
                  <p className='text-muted-foreground text-center py-8'>
                    {t('embed:emptyList')}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className='w-full border shadow-sm'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-end'>
                  <Button type='button' variant='ghost' className='h-8 px-2' onClick={goToList}>
                    <X className='mr-1 size-4' />
                    {t('embed:close')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                <Form {...form}>
                  <form id='embed-message-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-0'>
                    <div className='sticky top-0 z-20 -mx-6 mb-6 flex flex-col gap-3 border-b bg-card/95 px-6 py-3 backdrop-blur-md'>
                      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                        <h2 className='text-lg font-semibold'>
                          {selectedId ? t('embed:edit') : t('common:create')}
                        </h2>
                        <div className='flex w-full gap-2 lg:w-auto lg:shrink-0'>
                          <Button
                            type='submit'
                            size='default'
                            className='h-10 min-w-0 flex-1 gap-2 font-medium lg:min-w-[7.5rem] lg:flex-none'
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {(createMutation.isPending || updateMutation.isPending) ? (
                              <Loader2 className='size-4 animate-spin' />
                            ) : (
                              <Save className='size-4' />
                            )}
                            {t('common:save')}
                          </Button>
                          <Button type='button' variant='outline' className='h-10 shrink-0' onClick={goToList}>
                            {t('embed:close')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className='space-y-4'>
                      <FormField
                        control={form.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm font-medium'>{t('embed:embedName')}</FormLabel>
                            <FormControl>
                              <Input className='h-10' placeholder={t('embed:placeholderName')} {...field} />
                            </FormControl>
                            <FormDescription>{t('embed:nameUniqueHint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-sm font-medium'>{t('embed:channelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-10 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('embed:channelsLoading') : t('embed:channelSelect')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-muted-foreground'>#</span>
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
                                  searchPlaceholder={t('embed:channelSearch')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='mt-6 space-y-4'>
                      <div className='space-y-1'>
                        <Separator />
                        <h3 className='pt-4 text-base font-semibold'>{t('embed:tabBody')}</h3>
                      </div>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={embedFields}
                        showMessage={false}
                        showIsEmbed={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </Main>
    </>
  )
}

