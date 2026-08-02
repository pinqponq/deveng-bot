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
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { birthdayApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Plus, Trash2 } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { DatePickerField } from '@/components/datetime-picker'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordRole, DiscordChannel, DiscordMember } from '@/lib/api/discord'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
} from '@/components/embed-editor'

const birthdayEmbedFields = defaultEmbedFieldNames
const createEmbedFields = createEmbedFieldNames('createEmbed', {
  isEmbed: 'createMessageIsEmbed',
  message: 'createMessage',
})
const BIRTHDAY_EMBED_TAGS = ['{user}', '{username}', '{userid}', '{usermention}', '{age}', '{birthday}', '{server}', '{servername}', '{timestamp}']
const CREATE_EMBED_TAGS = ['{user}', '{username}', '{userid}', '{usermention}', '{birthday}', '{birthdate}', '{timestamp}']

function memberDisplayName(m: DiscordMember): string {
  return m.nick?.trim() || m.globalName?.trim() || m.username || m.id
}

// Radix Select.Item boş value kabul etmez; rol yok için sentinel
const ROLE_NONE_VALUE = '__none__' as const

// Mesaj Ayarları Form Schema
const settingsFormSchema = z
  .object({
  guildId: z.string().min(1, 'Guild ID gerekli'),
  channelId: z.string().optional(),
  roleId: z.string().optional(),
  enabled: z.boolean().default(true),
  checkHour: z.number().min(0).max(23).default(0),
})
  .merge(createEmbedSchema(birthdayEmbedFields))
  .merge(createEmbedSchema(createEmbedFields))

// Kullanıcı Ekleme Form Schema
const userFormSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı ID gerekli'),
  birthDate: z.string().min(1, 'Doğum tarihi gerekli'),
})


type UserFormValues = z.infer<typeof userFormSchema>

function buildBirthdaySettingsDefaults(guildId: string) {
  return {
    guildId,
    channelId: '',
    roleId: '',
    ...createEmptyEmbedValues('embed'),
    isEmbed: false,
    enabled: true,
    checkHour: 0,
    ...createEmptyEmbedValues('createEmbed', { isEmbed: 'createMessageIsEmbed', message: 'createMessage' }),
    createMessageIsEmbed: false,
  }
}

export function BotBirthday() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [members, setMembers] = React.useState<DiscordMember[]>([])
  const [membersLoading, setMembersLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'edit'>('list')

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'birthday', featureDisplayName: t('nav:birthday') })

  // Settings Form
  const settingsForm = useForm<any>({
    resolver: zodResolver(settingsFormSchema) as any,
    defaultValues: buildBirthdaySettingsDefaults(guildId),
  })

  // User Form
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      userId: '',
      birthDate: '',
    },
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      settingsForm.setValue('guildId', guildId)
    }
    setMode('list')
  }, [guildId, settingsForm])

  // Mevcut settings getir
  const { data: settingsData, isLoading: settingsLoading, isSuccess: settingsLoaded } = useQuery({
    queryKey: ['birthday-settings', guildId],
    queryFn: () => birthdayApi.getSettingsByGuildId(guildId),
    enabled: !!guildId,
  })

  // Kullanıcıları getir
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['birthday-users', guildId],
    queryFn: () => birthdayApi.getUsersByGuildId(guildId),
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

  // Üyeleri getir (Redis cache'den veya Discord API'den)
  React.useEffect(() => {
    const fetchMembers = async () => {
      if (!guildId) return
      setMembersLoading(true)
      try {
        const data = await discordApi.getMembers(guildId)
        setMembers(data.members)
      } catch (error) {
        console.error('Üye listesi alınamadı:', error)
        toast.error(t('common:membersLoadError'))
      } finally {
        setMembersLoading(false)
      }
    }
    fetchMembers()
  }, [guildId])

  // Form'u mevcut verilerle doldur
  React.useEffect(() => {
    if (settingsData) {
      settingsForm.reset({
        guildId: settingsData.guildId,
        channelId: settingsData.channelId || '',
        roleId: settingsData.roleId || '',
        ...fromEmbedApiDto(settingsData as unknown as Record<string, unknown>, 'embed'),
        enabled: settingsData.enabled,
        checkHour: settingsData.checkHour ?? 0,
        ...fromEmbedApiDto(settingsData as unknown as Record<string, unknown>, 'createEmbed', {
          isEmbed: 'createMessageIsEmbed',
          message: 'createMessage',
        }),
      })
    } else if (settingsLoaded) {
      settingsForm.reset(buildBirthdaySettingsDefaults(guildId))
    }
  }, [settingsData, settingsLoaded, settingsForm, guildId])

  // Settings Update/Create Mutation
  const settingsMutation = useMutation({
    mutationFn: (data: any) => {
      const birthdayEmbed = toEmbedApiPayload(data, birthdayEmbedFields)
      const createEmbed = toEmbedApiPayload(data, createEmbedFields)
      const payload = {
        channelId: data.channelId || undefined,
        roleId: data.roleId || undefined,
        isEmbed: Boolean(birthdayEmbed.isEmbed),
        message: birthdayEmbed.message as string | undefined,
        embedTitle: birthdayEmbed.embedTitle as string | undefined,
        embedDescription: birthdayEmbed.embedDescription as string | undefined,
        embedColor: birthdayEmbed.embedColor as string | undefined,
        embedThumbnail: birthdayEmbed.embedThumbnail as string | undefined,
        embedImage: birthdayEmbed.embedImage as string | undefined,
        embedFooter: birthdayEmbed.embedFooter as string | undefined,
        enabled: data.enabled,
        checkHour: data.checkHour,
        createMessageIsEmbed: Boolean(createEmbed.createMessageIsEmbed),
        createMessage: createEmbed.createMessage as string | undefined,
        createEmbedTitle: createEmbed.createEmbedTitle as string | undefined,
        createEmbedDescription: createEmbed.createEmbedDescription as string | undefined,
        createEmbedColor: createEmbed.createEmbedColor as string | undefined,
        createEmbedThumbnail: createEmbed.createEmbedThumbnail as string | undefined,
        createEmbedImage: createEmbed.createEmbedImage as string | undefined,
        createEmbedFooter: createEmbed.createEmbedFooter as string | undefined,
      }
      return settingsData
        ? birthdayApi.updateSettings(guildId, payload)
        : birthdayApi.createOrUpdateSettings({
            guildId: data.guildId,
            ...payload,
          })
    },
    onSuccess: () => {
      toast.success(t('birthday:settingsSaved'))
      queryClient.invalidateQueries({ queryKey: ['birthday-settings', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // User Create Mutation
  const userCreateMutation = useMutation({
    mutationFn: (data: UserFormValues) =>
      birthdayApi.createOrUpdateUser({
        guildId,
        userId: data.userId,
        birthDate: data.birthDate,
      }),
    onSuccess: () => {
      toast.success(t('birthday:userAdded'))
      queryClient.invalidateQueries({ queryKey: ['birthday-users', guildId] })
      userForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // User Delete Mutation
  const userDeleteMutation = useMutation({
    mutationFn: (userId: string) => birthdayApi.deleteUser(guildId, userId),
    onSuccess: () => {
      toast.success(t('birthday:userDeleted'))
      queryClient.invalidateQueries({ queryKey: ['birthday-users', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSettingsSubmit = (data: any) => {
    settingsMutation.mutate(data)
  }

  const onUserSubmit = (data: UserFormValues) => {
    userCreateMutation.mutate(data)
  }

  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  }

  const { mutate: deleteBirthdayUser, isPending: isDeletingBirthdayUser } = userDeleteMutation
  const birthdayUserColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        id: 'member',
        accessorFn: (u: any) => {
          const m = members.find((x) => x.id === u.userId)
          return m ? memberDisplayName(m) : u.userId
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('birthday:colMember')} />,
        cell: ({ row }) => {
          const user = row.original
          const member = members.find((m) => m.id === user.userId)
          const displayName = member ? memberDisplayName(member) : user.userId
          return member ? (
            <div className='flex items-center gap-2'>
              <img src={member.avatarUrl} alt='' className='size-6 rounded-full object-cover' />
              <span>{displayName}</span>
            </div>
          ) : (
            <span className='text-muted-foreground font-mono'>{displayName}</span>
          )
        },
      },
      {
        accessorKey: 'birthDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('birthday:colBirthDate')} />,
        cell: ({ row }) => formatDate(row.original.birthDate),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('birthday:colActions')}</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => deleteBirthdayUser(row.original.userId)}
              disabled={isDeletingBirthdayUser}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        ),
      },
    ],
    [members, deleteBirthdayUser, isDeletingBirthdayUser, t]
  )

  const registeredBirthdaysCard = (
    <Card className='border'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-2xl'>{t('birthday:registeredBirthdaysTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        ) : usersData && usersData.length > 0 ? (
          <SimpleDataTable
            columns={birthdayUserColumns}
            data={usersData}
            searchPlaceholder={t('birthday:searchByMemberPlaceholder')}
            emptyMessage={t('birthday:noUsersYet')}
          />
        ) : (
          <div className='py-12 text-center text-muted-foreground'>{t('birthday:noUsersYet')}</div>
        )}
      </CardContent>
    </Card>
  )

  if (settingsLoading) {
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
                {t('birthday:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('birthday:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='birthday'
              featureDisplayName={t('nav:birthday')}
              confirmDescription={t('birthday:disableConfirmDescription')}
            />
          </div>

          {registeredBirthdaysCard}

          {mode === 'list' && (
            <Card className='border'>
              <CardHeader className='pb-4'>
                <div className='flex items-center justify-between gap-2'>
                  <CardTitle className='text-base'>{t('birthday:currentConfigTitle')}</CardTitle>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setMode('edit')}
                  >
                    {settingsData ? t('birthday:editButton') : t('birthday:createButton')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground'>
                  {settingsData ? t('birthday:settingsSavedSummary', { count: usersData?.length || 0 }) : t('birthday:noDataYet')}
                </p>
              </CardContent>
            </Card>
          )}

          {mode === 'edit' && (
          <div className='space-y-6'>
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='ghost'
                className='h-8 px-2'
                onClick={() => setMode('list')}
              >
                {t('birthday:closeButton')}
              </Button>
            </div>
            <SectionNav
              items={[
                { id: 'users', label: t('birthday:navAddUser') },
                { id: 'general', label: t('birthday:navGeneralSettings') },
                { id: 'message', label: t('birthday:navMessageSettings') },
              ]}
            />
          <div className='space-y-8'>

            {/* Kullanıcı Ekleme Tab */}
            <PageSection id='users'>
              <Card className='border'>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-2xl'>{t('birthday:addUserTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(onUserSubmit)} className='space-y-6'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          control={userForm.control}
                          name='userId'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('birthday:memberLabel')}</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || undefined}
                                  onValueChange={field.onChange}
                                  disabled={membersLoading}
                                >
                                  <SelectTrigger className='h-11 w-full'>
                                    <SelectValue placeholder={membersLoading ? t('birthday:membersLoading') : t('birthday:selectMemberPlaceholder')}>
                                      {field.value && members.find((m) => m.id === field.value) && (
                                        <div className='flex items-center gap-2'>
                                          <img
                                            src={members.find((m) => m.id === field.value)?.avatarUrl}
                                            alt=''
                                            className='size-6 rounded-full object-cover'
                                          />
                                          <span>{memberDisplayName(members.find((m) => m.id === field.value)!)}</span>
                                        </div>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SearchableSelectContent
                                    className='max-h-[300px]'
                                    items={members.map((m) => ({
                                      value: m.id,
                                      label: memberDisplayName(m),
                                    }))}
                                    searchPlaceholder={t('birthday:searchMemberPlaceholder')}
                                    loading={membersLoading}
                                  />
                                </Select>
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('birthday:memberDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name='birthDate'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('birthday:birthDateLabel')}</FormLabel>
                              <FormControl>
                                <DatePickerField
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  placeholder={t('birthday:birthDatePlaceholder')}
                                  max={new Date()}
                                  min={new Date('1900-01-01')}
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('birthday:birthDateDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type='submit'
                        size='lg'
                        className='w-full h-11 text-base font-semibold'
                        disabled={userCreateMutation.isPending}
                      >
                        {userCreateMutation.isPending && (
                          <Loader2 className='mr-2 size-5 animate-spin' />
                        )}
                        <Plus className='mr-2 size-5' />
                        {t('birthday:addUserButton')}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </PageSection>

            {/* Genel Ayarlar Tab */}
            <PageSection id='general'>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('birthday:generalSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-2'>
                      <FormField
                        control={settingsForm.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('birthday:channelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('birthday:channelsLoading') : t('birthday:selectChannelPlaceholder')}>
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
                                  searchPlaceholder={t('birthday:searchChannelPlaceholder')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('birthday:channelDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={settingsForm.control}
                        name='roleId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('birthday:roleLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value && field.value !== '' ? field.value : ROLE_NONE_VALUE}
                                onValueChange={(v) => field.onChange(v === ROLE_NONE_VALUE ? '' : v)}
                                disabled={rolesLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={rolesLoading ? t('birthday:rolesLoading') : t('birthday:selectRolePlaceholder')}>
                                    {field.value && roles.find((r) => r.id === field.value) ? (
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
                                    ) : (
                                      <span className='text-muted-foreground'>{t('birthday:noRoleOption')}</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  className='max-h-[300px]'
                                  items={[
                                    { value: ROLE_NONE_VALUE, label: t('birthday:noRoleOption') },
                                    ...roles.map((r) => ({ value: r.id, label: r.name })),
                                  ]}
                                  searchPlaceholder={t('birthday:searchRolePlaceholder')}
                                  loading={rolesLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('birthday:roleDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={settingsForm.control}
                        name='checkHour'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('birthday:checkHourLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type='number'
                                min={0}
                                max={23}
                                className='h-11'
                                placeholder='23'
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0
                                  field.onChange(Math.max(0, Math.min(23, value)))
                                }}
                                value={field.value ?? 0}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('birthday:checkHourDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </CardContent>
                  </Card>

                  <div className='flex justify-end gap-4 pt-4 border-t'>
                    <Button
                      type='submit'
                      size='lg'
                      className='min-w-[140px] h-11 text-base font-semibold'
                      disabled={settingsMutation.isPending}
                    >
                      {settingsMutation.isPending && (
                        <Loader2 className='mr-2 size-5 animate-spin' />
                      )}
                      <Save className='mr-2 size-5' />
                      {settingsData ? t('birthday:saveSettingsButton') : t('birthday:createSettingsButton')}
                    </Button>
                  </div>
                </form>
              </Form>
            </PageSection>

            {/* Mesaj Ayarları Tab */}
            <PageSection id='message'>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className='space-y-6'>
                  <div className='space-y-6'>
                      <Card className='border'>
                        <CardHeader className='pb-4'>
                          <CardTitle className='text-2xl'>{t('birthday:birthdayMessageTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-6 pt-2'>
                      <FormField
                        control={settingsForm.control}
                        name='isEmbed'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('birthday:useEmbedLabel')}</FormLabel>
                              <FormDescription className='text-sm'>
                                {t('birthday:useEmbedDescription')}
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

                      {settingsForm.watch('isEmbed') ? (
                        <EmbedFormSection
                          control={settingsForm.control}
                          watch={settingsForm.watch}
                          fieldNames={birthdayEmbedFields}
                          showIsEmbed={false}
                          showMessage={false}
                          descriptionTags={BIRTHDAY_EMBED_TAGS}
                        />
                      ) : (
                        <FormField
                          control={settingsForm.control}
                          name='message'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-base font-semibold'>{t('birthday:messageContentLabel')}</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder={t('birthday:birthdayMessagePlaceholder')}
                                  rows={5}
                                  className='resize-none text-base'
                                />
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('birthday:messageVariablesHint', { user: '{user}' })}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>

                      <Card className='border'>
                        <CardHeader className='pb-4'>
                          <CardTitle className='text-2xl'>{t('birthday:createdMessageTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-6 pt-2'>
                          <FormField
                            control={settingsForm.control}
                            name='createMessageIsEmbed'
                            render={({ field }) => (
                              <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                                <div className='space-y-1 flex-1'>
                                  <FormLabel className='text-base font-semibold'>{t('birthday:useEmbedLabel')}</FormLabel>
                                  <FormDescription className='text-sm'>
                                    {t('birthday:createUseEmbedDescription')}
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
                                  { tag: '{user}', label: t('birthday:tagUsername') },
                                  { tag: '{username}', label: t('birthday:tagUsername') },
                                  { tag: '{userid}', label: t('birthday:tagUserId') },
                                  { tag: '{usermention}', label: t('birthday:tagUserMention') },
                                  { tag: '{birthday}', label: t('birthday:tagBirthDate') },
                                  { tag: '{birthdate}', label: t('birthday:tagBirthDate') },
                                  { tag: '{timestamp}', label: t('birthday:tagTimestamp') },
                                ]

                                return (
                                  <FormItem>
                                    <FormLabel className='text-base font-semibold'>{t('birthday:createMessageLabel')}</FormLabel>
                                    <FormControl>
                                      <div className='space-y-3'>
                                        <Textarea
                                          {...field}
                                          className='min-h-[100px]'
                                          placeholder={t('birthday:createMessagePlaceholder')}
                                        />
                                        {availableTags.length > 0 && (
                                          <div className='space-y-2'>
                                            <p className='text-xs text-muted-foreground font-medium'>{t('birthday:availableTagsLabel')}</p>
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
                        </CardContent>
                      </Card>
                  </div>

                  <div className='flex justify-end gap-4 pt-4 border-t'>
                    <Button
                      type='submit'
                      size='lg'
                      className='min-w-[140px] h-11 text-base font-semibold'
                      disabled={settingsMutation.isPending}
                    >
                      {settingsMutation.isPending && (
                        <Loader2 className='mr-2 size-5 animate-spin' />
                      )}
                      <Save className='mr-2 size-5' />
                      {settingsData ? t('birthday:saveSettingsButton') : t('birthday:createSettingsButton')}
                    </Button>
                  </div>
                </form>
              </Form>
            </PageSection>
          </div>
          </div>
          )}
        </div>
      </Main>
    </>
  )
}
