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
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PageSection } from '@/components/layout/page-section'
import { SectionNav } from '@/components/layout/section-nav'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { giveawayApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Send, Plus, Trash2, X, Edit2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { DateTimePicker } from '@/components/datetime-picker'
import { parse, format, isValid } from 'date-fns'
import type { DiscordRole, DiscordChannel } from '@/lib/api/discord'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  createEmbedSchema,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
} from '@/components/embed-editor'

const embedFields = defaultEmbedFieldNames

// Çekiliş için kullanılabilir tag'ler
const GIVEAWAY_TAG_NAMES = [
  '{giveawayname}',
  '{prize}',
  '{winnercount}',
  '{enddate}',
  '{endtime}',
  '{timeleft}',
  '{participantcount}',
  '{channel}',
  '{channelmention}',
  '{timestamp}',
]

const GIVEAWAY_DESCRIPTION_TAGS = GIVEAWAY_TAG_NAMES

type TFunc = (key: string) => string

const createGiveawayFormSchema = (t: TFunc) =>
  z
    .object({
      guildId: z.string().min(1, t('giveaway:validation.guildIdRequired')),
      channelId: z.string().min(1, t('giveaway:validation.channelIdRequired')),
      name: z.string().min(1, t('giveaway:validation.nameRequired')),
      prize: z.string().min(1, t('giveaway:validation.prizeRequired')),
      winnerCount: z.number().min(1, t('giveaway:validation.winnerCountMin')),
      endDate: z.string().min(1, t('giveaway:validation.endDateRequired')),
      rolePermissionType: z.number(), // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver
      roles: z.array(z.object({
        roleId: z.string().min(1, t('giveaway:validation.roleIdRequired')),
        winChanceMultiplier: z.number().min(0.1).max(10),
      })).optional(),
      allowedRoleIds: z.array(z.string()).optional(),
    })
    .merge(createEmbedSchema(embedFields))


export function BotGiveaway() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'giveaway', featureDisplayName: t('nav:giveaway') })

  const giveawayFormSchema = React.useMemo(() => createGiveawayFormSchema(t), [t])

  // Varsayılan embed şablonları
  const GIVEAWAY_EMBED_TEMPLATES = React.useMemo<Array<{
    name: string
    embedTitle: string
    embedDescription: string
    embedColor: string
  }>>(
    () => [
      {
        name: t('giveaway:templates.classic.name'),
        embedTitle: t('giveaway:templates.classic.title'),
        embedDescription: t('giveaway:templates.classic.description'),
        embedColor: '#5865F2',
      },
      {
        name: t('giveaway:templates.detailed.name'),
        embedTitle: t('giveaway:templates.detailed.title'),
        embedDescription: t('giveaway:templates.detailed.description'),
        embedColor: '#FEE75C',
      },
      {
        name: t('giveaway:templates.minimal.name'),
        embedTitle: t('giveaway:templates.minimal.title'),
        embedDescription: t('giveaway:templates.minimal.description'),
        embedColor: '#57F287',
      },
    ],
    [t]
  )

  const form = useForm<any>({
    resolver: zodResolver(giveawayFormSchema),
    defaultValues: {
      guildId: guildId,
      channelId: '',
      name: '',
      prize: '',
      winnerCount: 1,
      endDate: '',
      rolePermissionType: 0,
      ...createEmptyEmbedValues('embed'),
      roles: [],
      allowedRoleIds: [],
    },
  })

  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: 'roles',
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
    setMode('list')
    setSelectedId(null)
  }, [guildId, form])

  const { data: giveaways, isLoading } = useQuery({
    queryKey: ['giveaways', guildId],
    queryFn: () => giveawayApi.getAllByGuildId(guildId),
    enabled: !!guildId,
  })

  const { data: selectedGiveaway } = useQuery({
    queryKey: ['giveaway', selectedId],
    queryFn: () => giveawayApi.getById(selectedId!),
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
    if (selectedGiveaway) {
      const endDate = selectedGiveaway.endDate ? utcIsoToWallDatetime(selectedGiveaway.endDate) : ''
      form.reset({
        guildId: selectedGiveaway.guildId,
        channelId: selectedGiveaway.channelId,
        name: selectedGiveaway.name,
        prize: selectedGiveaway.prize,
        winnerCount: selectedGiveaway.winnerCount,
        endDate: endDate,
        rolePermissionType: selectedGiveaway.rolePermissionType,
        ...fromEmbedApiDto(selectedGiveaway as unknown as Record<string, unknown>, 'embed'),
        roles: selectedGiveaway.roles.map(r => ({
          roleId: r.roleId,
          winChanceMultiplier: Number(r.winChanceMultiplier),
        })),
        allowedRoleIds: selectedGiveaway.allowedRoles.map(ar => ar.roleId),
      })
    }
  }, [selectedGiveaway, form])

  /** Takvimde seçilen saat dilimi ile aynı: `YYYY-MM-DDTHH:mm` → anlık UTC ISO (DateTimePicker ile uyumlu) */
  function wallDatetimeToUtcIso(ymdhm: string): string {
    if (!ymdhm) return ''
    const d = parse(ymdhm, "yyyy-MM-dd'T'HH:mm", new Date())
    return isValid(d) ? d.toISOString() : ''
  }

  function utcIsoToWallDatetime(utcIso: string): string {
    if (!utcIso) return ''
    const d = new Date(utcIso)
    return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : ''
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const embedPayload = toEmbedApiPayload(data, embedFields)
      return giveawayApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        name: data.name,
        prize: data.prize,
        winnerCount: data.winnerCount,
        endDate: wallDatetimeToUtcIso(data.endDate),
        rolePermissionType: data.rolePermissionType,
        isEmbed: Boolean(embedPayload.isEmbed),
        embedTitle: embedPayload.embedTitle as string | undefined,
        embedDescription: embedPayload.embedDescription as string | undefined,
        embedColor: embedPayload.embedColor as string | undefined,
        embedThumbnail: embedPayload.embedThumbnail as string | undefined,
        embedImage: embedPayload.embedImage as string | undefined,
        embedFooter: embedPayload.embedFooter as string | undefined,
        roles: data.roles?.map((r: { roleId: string; winChanceMultiplier: number }) => ({
          roleId: r.roleId,
          winChanceMultiplier: r.winChanceMultiplier,
        })),
        allowedRoleIds: data.allowedRoleIds,
      })
    },
    onSuccess: (data) => {
      toast.success(t('giveaway:created'))
      queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] })
      setSelectedId(data.id)
      setMode('list')
      setTimeout(() => {
        sendMutation.mutate(data.id)
      }, 500)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const embedPayload = toEmbedApiPayload(data, embedFields)
      return giveawayApi.update(guildId, id, {
        channelId: data.channelId,
        name: data.name,
        prize: data.prize,
        winnerCount: data.winnerCount,
        endDate: wallDatetimeToUtcIso(data.endDate),
        rolePermissionType: data.rolePermissionType,
        isEmbed: Boolean(embedPayload.isEmbed),
        embedTitle: embedPayload.embedTitle as string | undefined,
        embedDescription: embedPayload.embedDescription as string | undefined,
        embedColor: embedPayload.embedColor as string | undefined,
        embedThumbnail: embedPayload.embedThumbnail as string | undefined,
        embedImage: embedPayload.embedImage as string | undefined,
        embedFooter: embedPayload.embedFooter as string | undefined,
      })
    },
    onSuccess: () => {
      toast.success(t('giveaway:updated'))
      queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] })
      queryClient.invalidateQueries({ queryKey: ['giveaway', selectedId] })
      setSelectedId(null)
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => giveawayApi.sendToChannel(id),
    onSuccess: () => {
      toast.success(t('giveaway:sent'))
      queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('giveaway:sendFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => giveawayApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('giveaway:deleted'))
      queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] })
      setSelectedId(null)
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('giveaway:deleteFailed'))
    },
  })

  const onSubmit = (data: any) => {
    if (selectedId) {
      updateMutation.mutate({ id: selectedId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const { mutate: deleteGiveaway, isPending: isDeletingGiveaway } = deleteMutation

  const openEdit = React.useCallback((id: number) => {
    setSelectedId(id)
    setMode('edit')
  }, [])

  const giveawayColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('giveaway:columns.name')} />,
        cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
      },
      {
        accessorKey: 'prize',
        meta: { className: 'hidden md:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('giveaway:columns.prize')} />,
        cell: ({ row }) => row.original.prize,
      },
      {
        accessorKey: 'winnerCount',
        meta: { className: 'hidden md:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('giveaway:columns.winner')} />,
        cell: ({ row }) => row.original.winnerCount,
      },
      {
        accessorKey: 'endDate',
        meta: { className: 'hidden lg:table-cell' },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('giveaway:columns.endDate')} />,
        cell: ({ row }) => new Date(row.original.endDate).toLocaleString('tr-TR'),
      },
      {
        id: 'status',
        header: t('giveaway:columns.status'),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive && !row.original.isEnded ? (
            <span className='rounded bg-green-500/20 px-2 py-1 text-xs text-green-500'>{t('giveaway:status.active')}</span>
          ) : (
            <span className='rounded bg-gray-500/20 px-2 py-1 text-xs text-gray-500'>{t('giveaway:status.ended')}</span>
          ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('giveaway:columns.action')}</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='ghost'
              size='icon'
              onClick={(e) => {
                e.stopPropagation()
                openEdit(row.original.id)
              }}
            >
              <Edit2 className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(t('giveaway:confirmDeleteNamed', { name: row.original.name }))) {
                  deleteGiveaway(row.original.id)
                }
              }}
              disabled={isDeletingGiveaway}
            >
              {isDeletingGiveaway ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Trash2 className='text-destructive size-4' />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, deleteGiveaway, isDeletingGiveaway, t]
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
        <div className='space-y-8 max-w-4xl mx-auto'>
          {/* Header */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('giveaway:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('giveaway:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='giveaway'
              featureDisplayName={t('giveaway:pageTitle')}
              confirmDescription={t('giveaway:disableConfirmDescription')}
            />
          </div>

          {mode === 'list' && (
            <Card className='border'>
              <CardHeader className='pb-4'>
                <div className='flex items-center justify-between gap-2'>
                  <CardTitle className='text-2xl'>{t('giveaway:listTitle')}</CardTitle>
                  <div className='flex flex-wrap items-center justify-end gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setSelectedId(null)
                      form.reset({
                        guildId: guildId,
                        channelId: '',
                        name: '',
                        prize: '',
                        winnerCount: 1,
                        endDate: '',
                        rolePermissionType: 0,
                        ...createEmptyEmbedValues('embed'),
                        roles: [],
                        allowedRoleIds: [],
                      })
                      setMode('create')
                    }}
                  >
                    <Plus className='mr-2 size-4' />
                    {t('giveaway:create')}
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {giveaways && giveaways.length > 0 ? (
                  <SimpleDataTable
                    columns={giveawayColumns}
                    data={giveaways}
                    searchPlaceholder={t('giveaway:searchPlaceholder')}
                    emptyMessage={t('giveaway:empty')}
                    onRowClick={(g) => openEdit(g.id)}
                  />
                ) : (
                  <p className='text-muted-foreground text-center py-8'>{t('giveaway:empty')}</p>
                )}
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
                  {t('giveaway:close')}
                </Button>
              </div>

              <Card className='border'>
                <CardContent className='pt-6'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-base font-semibold'>{t('giveaway:nameLabel')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('giveaway:namePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('giveaway:nameDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <SectionNav
                items={[
                  { id: 'general', label: t('giveaway:tabs.general') },
                  { id: 'permissions', label: t('giveaway:tabs.permissions') },
                  { id: 'win-chance', label: t('giveaway:tabs.winChance') },
                  { id: 'message', label: t('giveaway:tabs.message') },
                ]}
              />
              <div className='space-y-8'>
                {/* Genel Tab */}
                <PageSection id='general'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('giveaway:general.title')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('giveaway:general.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-2'>
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('giveaway:channelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('giveaway:channelsLoading') : t('giveaway:channelSelect')}>
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
                                  searchPlaceholder={t('giveaway:channelSearch')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('giveaway:channelDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='prize'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('giveaway:prizeLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('giveaway:prizePlaceholder')} {...field} />
                            </FormControl>
                            <FormDescription>
                              {t('giveaway:prizeDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className='grid grid-cols-2 gap-4'>
                        <FormField
                          control={form.control}
                          name='winnerCount'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('giveaway:winnerCountLabel')}</FormLabel>
                              <FormControl>
                                <Input type='number' min={1} className='h-11' {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='endDate'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('giveaway:endDateLabel')}</FormLabel>
                              <FormControl>
                                <DateTimePicker
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  placeholder={t('giveaway:endDatePlaceholder')}
                                  min={new Date()}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('giveaway:endDateDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </PageSection>

                {/* İzinler Tab */}
                <PageSection id='permissions'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('giveaway:permissions.title')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('giveaway:permissions.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-2'>
                      <FormField
                        control={form.control}
                        name='rolePermissionType'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('giveaway:permissionTypeLabel')}</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value ?? 0)}>
                              <FormControl>
                                <SelectTrigger className='h-11'>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='0'>{t('giveaway:permissionType.ignoreOthers')}</SelectItem>
                                <SelectItem value='1'>{t('giveaway:permissionType.allowOthers')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('giveaway:permissionTypeDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='allowedRoleIds'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('giveaway:allowedRolesLabel')}</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                const current = field.value ?? []
                                if (!current.includes(value)) {
                                  field.onChange([...current, value])
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className='h-11'>
                                  <SelectValue placeholder={rolesLoading ? t('giveaway:rolesLoading') : t('giveaway:roleAdd')}>
                                    {rolesLoading && t('giveaway:rolesLoading')}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SearchableSelectContent
                                className='max-h-[300px]'
                                items={roles
                                  .filter((role) => !field.value?.includes(role.id))
                                  .map((r) => ({ value: r.id, label: r.managed ? t('giveaway:roleBotSuffix', { name: r.name }) : r.name }))}
                                searchPlaceholder={t('giveaway:roleSearch')}
                                loading={rolesLoading}
                              />
                            </Select>
                            <FormDescription>
                              {t('giveaway:allowedRolesDescription')}
                            </FormDescription>
                            {field.value && field.value.length > 0 && (
                              <div className='flex flex-wrap gap-2 mt-2'>
                                {field.value.map((roleId: string) => {
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
                                          field.onChange(field.value?.filter((id: string) => id !== roleId))
                                        }}
                                        className='text-muted-foreground hover:text-foreground'
                                      >
                                        <X className='size-4' />
                                      </button>
                                    </div>
                                  ) : null
                                })}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Kazanma Şansı Tab */}
                <PageSection id='win-chance'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('giveaway:winChance.title')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('giveaway:winChance.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-2'>
                      {roleFields.map((field, index) => (
                        <div key={field.id} className='flex gap-2 items-center'>
                          <FormField
                            control={form.control}
                            name={`roles.${index}.roleId`}
                            render={({ field }) => (
                              <FormItem className='flex-1'>
                                <FormControl>
                                  <Select
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                    disabled={rolesLoading}
                                  >
                                    <SelectTrigger className='h-11'>
                                      <SelectValue placeholder={rolesLoading ? t('giveaway:rolesLoading') : t('giveaway:roleSelect')}>
                                        {field.value && roles.find((r) => r.id === field.value) && (
                                          <div className='flex items-center gap-2'>
                                            <div
                                              className='size-4 rounded-full border-2 border-background flex-shrink-0'
                                              style={{
                                                backgroundColor: getRoleColor(roles.find((r) => r.id === field.value)?.color || 0),
                                              }}
                                            />
                                            <span className='truncate'>{roles.find((r) => r.id === field.value)?.name}</span>
                                            {roles.find((r) => r.id === field.value)?.managed && (
                                              <span className='text-xs text-muted-foreground ml-auto'>
                                                {t('giveaway:botTag')}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SearchableSelectContent
                                      className='max-h-[300px]'
                                      items={roles.map((r) => ({
                                        value: r.id,
                                        label: r.managed ? t('giveaway:roleBotSuffix', { name: r.name }) : r.name,
                                      }))}
                                      searchPlaceholder={t('giveaway:roleSearch')}
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
                            name={`roles.${index}.winChanceMultiplier`}
                            render={({ field }) => (
                              <FormItem className='w-32'>
                                <FormControl>
                                  <Input
                                    type='number'
                                    step='0.1'
                                    min='0.1'
                                    max='10'
                                    placeholder='1.0'
                                    className='h-11'
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Label className='text-sm text-muted-foreground whitespace-nowrap'>{t('giveaway:multiplier')}</Label>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeRole(index)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => appendRole({ roleId: '', winChanceMultiplier: 1.0 })}
                        className='w-full'
                      >
                        <Plus className='size-4 mr-2' />
                        {t('giveaway:addRole')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>

                {/* Mesaj Tab */}
                <PageSection id='message'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('giveaway:message.title')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('giveaway:message.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-2'>
                      <div className='space-y-4'>
                        <div className='space-y-2'>
                          <Label className='text-base font-semibold'>{t('giveaway:templateLabel')}</Label>
                          <Select
                            onValueChange={(value) => {
                              const template = GIVEAWAY_EMBED_TEMPLATES.find(tpl => tpl.name === value)
                              if (template) {
                                form.setValue(embedFields.embedTitle, template.embedTitle)
                                form.setValue(embedFields.embedDescription, template.embedDescription)
                                form.setValue(embedFields.embedColor, template.embedColor)
                              }
                            }}
                          >
                            <SelectTrigger className='h-11'>
                              <SelectValue placeholder={t('giveaway:templateSelect')} />
                            </SelectTrigger>
                            <SearchableSelectContent
                              items={GIVEAWAY_EMBED_TEMPLATES.map((tpl) => ({ value: tpl.name, label: tpl.name }))}
                              searchPlaceholder={t('giveaway:templateSearch')}
                            />
                          </Select>
                          <p className='text-xs text-muted-foreground'>
                            {t('giveaway:templateHint')}
                          </p>
                        </div>

                        <EmbedFormSection
                          control={form.control}
                          watch={form.watch}
                          fieldNames={embedFields}
                          showMessage={false}
                          descriptionTags={GIVEAWAY_DESCRIPTION_TAGS}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </PageSection>

              </div>

              {/* Submit Butonları */}
              <div className='flex items-center gap-4 pt-4'>
                <Button
                  type='submit'
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      {t('giveaway:saving')}
                    </>
                  ) : (
                    <>
                      <Save className='mr-2 size-4' />
                      {selectedId ? t('giveaway:update') : t('giveaway:create')}
                    </>
                  )}
                </Button>
                {selectedId && selectedGiveaway && (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        if (selectedGiveaway.messageId) {
                          toast.info(t('giveaway:alreadySent'))
                        } else {
                          sendMutation.mutate(selectedId)
                        }
                      }}
                      disabled={sendMutation.isPending || !!selectedGiveaway.messageId}
                    >
                      {sendMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 size-4 animate-spin' />
                          {t('giveaway:sending')}
                        </>
                      ) : (
                        <>
                          <Send className='mr-2 size-4' />
                          {t('giveaway:sendToChannel')}
                        </>
                      )}
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      onClick={() => {
                        if (confirm(t('giveaway:confirmDelete'))) {
                          deleteMutation.mutate(selectedId)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 size-4 animate-spin' />
                          {t('giveaway:deleting')}
                        </>
                      ) : (
                        <>
                          <Trash2 className='mr-2 size-4' />
                          {t('giveaway:delete')}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
          )}
        </div>
      </Main>
    </>
  )
}
