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
import { temporaryVoiceChannelApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Plus, Trash2, Edit, X } from 'lucide-react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordRole, DiscordVoiceChannel } from '@/lib/api/discord'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const temporaryVoiceChannelFormSchema = z.object({
  guildId: z.string().min(1, 'Guild ID gerekli'),
  channelId: z.string().min(1, 'Kanal ID gerekli'),
  channelName: z.string().min(1, 'Kanal adı gerekli').max(100),
  userLimit: z.number().min(0).max(99).nullable().optional(),
  bitrate: z.number().min(8000).max(384000).nullable().optional(),
  deleteAfterMinutes: z.number().min(0).nullable().optional(),
  ownershipTimeoutMinutes: z.number().min(0).nullable().optional(),
  syncCategoryPermissions: z.boolean(),
  syncChannelPermissions: z.boolean(),
  createTextChannel: z.boolean(),
  restrictCommandsToTextChannel: z.boolean(),
  pinCommandUsage: z.boolean(),
  restrictTextChannel: z.boolean(),
  ownerCanManageChannel: z.boolean(),
  ownerCanManagePermissions: z.boolean(),
  ownerIsPrioritySpeaker: z.boolean(),
  ownerCanMoveMembers: z.boolean(),
  enabled: z.boolean(),
  roles: z.array(z.object({
    roleId: z.string().min(1, 'Rol ID gerekli'),
    roleType: z.number().min(0).max(2), // 0: Ignore, 1: Access, 2: Moderator
    canManageAccess: z.boolean(),
  })),
})

type TemporaryVoiceChannelFormValues = z.infer<typeof temporaryVoiceChannelFormSchema>

export function BotTemporaryVoiceChannel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [selectedLobbyId, setSelectedLobbyId] = React.useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [lobbyToDelete, setLobbyToDelete] = React.useState<number | null>(null)
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordVoiceChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')

  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'voice', featureDisplayName: t('common:temporaryVoiceChannel') })

  const form = useForm<TemporaryVoiceChannelFormValues>({
    resolver: zodResolver(temporaryVoiceChannelFormSchema),
    defaultValues: {
      guildId: guildId,
      channelId: '',
      channelName: 'Geçici Oda',
      userLimit: null,
      bitrate: null,
      deleteAfterMinutes: null,
      ownershipTimeoutMinutes: null,
      syncCategoryPermissions: false,
      syncChannelPermissions: false,
      createTextChannel: false,
      restrictCommandsToTextChannel: false,
      pinCommandUsage: false,
      restrictTextChannel: false,
      ownerCanManageChannel: true,
      ownerCanManagePermissions: true,
      ownerIsPrioritySpeaker: false,
      ownerCanMoveMembers: false,
      enabled: true,
      roles: [],
    },
  })

  const roleFields = useFieldArray({
    control: form.control,
    name: 'roles',
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
        const sortedChannels = [...(data.voiceChannels || [])].sort((a, b) => a.position - b.position)
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

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
    setMode('list')
    setSelectedLobbyId(null)
  }, [guildId, form])

  const { data: lobbiesData, isLoading } = useQuery({
    queryKey: ['temporaryVoiceChannel', guildId],
    queryFn: () => temporaryVoiceChannelApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  const { data: selectedLobbyData } = useQuery({
    queryKey: ['temporaryVoiceChannel', selectedLobbyId],
    queryFn: () => selectedLobbyId ? temporaryVoiceChannelApi.getById(selectedLobbyId) : null,
    enabled: !!selectedLobbyId,
  })

  React.useEffect(() => {
    if (selectedLobbyData) {
      form.reset({
        guildId: selectedLobbyData.guildId,
        channelId: selectedLobbyData.channelId,
        channelName: selectedLobbyData.channelName,
        userLimit: selectedLobbyData.userLimit ?? null,
        bitrate: selectedLobbyData.bitrate ?? null,
        deleteAfterMinutes: selectedLobbyData.deleteAfterMinutes ?? null,
        ownershipTimeoutMinutes: selectedLobbyData.ownershipTimeoutMinutes ?? null,
        syncCategoryPermissions: selectedLobbyData.syncCategoryPermissions,
        syncChannelPermissions: selectedLobbyData.syncChannelPermissions,
        createTextChannel: selectedLobbyData.createTextChannel,
        restrictCommandsToTextChannel: selectedLobbyData.restrictCommandsToTextChannel,
        pinCommandUsage: selectedLobbyData.pinCommandUsage,
        restrictTextChannel: selectedLobbyData.restrictTextChannel,
        ownerCanManageChannel: selectedLobbyData.ownerCanManageChannel,
        ownerCanManagePermissions: selectedLobbyData.ownerCanManagePermissions,
        ownerIsPrioritySpeaker: selectedLobbyData.ownerIsPrioritySpeaker,
        ownerCanMoveMembers: selectedLobbyData.ownerCanMoveMembers,
        enabled: selectedLobbyData.enabled,
        roles: selectedLobbyData.roles.map(r => ({
          roleId: r.roleId,
          roleType: r.roleType,
          canManageAccess: r.canManageAccess,
        })),
      })
    } else if (!selectedLobbyId) {
      // Yeni lobi oluşturma modu
      form.reset({
        guildId: guildId,
        channelId: '',
        channelName: 'Geçici Oda',
        userLimit: null,
        bitrate: null,
        deleteAfterMinutes: null,
        ownershipTimeoutMinutes: null,
        syncCategoryPermissions: false,
        syncChannelPermissions: false,
        createTextChannel: false,
        restrictCommandsToTextChannel: false,
        pinCommandUsage: false,
        restrictTextChannel: false,
        ownerCanManageChannel: true,
        ownerCanManagePermissions: true,
        ownerIsPrioritySpeaker: false,
        ownerCanMoveMembers: false,
        enabled: true,
        roles: [],
      })
    }
  }, [selectedLobbyData, selectedLobbyId, form])

  const updateMutation = useMutation({
    mutationFn: (data: TemporaryVoiceChannelFormValues) =>
      temporaryVoiceChannelApi.update(guildId, selectedLobbyId!, {
        guildId: data.guildId,
        channelId: data.channelId,
        channelName: data.channelName,
        userLimit: data.userLimit ?? undefined,
        bitrate: data.bitrate ?? undefined,
        deleteAfterMinutes: data.deleteAfterMinutes ?? undefined,
        ownershipTimeoutMinutes: data.ownershipTimeoutMinutes ?? undefined,
        syncCategoryPermissions: data.syncCategoryPermissions,
        syncChannelPermissions: data.syncChannelPermissions,
        createTextChannel: data.createTextChannel,
        restrictCommandsToTextChannel: data.restrictCommandsToTextChannel,
        pinCommandUsage: data.pinCommandUsage,
        restrictTextChannel: data.restrictTextChannel,
        ownerCanManageChannel: data.ownerCanManageChannel,
        ownerCanManagePermissions: data.ownerCanManagePermissions,
        ownerIsPrioritySpeaker: data.ownerIsPrioritySpeaker,
        ownerCanMoveMembers: data.ownerCanMoveMembers,
        enabled: data.enabled,
        roles: data.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryVoiceChannel', guildId] })
      toast.success(t('temporaryVoice:updated'))
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: TemporaryVoiceChannelFormValues) =>
      temporaryVoiceChannelApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        channelName: data.channelName,
        userLimit: data.userLimit ?? undefined,
        bitrate: data.bitrate ?? undefined,
        deleteAfterMinutes: data.deleteAfterMinutes ?? undefined,
        ownershipTimeoutMinutes: data.ownershipTimeoutMinutes ?? undefined,
        syncCategoryPermissions: data.syncCategoryPermissions,
        syncChannelPermissions: data.syncChannelPermissions,
        createTextChannel: data.createTextChannel,
        restrictCommandsToTextChannel: data.restrictCommandsToTextChannel,
        pinCommandUsage: data.pinCommandUsage,
        restrictTextChannel: data.restrictTextChannel,
        ownerCanManageChannel: data.ownerCanManageChannel,
        ownerCanManagePermissions: data.ownerCanManagePermissions,
        ownerIsPrioritySpeaker: data.ownerIsPrioritySpeaker,
        ownerCanMoveMembers: data.ownerCanMoveMembers,
        enabled: data.enabled,
        roles: data.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryVoiceChannel', guildId] })
      toast.success(t('temporaryVoice:created'))
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => temporaryVoiceChannelApi.delete(guildId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryVoiceChannel', guildId] })
      toast.success(t('temporaryVoice:lobbyDeleted'))
      setIsDeleteDialogOpen(false)
      setLobbyToDelete(null)
      if (selectedLobbyId === lobbyToDelete) {
        setSelectedLobbyId(null)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSubmit = (data: TemporaryVoiceChannelFormValues) => {
    if (selectedLobbyId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleNewLobby = () => {
    setSelectedLobbyId(null)
    setMode('create')
  }

  const handleEditLobby = (id: number) => {
    setSelectedLobbyId(id)
    setMode('edit')
  }

  const handleDeleteLobby = (id: number) => {
    setLobbyToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (lobbyToDelete) {
      deleteMutation.mutate(lobbyToDelete)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className="space-y-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className='space-y-2'>
              <h1 className="text-2xl font-semibold tracking-tight">{t('temporaryVoice:pageTitle')}</h1>
              <p className="text-lg text-muted-foreground">
                {t('temporaryVoice:pageDescription')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FeatureDisableButton
                guildId={guildId}
                featureName='voice'
                featureDisplayName={t('common:temporaryVoiceChannel')}
                confirmDescription={t('temporaryVoice:disableConfirmDescription')}
              />
              <Button onClick={handleNewLobby} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {t('temporaryVoice:newLobby')}
              </Button>
            </div>
          </div>

          {mode === 'list' && lobbiesData && lobbiesData.length > 0 && (
            <Card className='border'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-2xl'>{t('temporaryVoice:existingLobbiesTitle')}</CardTitle>
                <CardDescription className='text-base'>
                  {t('temporaryVoice:existingLobbiesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lobbiesData.map((lobby) => (
                    <div
                      key={lobby.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                    >
                      <div>
                        <h3 className="font-semibold">{lobby.channelName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('channelId')}: {lobby.channelId} | {lobby.enabled ? t('active') : t('inactive')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLobby(lobby.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteLobby(lobby.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {mode !== 'list' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => setMode('list')}
                >
                  <X className='mr-1 size-4' />
                  {t('temporaryVoice:close')}
                </Button>
              </div>
              <SectionNav
                items={[
                  { id: 'general', label: t('temporaryVoice:navGeneral') },
                  { id: 'settings', label: t('temporaryVoice:navSettings') },
                  { id: 'permissions', label: t('temporaryVoice:navPermissions') },
                  { id: 'roles', label: t('temporaryVoice:navRoles') },
                ]}
              />
              <div className='space-y-8'>
                <PageSection id="general">
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('temporaryVoice:newLobby')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('temporaryVoice:selectLobbyChannelDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="channelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('temporaryVoice:selectLobbyChannelLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('temporaryVoice:channelsLoading') : t('temporaryVoice:selectChannelPlaceholder')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>#</span>
                                        <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  items={channels.map((c) => ({
                                    value: c.id,
                                    label: `# ${c.name}`,
                                  }))}
                                  searchPlaceholder={t('temporaryVoice:searchChannelPlaceholder')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('temporaryVoice:lobbyChannelHint')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="channelName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('temporaryVoice:channelNameLabel')}</FormLabel>
                            <FormControl>
                              <Input className='h-11' placeholder={t('temporaryVoice:channelNamePlaceholder')} {...field} />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('temporaryVoice:channelNameHint')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id="settings">
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('temporaryVoice:settingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="userLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('temporaryVoice:userLimitLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className='h-11'
                                placeholder={t('temporaryVoice:userLimitPlaceholder')}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('temporaryVoice:userLimitHint')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bitrate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('temporaryVoice:bitrateLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className='h-11'
                                placeholder="64000"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('temporaryVoice:bitrateHint')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deleteAfterMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('temporaryVoice:deleteAfterLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className='h-11'
                                placeholder={t('temporaryVoice:neverPlaceholder')}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('temporaryVoice:deleteAfterHint')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </PageSection>

                <PageSection id="permissions">
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('temporaryVoice:permissionsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="syncCategoryPermissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:syncCategoryLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:syncCategoryHint')}
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
                        name="syncChannelPermissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:syncChannelLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:syncChannelHint')}
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
                        name="createTextChannel"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:createTextChannelLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:createTextChannelHint')}
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
                        name="restrictCommandsToTextChannel"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:restrictCommandsLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:restrictCommandsHint')}
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
                        name="pinCommandUsage"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:pinCommandUsageLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:pinCommandUsageHint')}
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
                        name="restrictTextChannel"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-semibold">
                                {t('temporaryVoice:restrictTextChannelLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:restrictTextChannelHint')}
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

                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('temporaryVoice:ownerPermissionsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="ownerCanManageChannel"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {t('temporaryVoice:ownerManageChannelLabel')}
                              </FormLabel>
                              <FormDescription className='text-sm'>
                                {t('temporaryVoice:ownerManageChannelHint')}
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
                        name="ownerCanManagePermissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {t('temporaryVoice:ownerManagePermissionsLabel')}
                              </FormLabel>
                              <FormDescription>
                                {t('temporaryVoice:ownerManagePermissionsHint')}
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
                        name="ownerIsPrioritySpeaker"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {t('temporaryVoice:ownerPrioritySpeakerLabel')}
                              </FormLabel>
                              <FormDescription>
                                {t('temporaryVoice:ownerPrioritySpeakerHint')}
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
                        name="ownerCanMoveMembers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {t('temporaryVoice:ownerMoveMembersLabel')}
                              </FormLabel>
                              <FormDescription>
                                {t('temporaryVoice:ownerMoveMembersHint')}
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

                <PageSection id="roles">
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('temporaryVoice:rolePermissionsTitle')}</CardTitle>
                      <CardDescription className='text-base'>
                        {t('temporaryVoice:rolePermissionsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {roleFields.fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-end">
                          <FormField
                            control={form.control}
                            name={`roles.${index}.roleId`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className='text-base font-semibold'>{t('temporaryVoice:selectRoleLabel')}</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                    disabled={rolesLoading}
                                  >
                                    <SelectTrigger className='h-11 w-full'>
                                      <SelectValue placeholder={rolesLoading ? t('temporaryVoice:rolesLoading') : t('temporaryVoice:selectRolePlaceholder')}>
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
                                      searchPlaceholder={t('temporaryVoice:searchRolePlaceholder')}
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
                            name={`roles.${index}.roleType`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>{t('temporaryVoice:roleTypeLabel')}</FormLabel>
                                <FormControl>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  >
                                    <option value={0}>{t('temporaryVoice:roleTypeIgnore')}</option>
                                    <option value={1}>{t('temporaryVoice:roleTypeAccess')}</option>
                                    <option value={2}>{t('temporaryVoice:roleTypeModerator')}</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => roleFields.remove(index)}
                          >
                            {t('temporaryVoice:delete')}
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => roleFields.append({ roleId: '', roleType: 0, canManageAccess: false })}
                      >
                        {t('temporaryVoice:addRole')}
                      </Button>
                    </CardContent>
                  </Card>
                </PageSection>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending}>
                  {(updateMutation.isPending || createMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {selectedLobbyId ? t('temporaryVoice:update') : t('temporaryVoice:create')}
                </Button>
              </div>
            </form>
          </Form>
          )}

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('temporaryVoice:deleteLobbyTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('temporaryVoice:deleteLobbyConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('temporaryVoice:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('temporaryVoice:delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Main>
    </>
  )
}

