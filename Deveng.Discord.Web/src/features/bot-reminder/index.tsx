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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { PageSection } from '@/components/layout/page-section'
import { SectionNav } from '@/components/layout/section-nav'
import { reminderApi, reminderSettingsApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Plus, Trash2, Calendar, Settings, X } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { DateTimePicker } from '@/components/datetime-picker'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordChannel } from '@/lib/api/discord'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
} from '@/components/embed-editor'

const reminderEmbedFields = defaultEmbedFieldNames
const createEmbedFields = createEmbedFieldNames('createEmbed', {
  isEmbed: 'createMessageIsEmbed',
  message: 'createMessage',
})
const REMINDER_EMBED_TAGS = ['{user}', '{username}', '{userid}', '{usermention}', '{remindertext}', '{remindertime}', '{timestamp}']
const CREATE_EMBED_TAGS = ['{user}', '{username}', '{userid}', '{usermention}', '{reminderid}', '{channel}', '{channelmention}', '{reminddate}', '{remindtime}', '{message}', '{timestamp}']

// Reminder Form Schema - datetime-local format: YYYY-MM-DDTHH:mm
const createReminderFormSchema = (t: (key: string) => string) =>
  z
    .object({
      channelId: z.string().min(1, t('reminder:channelRequired')),
      remindDateTime: z.string().min(1, t('reminder:dateTimeRequired')),
    })
    .merge(createEmbedSchema(reminderEmbedFields))

type ReminderFormValues = z.infer<ReturnType<typeof createReminderFormSchema>>

export function BotReminder() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const userId = auth.user?.discord?.id || ''
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create'>('list')

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'reminder', featureDisplayName: t('nav:reminder') })

  // Reminder Form
  const reminderFormSchema = React.useMemo(() => createReminderFormSchema(t), [t])
  const reminderForm = useForm<any>({
    resolver: zodResolver(reminderFormSchema) as any,
    defaultValues: {
      channelId: '',
      remindDateTime: '',
      ...createEmptyEmbedValues('embed'),
      isEmbed: false,
    },
  })

  // Reminder'ları getir
  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', guildId, userId],
    queryFn: () => reminderApi.getByUserId(guildId, userId),
    enabled: !!guildId && !!userId,
  })

  // Kanalları getir
  React.useEffect(() => {
    const fetchChannels = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        // Kanalları pozisyona göre sırala
        const channelsArray = data?.channels || []
        const sortedChannels = [...channelsArray].sort((a, b) => a.position - b.position)
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

  // Reminder Create Mutation
  const reminderCreateMutation = useMutation({
    mutationFn: (data: any) => {
      // datetime: tarayıcının yerel saati; backend UTC ile kıyasladığı için anı açıkça UTC'ye çevir
      const localRaw = data.remindDateTime.length === 16 ? `${data.remindDateTime}:00` : data.remindDateTime
      const atLocal = new Date(localRaw)
      if (isNaN(atLocal.getTime())) {
        return Promise.reject(new Error(t('reminder:invalidDateTime')))
      }
      const remindDate = atLocal.toISOString()

      const embedPayload = toEmbedApiPayload(data, reminderEmbedFields)
      const isEmbed = Boolean(embedPayload.isEmbed)

      return reminderApi.create({
        guildId,
        channelId: data.channelId,
        userId,
        remindDate,
        isEmbed,
        message: isEmbed ? undefined : (embedPayload.message as string | undefined),
        embedTitle: isEmbed ? (embedPayload.embedTitle as string | undefined) : undefined,
        embedDescription: isEmbed ? (embedPayload.embedDescription as string | undefined) : undefined,
        embedColor: isEmbed ? (embedPayload.embedColor as string | undefined) : undefined,
        embedThumbnail: isEmbed ? (embedPayload.embedThumbnail as string | undefined) : undefined,
        embedImage: isEmbed ? (embedPayload.embedImage as string | undefined) : undefined,
        embedFooter: isEmbed ? (embedPayload.embedFooter as string | undefined) : undefined,
      })
    },
    onSuccess: () => {
      toast.success(t('reminder:created'))
      queryClient.invalidateQueries({ queryKey: ['reminders', guildId, userId] })
      reminderForm.reset()
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // Reminder Delete Mutation
  const reminderDeleteMutation = useMutation({
    mutationFn: (id: number) => reminderApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('reminder:deleted'))
      queryClient.invalidateQueries({ queryKey: ['reminders', guildId, userId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onReminderSubmit = (data: ReminderFormValues) => {
    reminderCreateMutation.mutate(data)
  }

  React.useEffect(() => {
    setMode('list')
    reminderForm.reset()
  }, [guildId])

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const { mutate: deleteReminder, isPending: isDeletingReminder } = reminderDeleteMutation
  const reminderColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title='ID' />,
        cell: ({ row }) => <span className='font-medium'>#{row.original.id}</span>,
      },
      {
        id: 'channel',
        meta: { className: 'hidden md:table-cell' },
        accessorFn: (r: any) => {
          const ch = channels.find((c) => c.id === r.channelId)
          return ch ? `#${ch.name}` : t('reminder:unknownChannel')
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('reminder:colChannel')} />,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        accessorKey: 'remindDate',
        meta: { className: 'hidden lg:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('reminder:colDate')} />,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Calendar className='size-4' />
            {formatDateTime(row.original.remindDate)}
          </div>
        ),
      },
      {
        id: 'status',
        header: t('reminder:colStatus'),
        enableSorting: false,
        cell: () => (
          <span className='rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'>
            {t('reminder:statusPending')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('reminder:colAction'),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant='destructive'
            size='sm'
            onClick={() => {
              if (confirm(t('reminder:deleteConfirm'))) {
                deleteReminder(row.original.id)
              }
            }}
            disabled={isDeletingReminder}
          >
            <Trash2 className='size-4' />
          </Button>
        ),
      },
    ],
    [channels, deleteReminder, isDeletingReminder, t]
  )

  if (remindersLoading) {
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
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('reminder:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('reminder:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='reminder'
              featureDisplayName={t('nav:reminder')}
              confirmDescription={t('reminder:disableConfirmDescription')}
            />
          </div>

          <SectionNav
            items={[
              { id: 'reminders', label: t('reminder:navReminders') },
              { id: 'settings', label: t('reminder:navSettings') },
            ]}
          />
          <div className='space-y-8'>
            <PageSection id='reminders'>
            {mode === 'list' && (
            <Card className='border'>
              <CardHeader className='pb-4'>
                <div className='flex items-center justify-between gap-2'>
                  <CardTitle className='text-2xl'>{t('reminder:listTitle')}</CardTitle>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setMode('create')}
                  >
                    <Plus className='mr-2 size-4' />
                    {t('reminder:createButton')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {remindersData && remindersData.some((r) => !r.isSent) ? (
                  <SimpleDataTable
                    columns={reminderColumns}
                    data={remindersData.filter((r) => !r.isSent)}
                    searchPlaceholder={t('reminder:searchPlaceholder')}
                    emptyMessage={t('reminder:emptyTable')}
                  />
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Calendar className='size-12 mx-auto mb-4 opacity-50' />
                    <p>{t('reminder:emptyState')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {mode === 'create' && (
            <Card className='border'>
              <CardContent>
                <Form {...reminderForm}>
                  <form
                    onSubmit={reminderForm.handleSubmit(onReminderSubmit)}
                    className='space-y-4 pt-4'
                  >
                    <div className='space-y-6'>
                    <FormField
                      control={reminderForm.control}
                      name='channelId'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-base font-semibold'>{t('reminder:channelLabel')}</FormLabel>
                            <Button
                              type='button'
                              variant='ghost'
                              className='h-8 px-2'
                              onClick={() => {
                                setMode('list')
                                reminderForm.reset()
                              }}
                            >
                              <X className='mr-1 size-4' />
                              {t('reminder:closeButton')}
                            </Button>
                          </div>
                          <FormControl>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={channelsLoading}
                            >
                              <SelectTrigger className='h-11 w-full'>
                                <SelectValue placeholder={channelsLoading ? t('reminder:channelsLoading') : t('reminder:channelSelectPlaceholder')}>
                                  {field.value && channels.find((c) => c.id === field.value) && (
                                    <div className='flex items-center gap-2'>
                                      <span className='text-lg'>#</span>
                                      <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SearchableSelectContent
                                className='max-h-[300px]'
                                items={channels.map((c) => ({ value: c.id, label: `# ${c.name}` }))}
                                searchPlaceholder={t('reminder:channelSearchPlaceholder')}
                                loading={channelsLoading}
                              />
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reminderForm.control}
                      name='remindDateTime'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-base font-semibold'>{t('reminder:dateTimeLabel')}</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              placeholder={t('reminder:dateTimePlaceholder')}
                              min={new Date()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                        <FormField
                          control={reminderForm.control}
                          name='message'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('reminder:messageLabel')}</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className='min-h-[100px]'
                                  placeholder={t('reminder:createMessagePlaceholder')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Card className='border'>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-base'>{t('reminder:embedOptional')}</CardTitle>
                          </CardHeader>
                          <CardContent className='space-y-6 pt-0'>
                            <EmbedFormSection
                              control={reminderForm.control}
                              watch={reminderForm.watch}
                              fieldNames={reminderEmbedFields}
                              showMessage={false}
                              descriptionTags={REMINDER_EMBED_TAGS}
                            />
                          </CardContent>
                        </Card>
                    </div>

                    <Button
                      type='submit'
                      className='w-full h-11'
                      disabled={reminderCreateMutation.isPending}
                    >
                      {reminderCreateMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 size-4 animate-spin' />
                          {t('reminder:creating')}
                        </>
                      ) : (
                        <>
                          <Plus className='mr-2 size-4' />
                          {t('reminder:createSubmit')}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            )}
            </PageSection>

            <PageSection id='settings'>
              <ReminderSettingsForm />
            </PageSection>
          </div>
        </div>
      </Main>
    </>
  )
}

// ReminderSettings Form Component
const reminderSettingsFormSchema = z
  .object({
  defaultIsEmbed: z.boolean().default(false),
  sendMessageIsEmbed: z.boolean().default(false),
  sendMessage: z.string().optional(),
  sendEmbedTitle: z.string().optional(),
  sendEmbedDescription: z.string().optional(),
  sendEmbedColor: z.string().optional(),
  sendEmbedThumbnail: z.string().optional(),
  sendEmbedImage: z.string().optional(),
  sendEmbedFooter: z.string().optional(),
})
  .merge(createEmbedSchema(createEmbedFields))

type ReminderSettingsFormValues = z.infer<typeof reminderSettingsFormSchema>

function ReminderSettingsForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''

  const settingsForm = useForm<any>({
    resolver: zodResolver(reminderSettingsFormSchema) as any,
    defaultValues: {
      ...createEmptyEmbedValues('createEmbed', { isEmbed: 'createMessageIsEmbed', message: 'createMessage' }),
      createMessageIsEmbed: false,
      defaultIsEmbed: false,
      sendMessageIsEmbed: false,
      sendMessage: '',
      sendEmbedTitle: '',
      sendEmbedDescription: '',
      sendEmbedColor: '#5865F2',
      sendEmbedThumbnail: '',
      sendEmbedImage: '',
      sendEmbedFooter: '',
    },
  })

  // ReminderSettings'i getir
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['reminderSettings', guildId],
    queryFn: () => reminderSettingsApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  // Form'u settings data ile doldur
  React.useEffect(() => {
    if (settingsData) {
      settingsForm.reset({
        ...fromEmbedApiDto(settingsData as unknown as Record<string, unknown>, 'createEmbed', {
          isEmbed: 'createMessageIsEmbed',
          message: 'createMessage',
        }),
        defaultIsEmbed: settingsData.defaultIsEmbed || false,
        sendMessageIsEmbed: settingsData.sendMessageIsEmbed || false,
        sendMessage: settingsData.sendMessage || '',
        sendEmbedTitle: settingsData.sendEmbedTitle || '',
        sendEmbedDescription: settingsData.sendEmbedDescription || '',
        sendEmbedColor: settingsData.sendEmbedColor || '#5865F2',
        sendEmbedThumbnail: settingsData.sendEmbedThumbnail || '',
        sendEmbedImage: settingsData.sendEmbedImage || '',
        sendEmbedFooter: settingsData.sendEmbedFooter || '',
      })
    }
  }, [settingsData, settingsForm])

  // ReminderSettings Create/Update Mutation
  const settingsMutation = useMutation({
    mutationFn: (data: ReminderSettingsFormValues) =>
      reminderSettingsApi.createOrUpdate(guildId, data),
    onSuccess: () => {
      toast.success(t('reminder:settingsSaved'))
      queryClient.invalidateQueries({ queryKey: ['reminderSettings', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSettingsSubmit = (data: ReminderSettingsFormValues) => {
    const createEmbedPayload = toEmbedApiPayload(data, createEmbedFields)
    settingsMutation.mutate({
      ...data,
      ...createEmbedPayload,
    } as ReminderSettingsFormValues)
  }

  if (settingsLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='size-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      <Card className='border'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-2xl'>{t('reminder:settingsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...settingsForm}>
            <form
              onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}
              className='space-y-6'
            >
              <div className='space-y-8'>
                {/* Hatırlatıcı Oluşturuldu Mesajı */}
                <section className='space-y-4'>
                  <h3 className='text-base font-semibold'>{t('reminder:createdMessageSection')}</h3>
                  <FormField
                    control={settingsForm.control}
                    name='createMessageIsEmbed'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                        <div className='space-y-1 flex-1'>
                          <FormLabel className='text-base font-semibold'>{t('reminder:useEmbedLabel')}</FormLabel>
                          <FormDescription className='text-sm'>
                            {t('reminder:createdUseEmbedDescription')}
                          </FormDescription>
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

                  {settingsForm.watch('createMessageIsEmbed') ? (
                    <EmbedFormSection
                      control={settingsForm.control}
                      watch={settingsForm.watch}
                      fieldNames={createEmbedFields}
                      showIsEmbed={false}
                      showMessage={false}
                      descriptionTags={CREATE_EMBED_TAGS}
                    />
                  ) : (
                    <FormField
                      control={settingsForm.control}
                      name='createMessage'
                      render={({ field }) => {
                        const availableTags = [
                          { tag: '{user}', label: t('reminder:tagUsername') },
                          { tag: '{username}', label: t('reminder:tagUsername') },
                          { tag: '{userid}', label: t('reminder:tagUserId') },
                          { tag: '{usermention}', label: t('reminder:tagUserMention') },
                          { tag: '{reminderid}', label: t('reminder:tagReminderId') },
                          { tag: '{channel}', label: t('reminder:tagChannelName') },
                          { tag: '{channelmention}', label: t('reminder:tagChannelMention') },
                          { tag: '{reminddate}', label: t('reminder:tagRemindDate') },
                          { tag: '{remindtime}', label: t('reminder:tagRemindTime') },
                          { tag: '{message}', label: t('reminder:tagMessageContent') },
                          { tag: '{timestamp}', label: t('reminder:tagTimestamp') },
                        ]
                        
                        return (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('reminder:messageLabel')}</FormLabel>
                            <FormControl>
                              <div className='space-y-3'>
                                <Textarea
                                  {...field}
                                  className='min-h-[100px]'
                                  placeholder={t('reminder:createdMessagePlaceholder')}
                                />
                                {availableTags.length > 0 && (
                                  <div className='space-y-2'>
                                    <p className='text-xs text-muted-foreground font-medium'>{t('reminder:availableTags')}</p>
                                    <div className='flex flex-wrap gap-2'>
                                      {availableTags.map((tagInfo) => (
                                        <Button
                                          key={tagInfo.tag}
                                          type='button'
                                          variant='outline'
                                          size='sm'
                                          className='h-8 text-xs'
                                          onClick={() => {
                                            const currentValue = field.value || ''
                                            const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || currentValue.length
                                            const newValue = currentValue.slice(0, cursorPos) + tagInfo.tag + currentValue.slice(cursorPos)
                                            field.onChange(newValue)
                                            setTimeout(() => {
                                              const textarea = document.activeElement as HTMLTextAreaElement
                                              if (textarea && textarea.tagName === 'TEXTAREA') {
                                                const newPos = cursorPos + tagInfo.tag.length
                                                textarea.setSelectionRange(newPos, newPos)
                                                textarea.focus()
                                              }
                                            }, 0)
                                          }}
                                        >
                                          {tagInfo.tag}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  )}
                </section>

                {/* Hatırlatıcı Gönderilirken Mesaj */}
                <section className='space-y-4'>
                  <h3 className='text-base font-semibold'>{t('reminder:sendMessageSection')}</h3>
                  <FormField
                    control={settingsForm.control}
                    name='sendMessageIsEmbed'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                        <div className='space-y-1 flex-1'>
                          <FormLabel className='text-base font-semibold'>{t('reminder:useEmbedLabel')}</FormLabel>
                          <FormDescription className='text-sm'>
                            {t('reminder:sendUseEmbedDescription')}
                          </FormDescription>
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

                  {settingsForm.watch('sendMessageIsEmbed') ? (
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                      <div className='space-y-5 pt-2'>
                        <FormField
                          control={settingsForm.control}
                          name='sendEmbedTitle'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('reminder:embedTitleLabel')}</FormLabel>
                              <FormControl>
                                <Input {...field} className='h-11' placeholder={t('reminder:embedTitlePlaceholder')} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name='sendEmbedDescription'
                          render={({ field }) => {
                            const availableTags = [
                              { tag: '{user}', label: t('reminder:tagUserMention') },
                              { tag: '{userid}', label: t('reminder:tagUserId') },
                              { tag: '{usermention}', label: t('reminder:tagUserMention') },
                              { tag: '{server}', label: t('reminder:tagServerName') },
                              { tag: '{servername}', label: t('reminder:tagServerName') },
                              { tag: '{timestamp}', label: t('reminder:tagTimestamp') },
                              { tag: '{message}', label: t('reminder:tagReminderMessage') },
                              { tag: '{remindermessage}', label: t('reminder:tagReminderMessage') },
                              { tag: '{remindertitle}', label: t('reminder:tagReminderTitle') },
                              { tag: '{reminderdescription}', label: t('reminder:tagReminderDescription') },
                            ]
                            
                            return (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('reminder:embedDescriptionLabel')}</FormLabel>
                                <FormControl>
                                  <div className='space-y-3'>
                                    <textarea
                                      {...field}
                                      className='flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
                                      placeholder={t('reminder:reminderMessagePlaceholder')}
                                    />
                                    {availableTags.length > 0 && (
                                      <div className='space-y-2'>
                                        <p className='text-xs text-muted-foreground font-medium'>{t('reminder:availableTags')}</p>
                                        <div className='flex flex-wrap gap-2'>
                                          {availableTags.map((tagInfo) => (
                                            <Button
                                              key={tagInfo.tag}
                                              type='button'
                                              variant='outline'
                                              size='sm'
                                              className='h-8 text-xs'
                                              onClick={() => {
                                                const currentValue = field.value || ''
                                                const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || currentValue.length
                                                const newValue = currentValue.slice(0, cursorPos) + tagInfo.tag + currentValue.slice(cursorPos)
                                                field.onChange(newValue)
                                                setTimeout(() => {
                                                  const textarea = document.activeElement as HTMLTextAreaElement
                                                  if (textarea && textarea.tagName === 'TEXTAREA') {
                                                    const newPos = cursorPos + tagInfo.tag.length
                                                    textarea.setSelectionRange(newPos, newPos)
                                                    textarea.focus()
                                                  }
                                                }, 0)
                                              }}
                                            >
                                              {tagInfo.tag}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                          <FormField
                            control={settingsForm.control}
                            name='sendEmbedColor'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('reminder:embedColorLabel')}</FormLabel>
                                <FormControl>
                                  <ColorPicker
                                    value={field.value || '#5865F2'}
                                    onChange={field.onChange}
                                    placeholder='#5865F2'
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={settingsForm.control}
                            name='sendEmbedFooter'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('reminder:embedFooterLabel')}</FormLabel>
                                <FormControl>
                                  <Input {...field} className='h-11' placeholder={t('reminder:embedFooterPlaceholder')} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={settingsForm.control}
                          name='sendEmbedThumbnail'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('reminder:thumbnailUrlLabel')}</FormLabel>
                              <FormControl>
                                <Input {...field} type='url' className='h-11' placeholder='https://example.com/image.png' />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name='sendEmbedImage'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('reminder:imageUrlLabel')}</FormLabel>
                              <FormControl>
                                <Input {...field} type='url' className='h-11' placeholder='https://example.com/image.png' />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Canlı Önizleme */}
                      <div className='space-y-4'>
                        <div>
                          <h3 className='text-lg font-semibold mb-2'>{t('reminder:livePreview')}</h3>
                          <p className='text-sm text-muted-foreground'>
                            {t('reminder:livePreviewDescription')}
                          </p>
                        </div>
                        <Card className='border-2 bg-[#2f3136] dark:bg-[#36393f]'>
                          <CardContent className='p-4'>
                            <div className='space-y-3'>
                              <div
                                className='rounded overflow-hidden'
                                style={{
                                  borderLeft: `4px solid ${settingsForm.watch('sendEmbedColor') || '#5865F2'}`,
                                  backgroundColor: 'rgba(47, 49, 54, 0.3)',
                                }}
                              >
                                <div className='p-3 space-y-2'>
                                  <div className='flex items-start justify-between gap-3'>
                                    <div className='flex-1 min-w-0'>
                                      {settingsForm.watch('sendEmbedTitle') && (
                                        <div className='font-semibold text-white text-base mb-1.5 leading-tight'>
                                          {settingsForm.watch('sendEmbedTitle')}
                                        </div>
                                      )}
                                      {settingsForm.watch('sendEmbedDescription') && (
                                        <div className='text-[#dcddde] text-sm leading-relaxed whitespace-pre-wrap'>
                                          {settingsForm.watch('sendEmbedDescription')}
                                        </div>
                                      )}
                                    </div>
                                    {settingsForm.watch('sendEmbedThumbnail') && (
                                      <div className='flex-shrink-0 ml-2'>
                                        <img
                                          src={settingsForm.watch('sendEmbedThumbnail')}
                                          alt='Thumbnail'
                                          className='w-20 h-20 rounded object-cover'
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {settingsForm.watch('sendEmbedImage') && (
                                    <div className='mt-2 -mx-3'>
                                      <img
                                        src={settingsForm.watch('sendEmbedImage')}
                                        alt='Embed Image'
                                        className='w-full rounded-b max-h-80 object-cover'
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      />
                                    </div>
                                  )}
                                  {settingsForm.watch('sendEmbedFooter') && (
                                    <div className='pt-2 border-t border-[#40444b] mt-2'>
                                      <div className='text-xs text-[#72767d] leading-tight'>
                                        {settingsForm.watch('sendEmbedFooter')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <FormField
                      control={settingsForm.control}
                      name='sendMessage'
                      render={({ field }) => {
                        const availableTags = [
                          { tag: '{user}', label: t('reminder:tagUserMention') },
                          { tag: '{userid}', label: t('reminder:tagUserId') },
                          { tag: '{usermention}', label: t('reminder:tagUserMention') },
                          { tag: '{server}', label: t('reminder:tagServerName') },
                          { tag: '{servername}', label: t('reminder:tagServerName') },
                          { tag: '{timestamp}', label: t('reminder:tagTimestamp') },
                          { tag: '{message}', label: t('reminder:tagReminderMessage') },
                          { tag: '{remindermessage}', label: t('reminder:tagReminderMessage') },
                          { tag: '{remindertitle}', label: t('reminder:tagReminderTitle') },
                          { tag: '{reminderdescription}', label: t('reminder:tagReminderDescription') },
                        ]
                        
                        return (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('reminder:messageLabel')}</FormLabel>
                            <FormControl>
                              <div className='space-y-3'>
                                <Textarea
                                  {...field}
                                  className='min-h-[100px]'
                                  placeholder={t('reminder:reminderMessagePlaceholder')}
                                />
                                {availableTags.length > 0 && (
                                  <div className='space-y-2'>
                                    <p className='text-xs text-muted-foreground font-medium'>{t('reminder:availableTags')}</p>
                                    <div className='flex flex-wrap gap-2'>
                                      {availableTags.map((tagInfo) => (
                                        <Button
                                          key={tagInfo.tag}
                                          type='button'
                                          variant='outline'
                                          size='sm'
                                          className='h-8 text-xs'
                                          onClick={() => {
                                            const currentValue = field.value || ''
                                            const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || currentValue.length
                                            const newValue = currentValue.slice(0, cursorPos) + tagInfo.tag + currentValue.slice(cursorPos)
                                            field.onChange(newValue)
                                            setTimeout(() => {
                                              const textarea = document.activeElement as HTMLTextAreaElement
                                              if (textarea && textarea.tagName === 'TEXTAREA') {
                                                const newPos = cursorPos + tagInfo.tag.length
                                                textarea.setSelectionRange(newPos, newPos)
                                                textarea.focus()
                                              }
                                            }, 0)
                                          }}
                                        >
                                          {tagInfo.tag}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  )}
                </section>

                {/* Varsayılan Ayarlar */}
                <section className='space-y-4'>
                  <h3 className='text-base font-semibold'>{t('reminder:defaultSettingsSection')}</h3>
                  <FormField
                    control={settingsForm.control}
                    name='defaultIsEmbed'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                        <div className='space-y-1 flex-1'>
                          <FormLabel className='text-base font-semibold'>{t('reminder:defaultEmbedLabel')}</FormLabel>
                          <FormDescription className='text-sm'>
                            {t('reminder:defaultEmbedDescription')}
                          </FormDescription>
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
                </section>
              </div>

              <Button
                type='submit'
                className='w-full h-11'
                disabled={settingsMutation.isPending}
              >
                {settingsMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    {t('reminder:saving')}
                  </>
                ) : (
                  <>
                    <Settings className='mr-2 size-4' />
                    {t('reminder:saveSettings')}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
