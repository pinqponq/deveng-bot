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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { logChannelApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Plus, Sparkles, Trash2, Settings, X } from 'lucide-react'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { DiscordChannel, DiscordCategory } from '@/lib/api/discord'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  createEmbedSchema,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
} from '@/components/embed-editor'

const embedFields = defaultEmbedFieldNames

const logChannelFormSchema = z
  .object({
  guildId: z.string().min(1, 'Guild ID gerekli'),
  channelId: z.string().min(1, 'Kanal seçilmelidir'),
  logType: z.string().min(1, 'Log türü seçilmelidir'),
})
  .merge(createEmbedSchema(embedFields))


const LOG_TYPE_LABEL_KEYS: Record<string, string> = {
  MESSAGE_DELETE: 'logTypeMessageDelete',
  MESSAGE_EDIT: 'logTypeMessageEdit',
  MEMBER_BAN: 'logTypeMemberBan',
  MEMBER_KICK: 'logTypeMemberKick',
  MEMBER_ROLE_ADD: 'logTypeMemberRoleAdd',
  MEMBER_ROLE_REMOVE: 'logTypeMemberRoleRemove',
  CHANNEL_CREATE: 'logTypeChannelCreate',
  CHANNEL_DELETE: 'logTypeChannelDelete',
  CHANNEL_UPDATE: 'logTypeChannelUpdate',
  ROLE_CREATE: 'logTypeRoleCreate',
  ROLE_DELETE: 'logTypeRoleDelete',
  ROLE_UPDATE: 'logTypeRoleUpdate',
  MEMBER_UPDATE: 'logTypeMemberUpdate',
  GUILD_UPDATE: 'logTypeGuildUpdate',
}

const LOG_TYPE_EMOJIS: Record<string, string> = {
  MESSAGE_DELETE: '🗑️',
  MESSAGE_EDIT: '✏️',
  MEMBER_BAN: '🔨',
  MEMBER_KICK: '👢',
  MEMBER_ROLE_ADD: '➕',
  MEMBER_ROLE_REMOVE: '➖',
  CHANNEL_CREATE: '➕',
  CHANNEL_DELETE: '🗑️',
  CHANNEL_UPDATE: '✏️',
  ROLE_CREATE: '➕',
  ROLE_DELETE: '🗑️',
  ROLE_UPDATE: '✏️',
  MEMBER_UPDATE: '👤',
  GUILD_UPDATE: '⚙️',
}

// Her log türü için kullanılabilir tag'ler
const LOG_TYPE_TAGS: Record<string, Array<{ tag: string; label: string }>> = {
  MESSAGE_DELETE: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{channel}', label: 'Kanal Adı' },
    { tag: '{channelid}', label: 'Kanal ID' },
    { tag: '{message}', label: 'Mesaj İçeriği' },
    { tag: '{messageid}', label: 'Mesaj ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MESSAGE_EDIT: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{channel}', label: 'Kanal Adı' },
    { tag: '{channelid}', label: 'Kanal ID' },
    { tag: '{oldmessage}', label: 'Eski Mesaj' },
    { tag: '{newmessage}', label: 'Yeni Mesaj' },
    { tag: '{messageid}', label: 'Mesaj ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MEMBER_BAN: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{reason}', label: 'Sebep' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MEMBER_KICK: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{reason}', label: 'Sebep' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MEMBER_ROLE_ADD: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{role}', label: 'Rol Adı' },
    { tag: '{roleid}', label: 'Rol ID' },
    { tag: '{rolemention}', label: 'Rol Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MEMBER_ROLE_REMOVE: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{role}', label: 'Rol Adı' },
    { tag: '{roleid}', label: 'Rol ID' },
    { tag: '{rolemention}', label: 'Rol Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  CHANNEL_CREATE: [
    { tag: '{channel}', label: 'Kanal Adı' },
    { tag: '{channelid}', label: 'Kanal ID' },
    { tag: '{channelmention}', label: 'Kanal Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  CHANNEL_DELETE: [
    { tag: '{channel}', label: 'Kanal Adı' },
    { tag: '{channelid}', label: 'Kanal ID' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  CHANNEL_UPDATE: [
    { tag: '{channel}', label: 'Kanal Adı' },
    { tag: '{channelid}', label: 'Kanal ID' },
    { tag: '{channelmention}', label: 'Kanal Mention' },
    { tag: '{oldname}', label: 'Eski İsim' },
    { tag: '{newname}', label: 'Yeni İsim' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  ROLE_CREATE: [
    { tag: '{role}', label: 'Rol Adı' },
    { tag: '{roleid}', label: 'Rol ID' },
    { tag: '{rolemention}', label: 'Rol Mention' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  ROLE_DELETE: [
    { tag: '{role}', label: 'Rol Adı' },
    { tag: '{roleid}', label: 'Rol ID' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  ROLE_UPDATE: [
    { tag: '{role}', label: 'Rol Adı' },
    { tag: '{roleid}', label: 'Rol ID' },
    { tag: '{rolemention}', label: 'Rol Mention' },
    { tag: '{oldname}', label: 'Eski İsim' },
    { tag: '{newname}', label: 'Yeni İsim' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  MEMBER_UPDATE: [
    { tag: '{username}', label: 'Kullanıcı Adı' },
    { tag: '{userid}', label: 'Kullanıcı ID' },
    { tag: '{usermention}', label: 'Kullanıcı Mention' },
    { tag: '{oldnickname}', label: 'Eski Takma Ad' },
    { tag: '{newnickname}', label: 'Yeni Takma Ad' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
  GUILD_UPDATE: [
    { tag: '{guildname}', label: 'Sunucu Adı' },
    { tag: '{oldname}', label: 'Eski İsim' },
    { tag: '{newname}', label: 'Yeni İsim' },
    { tag: '{moderator}', label: 'Moderatör' },
    { tag: '{moderatorid}', label: 'Moderatör ID' },
    { tag: '{timestamp}', label: 'Zaman' },
  ],
}

// Her log türü için varsayılan embed başlık/açıklama çeviri anahtarları ve renkleri
const LOG_TYPE_DEFAULT_KEYS: Record<string, {
  embedTitleKey: string
  embedDescriptionKey: string
  embedColor: string
}> = {
  MESSAGE_DELETE: {
    embedTitleKey: 'defaultTitleMessageDelete',
    embedDescriptionKey: 'defaultDescriptionMessageDelete',
    embedColor: '#ED4245',
  },
  MESSAGE_EDIT: {
    embedTitleKey: 'defaultTitleMessageEdit',
    embedDescriptionKey: 'defaultDescriptionMessageEdit',
    embedColor: '#FEE75C',
  },
  MEMBER_BAN: {
    embedTitleKey: 'defaultTitleMemberBan',
    embedDescriptionKey: 'defaultDescriptionMemberBan',
    embedColor: '#ED4245',
  },
  MEMBER_KICK: {
    embedTitleKey: 'defaultTitleMemberKick',
    embedDescriptionKey: 'defaultDescriptionMemberKick',
    embedColor: '#ED4245',
  },
  MEMBER_ROLE_ADD: {
    embedTitleKey: 'defaultTitleMemberRoleAdd',
    embedDescriptionKey: 'defaultDescriptionMemberRoleAdd',
    embedColor: '#57F287',
  },
  MEMBER_ROLE_REMOVE: {
    embedTitleKey: 'defaultTitleMemberRoleRemove',
    embedDescriptionKey: 'defaultDescriptionMemberRoleRemove',
    embedColor: '#ED4245',
  },
  CHANNEL_CREATE: {
    embedTitleKey: 'defaultTitleChannelCreate',
    embedDescriptionKey: 'defaultDescriptionChannelCreate',
    embedColor: '#57F287',
  },
  CHANNEL_DELETE: {
    embedTitleKey: 'defaultTitleChannelDelete',
    embedDescriptionKey: 'defaultDescriptionChannelDelete',
    embedColor: '#ED4245',
  },
  CHANNEL_UPDATE: {
    embedTitleKey: 'defaultTitleChannelUpdate',
    embedDescriptionKey: 'defaultDescriptionChannelUpdate',
    embedColor: '#FEE75C',
  },
  ROLE_CREATE: {
    embedTitleKey: 'defaultTitleRoleCreate',
    embedDescriptionKey: 'defaultDescriptionRoleCreate',
    embedColor: '#57F287',
  },
  ROLE_DELETE: {
    embedTitleKey: 'defaultTitleRoleDelete',
    embedDescriptionKey: 'defaultDescriptionRoleDelete',
    embedColor: '#ED4245',
  },
  ROLE_UPDATE: {
    embedTitleKey: 'defaultTitleRoleUpdate',
    embedDescriptionKey: 'defaultDescriptionRoleUpdate',
    embedColor: '#FEE75C',
  },
  MEMBER_UPDATE: {
    embedTitleKey: 'defaultTitleMemberUpdate',
    embedDescriptionKey: 'defaultDescriptionMemberUpdate',
    embedColor: '#FEE75C',
  },
  GUILD_UPDATE: {
    embedTitleKey: 'defaultTitleGuildUpdate',
    embedDescriptionKey: 'defaultDescriptionGuildUpdate',
    embedColor: '#FEE75C',
  },
}

export function BotLogChannel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [categories, setCategories] = React.useState<DiscordCategory[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create'>('list')
  const [provisionOpen, setProvisionOpen] = React.useState(false)
  const [provisionMode, setProvisionMode] = React.useState<'auto' | 'existing'>('auto')
  const [parentCategoryId, setParentCategoryId] = React.useState('')

  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'log', featureDisplayName: t('logChannel') })

  const logTypeLabel = React.useCallback(
    (value: string) =>
      LOG_TYPE_LABEL_KEYS[value] ? t(`logChannel:${LOG_TYPE_LABEL_KEYS[value]}`) : value,
    [t]
  )

  const LOG_TYPES = React.useMemo(
    () =>
      Object.keys(LOG_TYPE_LABEL_KEYS).map((value) => ({
        value,
        label: logTypeLabel(value),
        emoji: LOG_TYPE_EMOJIS[value],
      })),
    [logTypeLabel]
  )

  const form = useForm<any>({
    resolver: zodResolver(logChannelFormSchema) as any,
    defaultValues: {
      guildId: guildId,
      channelId: '',
      logType: '',
      ...createEmptyEmbedValues('embed'),
      isEmbed: false,
    },
  })

  React.useEffect(() => {
    form.reset({
      guildId: guildId,
      channelId: '',
      logType: '',
      ...createEmptyEmbedValues('embed'),
      isEmbed: false,
    })
    setMode('list')
  }, [guildId, form])

  // Log channel ve types'ı getir
  const { data: logChannelData, isLoading } = useQuery({
    queryKey: ['logChannel', guildId],
    queryFn: async () => {
      try {
        const response = await logChannelApi.getByGuildId(guildId)
        return response.data || null
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!guildId,
  })

  const { data: logTypesData } = useQuery({
    queryKey: ['logChannelTypes', guildId],
    queryFn: async () => {
      try {
        const response = await logChannelApi.getTypesByGuildId(guildId)
        return response.data || []
      } catch (error: any) {
        if (error.response?.status === 404) {
          return []
        }
        throw error
      }
    },
    enabled: !!guildId,
  })

  const deleteLogType = React.useCallback(
    (logType: string, label: string) => {
      if (confirm(t('logChannel:deleteConfirm', { label }))) {
        logChannelApi
          .deleteType(guildId, logType)
          .then(() => {
            toast.success(t('logChannel:logTypeDeleted'))
            queryClient.invalidateQueries({ queryKey: ['logChannelTypes', guildId] })
            queryClient.invalidateQueries({ queryKey: ['logChannel', guildId] })
          })
          .catch((error: any) => {
            toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
          })
      }
    },
    [guildId, queryClient, t]
  )

  const logTypeColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        id: 'logType',
        accessorFn: (lt: any) => LOG_TYPES.find((x) => x.value === lt.logType)?.label || lt.logType,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('logChannel:colLogType')} />,
        cell: ({ row }) => {
          const info = LOG_TYPES.find((x) => x.value === row.original.logType)
          return (
            <div className='flex items-center gap-2 font-medium'>
              <span>{info?.emoji || '📝'}</span>
              <span>{info?.label || row.original.logType}</span>
            </div>
          )
        },
      },
      {
        id: 'channel',
        accessorFn: (lt: any) => {
          const channel = lt.channelId
            ? channels.find((c) => c.id === lt.channelId)
            : channels.find((c) => c.id === logChannelData?.channelId)
          return channel ? `#${channel.name}` : t('logChannel:notSpecified')
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('logChannel:colChannel')} />,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        id: 'actions',
        header: t('logChannel:colActions'),
        enableSorting: false,
        cell: ({ row }) => {
          const info = LOG_TYPES.find((x) => x.value === row.original.logType)
          return (
            <Button
              variant='destructive'
              size='sm'
              onClick={() => deleteLogType(row.original.logType, info?.label || row.original.logType)}
            >
              <Trash2 className='size-4' />
            </Button>
          )
        },
      },
    ],
    [channels, logChannelData, deleteLogType, LOG_TYPES, t]
  )

  // Kanalları getir
  React.useEffect(() => {
    const fetchChannels = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        const channelsArray = data?.channels || []
        const sortedChannels = [...channelsArray].sort((a, b) => a.position - b.position)
        setChannels(sortedChannels)
        setCategories(data?.categories || [])
      } catch (error) {
        console.error('Kanal listesi alınamadı:', error)
        toast.error(t('common:channelsLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }

    fetchChannels()
  }, [guildId])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const embedPayload = toEmbedApiPayload(data, embedFields)
      // Önce log channel'ı oluştur (genel kanal)
      await logChannelApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        enabled: true,
        embedSettings: {
          isEmbed: true,
        },
      })

      // Seçilen log türü için ayarlarla ekle
      await logChannelApi.createType({
        guildId: data.guildId,
        logType: data.logType,
        channelId: data.channelId,
        enabled: true,
        embedSettings: {
          isEmbed: true,
          embedTitle: embedPayload.embedTitle as string | undefined,
          embedDescription: embedPayload.embedDescription as string | undefined,
          embedColor: embedPayload.embedColor as string | undefined,
          embedThumbnail: embedPayload.embedThumbnail as string | undefined,
          embedImage: embedPayload.embedImage as string | undefined,
          embedFooter: embedPayload.embedFooter as string | undefined,
        },
      })
    },
    onSuccess: () => {
      toast.success(t('logChannel:created'))
      queryClient.invalidateQueries({ queryKey: ['logChannel', guildId] })
      queryClient.invalidateQueries({ queryKey: ['logChannelTypes', guildId] })
      form.reset()
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSubmit = (data: any) => {
    createMutation.mutate(data)
  }

  const refetchChannelLists = React.useCallback(async () => {
    if (!guildId) return
    setChannelsLoading(true)
    try {
      const data = await discordApi.getChannels(guildId)
      setChannels([...(data?.channels || [])].sort((a, b) => a.position - b.position))
      setCategories(data?.categories || [])
    } catch {
      toast.error(t('common:channelsRefreshError'))
    } finally {
      setChannelsLoading(false)
    }
  }, [guildId])

  const provisionMutation = useMutation({
    mutationFn: () =>
      discordApi.provisionLogChannels(guildId, {
        mode: provisionMode,
        parentId: provisionMode === 'existing' ? parentCategoryId : undefined,
      }),
    onSuccess: async (data) => {
      const n = data.logTypes?.length ?? 0
      toast.success(
        n > 0
          ? t('logChannel:provisionSuccessWithCount', { count: n })
          : t('logChannel:provisionSuccess')
      )
      setProvisionOpen(false)
      setProvisionMode('auto')
      setParentCategoryId('')
      await refetchChannelLists()
      queryClient.invalidateQueries({ queryKey: ['logChannel', guildId] })
      queryClient.invalidateQueries({ queryKey: ['logChannelTypes', guildId] })
    },
    onError: (err: Error & { status?: number }) => {
      toast.error(err?.message || t('logChannel:provisionFailed'))
    },
  })

  const savedLogTypeKeys = React.useMemo(() => {
    const set = new Set<string>()
    for (const s of logTypesData ?? []) {
      if (s.logType) set.add(s.logType.toUpperCase())
    }
    return set
  }, [logTypesData])

  const availableLogTypesCount = LOG_TYPES.filter((lt) => !savedLogTypeKeys.has(lt.value.toUpperCase())).length
  const selectedLogType = form.watch('logType')
  const logDescriptionTags = React.useMemo(
    () => (selectedLogType ? (LOG_TYPE_TAGS[selectedLogType] ?? []).map((t: { tag: string }) => t.tag) : []),
    [selectedLogType]
  )

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
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('logChannel:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('logChannel:pageDescription')}
              </p>
            </div>
            <div className='flex flex-col items-stretch gap-2 sm:items-end'>
              {!logChannelData && (
                <Button
                  type='button'
                  className='w-full sm:w-auto'
                  onClick={() => {
                    setProvisionMode('auto')
                    setParentCategoryId('')
                    setProvisionOpen(true)
                  }}
                >
                  <Sparkles className='mr-2 size-4' />
                  {t('logChannel:quickSetup')}
                </Button>
              )}
              <FeatureDisableButton
                guildId={guildId}
                featureName='log'
                featureDisplayName={t('logChannel')}
                confirmDescription={t('logChannel:disableConfirmDescription')}
              />
            </div>
          </div>

          <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>{t('logChannel:provisionDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('logChannel:provisionDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-2'>
                <RadioGroup
                  value={provisionMode}
                  onValueChange={(v) => {
                    setProvisionMode(v as 'auto' | 'existing')
                    if (v === 'auto') setParentCategoryId('')
                  }}
                >
                  <div className='flex items-start space-x-3 rounded-lg border p-3'>
                    <RadioGroupItem value='auto' id='provision-auto' className='mt-0.5' />
                    <div className='space-y-1'>
                      <Label htmlFor='provision-auto' className='cursor-pointer font-medium'>
                        {t('logChannel:provisionAutoLabel')}
                      </Label>
                      <p className='text-sm text-muted-foreground'>
                        {t('logChannel:provisionAutoDescription')}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-3 rounded-lg border p-3'>
                    <RadioGroupItem value='existing' id='provision-existing' className='mt-0.5' />
                    <div className='space-y-1 flex-1'>
                      <Label htmlFor='provision-existing' className='cursor-pointer font-medium'>
                        {t('logChannel:provisionExistingLabel')}
                      </Label>
                      <p className='text-sm text-muted-foreground'>
                        {t('logChannel:provisionExistingDescription')}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
                {provisionMode === 'existing' && (
                  <div className='space-y-2'>
                    <Label className='text-sm font-medium'>{t('logChannel:categoryLabel')}</Label>
                    <Select
                      value={parentCategoryId || ''}
                      onValueChange={setParentCategoryId}
                      disabled={channelsLoading}
                    >
                      <SelectTrigger className='h-11 w-full'>
                        <SelectValue
                          placeholder={
                            channelsLoading
                              ? t('logChannel:categoriesLoading')
                              : categories.length
                                ? t('logChannel:categoryPlaceholder')
                                : t('logChannel:noCategories')
                          }
                        >
                          {parentCategoryId &&
                            categories.find((c) => c.id === parentCategoryId) && (
                              <span>{categories.find((c) => c.id === parentCategoryId)?.name}</span>
                            )}
                        </SelectValue>
                      </SelectTrigger>
                      <SearchableSelectContent
                        className='max-h-[300px]'
                        items={categories.map((c) => ({ value: c.id, label: c.name }))}
                        searchPlaceholder={t('logChannel:categorySearchPlaceholder')}
                        loading={channelsLoading}
                      />
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setProvisionOpen(false)}
                  disabled={provisionMutation.isPending}
                >
                  {t('logChannel:cancel')}
                </Button>
                <Button
                  type='button'
                  disabled={
                    provisionMutation.isPending ||
                    (provisionMode === 'existing' && !parentCategoryId) ||
                    (provisionMode === 'existing' && categories.length === 0)
                  }
                  onClick={() => provisionMutation.mutate()}
                >
                  {provisionMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      {t('logChannel:creating')}
                    </>
                  ) : (
                    t('logChannel:create')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {mode === 'create' && (
          <Card className='border'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => setMode('list')}
                >
                  <X className='mr-1 size-4' />
                  {t('logChannel:close')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Log Kanalı Seçimi */}
                    <FormField
                      control={form.control}
                      name='channelId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-base font-semibold'>{t('logChannel:channelSelectLabel')}</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={channelsLoading}
                            >
                              <SelectTrigger className='h-11 w-full'>
                                <SelectValue placeholder={channelsLoading ? t('logChannel:channelsLoading') : t('logChannel:channelPlaceholder')}>
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
                                searchPlaceholder={t('logChannel:channelSearchPlaceholder')}
                                loading={channelsLoading}
                              />
                            </Select>
                          </FormControl>
                          <FormDescription className='text-sm'>
                            {t('logChannel:channelSelectDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Log Türü Seçimi */}
                    <FormField
                      control={form.control}
                      name='logType'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-base font-semibold'>{t('logChannel:logTypeSelectLabel')}</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || ''}
                              onValueChange={(value) => {
                                field.onChange(value)
                                // Log türü seçildiğinde varsayılan embed ayarlarını yükle
                                const defaults = LOG_TYPE_DEFAULT_KEYS[value]
                                if (defaults) {
                                  form.setValue(embedFields.embedTitle, t(`logChannel:${defaults.embedTitleKey}`))
                                  form.setValue(
                                    embedFields.embedDescription,
                                    t(`logChannel:${defaults.embedDescriptionKey}`)
                                  )
                                  form.setValue(embedFields.embedColor, defaults.embedColor)
                                }
                              }}
                            >
                              <SelectTrigger className='h-11 w-full'>
                                <SelectValue placeholder={t('logChannel:logTypePlaceholder')}>
                                  {field.value && LOG_TYPES.find((lt) => lt.value === field.value) && (
                                    <div className='flex items-center gap-2'>
                                      <span>{LOG_TYPES.find((lt) => lt.value === field.value)?.emoji}</span>
                                      <span>{LOG_TYPES.find((lt) => lt.value === field.value)?.label}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SearchableSelectContent
                                className='max-h-[300px]'
                                items={LOG_TYPES.filter(
                                  (logType) => !savedLogTypeKeys.has(logType.value.toUpperCase())
                                ).map((lt) => ({ value: lt.value, label: `${lt.emoji} ${lt.label}` }))}
                                searchPlaceholder={t('logChannel:logTypeSearchPlaceholder')}
                              />
                            </Select>
                          </FormControl>
                          <FormDescription className='text-sm'>
                            {t('logChannel:logTypeSelectDescription', { count: availableLogTypesCount })}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Embed Ayarları (yalnızca embed; ayrı metin modu yok) */}
                  <div className='space-y-6 pt-4 border-t'>
                    <p className='text-sm text-muted-foreground'>
                      {t('logChannel:embedInfo')}
                    </p>

                    <EmbedFormSection
                      control={form.control}
                      watch={form.watch}
                      fieldNames={embedFields}
                      showIsEmbed={false}
                      showMessage={false}
                      descriptionTags={logDescriptionTags}
                    />
                  </div>

                  <Button
                    type='submit'
                    className='w-full h-11'
                    disabled={createMutation.isPending || !form.watch('channelId') || !form.watch('logType')}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        {t('logChannel:creating')}
                      </>
                    ) : (
                      <>
                        <Plus className='mr-2 size-4' />
                        {t('logChannel:createLogChannel')}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          )}

          {/* Kayıtlı Log Channel Ayarları */}
          {mode === 'list' && (
          <Card className='border'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-2xl'>{t('logChannel:savedSettingsTitle')}</CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setMode('create')}
                  disabled={availableLogTypesCount === 0}
                >
                  <Plus className='mr-2 size-4' />
                  {t('logChannel:create')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logTypesData && Array.isArray(logTypesData) && logTypesData.length > 0 ? (
                <SimpleDataTable
                  columns={logTypeColumns}
                  data={logTypesData}
                  searchPlaceholder={t('logChannel:tableSearchPlaceholder')}
                  emptyMessage={t('logChannel:emptyMessage')}
                />
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  <Settings className='size-12 mx-auto mb-4 opacity-50' />
                  <p>{t('logChannel:emptyMessage')}</p>
                  <p className='text-sm mt-2 max-w-md mx-auto'>
                    {t('logChannel:emptyStateHintBefore')}{' '}
                    <span className='font-medium text-foreground'>{t('logChannel:quickSetup')}</span>{' '}
                    {t('logChannel:emptyStateHintAfter')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </Main>
    </>
  )
}
