import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { Textarea } from '@/components/ui/textarea'
import { customCommandApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigate } from '@tanstack/react-router'
import { useFeatureStatus } from '@/hooks/use-feature-status'
import { FeatureEnableDialog } from '@/components/feature-enable-dialog'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Trash2, Edit2, Plus, X } from 'lucide-react'
import type { DiscordRole, DiscordChannel } from '@/lib/api/discord'

function normalizeSlashCommandName(input: string): string {
  const turkishMap: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  }

  return input
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishMap[char] || char)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 32)
}

export function BotCustomCommand() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''

  const ACTION_TYPES = React.useMemo(
    () => [
      { value: 0, label: t('customCommand:actionSendMessageLabel'), description: t('customCommand:actionSendMessageDesc') },
      { value: 1, label: t('customCommand:actionReplyLabel'), description: t('customCommand:actionReplyDesc') },
      { value: 2, label: t('customCommand:actionAddRoleLabel'), description: t('customCommand:actionAddRoleDesc') },
      { value: 3, label: t('customCommand:actionRemoveRoleLabel'), description: t('customCommand:actionRemoveRoleDesc') },
    ],
    [t],
  )

  const featureStatus = useFeatureStatus(guildId, 'custom-command')
  const { isEnabled, isLoading: isFeatureLoading } = featureStatus

  const [showEnableDialog, setShowEnableDialog] = React.useState(false)
  const closedDueToEnableRef = React.useRef(false)
  const prevEnabledRef = React.useRef<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (!guildId || isFeatureLoading) return
    const prev = prevEnabledRef.current
    if (prev === true && !isEnabled) {
      prevEnabledRef.current = false
      navigate({ to: '/dashboard/$guildId', params: { guildId }, replace: true })
      return
    }
    prevEnabledRef.current = isEnabled
    if (prev === undefined && !isEnabled) setShowEnableDialog(true)
  }, [guildId, isFeatureLoading, isEnabled, navigate])

  const handleEnableDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        if (closedDueToEnableRef.current) {
          closedDueToEnableRef.current = false
          setShowEnableDialog(false)
          return
        }
        if (!isEnabled) {
          navigate({ to: '/dashboard/$guildId', params: { guildId }, replace: true })
        }
      }
      setShowEnableDialog(open)
    },
    [navigate, guildId, isEnabled],
  )

  const renderPageGate = (children: React.ReactNode) => {
    if (guildId && !isFeatureLoading && !isEnabled) {
      return (
        <Main>
          <FeatureEnableDialog
            open={showEnableDialog}
            onOpenChange={handleEnableDialogOpenChange}
            guildId={guildId}
            featureName='custom-command'
            featureDisplayName={t('customCommand:featureDisplayName')}
            onEnabled={() => {
              closedDueToEnableRef.current = true
              setShowEnableDialog(false)
            }}
          />
        </Main>
      )
    }
    if (isFeatureLoading) {
      return (
        <Main>
          <div className='flex min-h-[60vh] items-center justify-center'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      )
    }
    return children
  }
  const [editingCommand, setEditingCommand] = React.useState<number | null>(null)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')
  const [formData, setFormData] = React.useState({
    commandName: '',
    actionType: 0,
    targetChannelId: '',
    message: '',
    roleId: '',
    enabled: true,
  })
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)

  const resetForm = () => {
    setFormData({
      commandName: '',
      actionType: 0,
      targetChannelId: '',
      message: '',
      roleId: '',
      enabled: true,
    })
  }

  React.useEffect(() => {
    setMode('list')
    setEditingCommand(null)
    resetForm()
    prevEnabledRef.current = undefined
  }, [guildId])

  const { data: commands, isLoading, error } = useQuery({
    queryKey: ['customCommands', guildId],
    queryFn: () => customCommandApi.getByGuildId(guildId),
    enabled: !!guildId && isEnabled,
    retry: false,
  })

  const commandList = commands ?? []

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

  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5'
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  const createOrUpdateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      editingCommand
        ? customCommandApi.update(guildId, editingCommand, data)
        : customCommandApi.createOrUpdate(guildId, data),
    onSuccess: () => {
      toast.success(editingCommand ? t('customCommand:commandUpdated') : t('customCommand:commandCreated'))
      setEditingCommand(null)
      resetForm()
      setMode('list')
      queryClient.invalidateQueries({ queryKey: ['customCommands', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('customCommand:genericError'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customCommandApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('customCommand:deleted'))
      queryClient.invalidateQueries({ queryKey: ['customCommands', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('customCommand:genericError'))
    },
  })

  const toggleEnabledMutation = useMutation({
    mutationFn: (command: any) =>
      customCommandApi.update(guildId, command.id, {
        actionType: command.actionType,
        targetChannelId: command.targetChannelId || '',
        message: command.message || '',
        roleId: command.roleId || '',
        enabled: !command.enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCommands', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('customCommand:toggleError'))
    },
  })

  const isSlashSyncPending =
    createOrUpdateMutation.isPending ||
    deleteMutation.isPending ||
    toggleEnabledMutation.isPending

  const handleEdit = (command: any) => {
    setEditingCommand(command.id)
    setMode('edit')
    setFormData({
      commandName: command.commandName,
      actionType: command.actionType,
      targetChannelId: command.targetChannelId || '',
      message: command.message || '',
      roleId: command.roleId || '',
      enabled: command.enabled,
    })
  }

  const handleSubmit = () => {
    const normalizedCommandName = normalizeSlashCommandName(formData.commandName)
    if (!normalizedCommandName) {
      toast.error(t('customCommand:commandNameRequired'))
      return
    }

    if (formData.actionType === 0 && !formData.targetChannelId) {
      toast.error(t('customCommand:channelIdRequired'))
      return
    }

    if ((formData.actionType === 0 || formData.actionType === 1) && !formData.message?.trim()) {
      toast.error(t('customCommand:messageRequired'))
      return
    }

    if ((formData.actionType === 2 || formData.actionType === 3) && !formData.roleId) {
      toast.error(t('customCommand:roleIdRequired'))
      return
    }

    createOrUpdateMutation.mutate({
      ...formData,
      commandName: normalizedCommandName,
      targetChannelId: formData.actionType === 0 ? (formData.targetChannelId || '') : '',
      message: (formData.actionType === 0 || formData.actionType === 1) ? (formData.message || '') : '',
      roleId: (formData.actionType === 2 || formData.actionType === 3) ? (formData.roleId || '') : '',
    })
  }

  if (isLoading) {
    return renderPageGate(
      <>
        <Main>
          <div className='flex items-center justify-center min-h-[60vh]'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  if (error) {
    return renderPageGate(
      <>
        <Main>
            <div className='space-y-6'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('customCommand:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('customCommand:loadErrorDescription')}
              </p>
            </div>
            <Card className='border'>
              <CardContent className='pt-6'>
                <div className='text-center py-8'>
                  <p className='text-destructive mb-2'>{t('customCommand:errorOccurred')}</p>
                  <p className='text-sm text-muted-foreground'>
                    {t('customCommand:loadErrorDetail')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
    )
  }

  return renderPageGate(
    <>
      <Dialog open={isSlashSyncPending}>
        <DialogContent
          showCloseButton={false}
          className='sm:max-w-md'
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Loader2 className='size-5 animate-spin text-primary' />
              {t('customCommand:syncDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('customCommand:syncDialogDescription')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Main>
        <div className='space-y-5'>
          <div className='flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-1'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('customCommand:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('customCommand:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='custom-command'
              featureDisplayName={t('customCommand:featureDisplayName')}
              confirmDescription={t('customCommand:disableConfirmDescription')}
            />
          </div>

          {mode === 'list' && (
          <Card className='border'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-2xl'>{t('customCommand:existingCommandsTitle')}</CardTitle>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  disabled={!isEnabled}
                  onClick={() => {
                    setEditingCommand(null)
                    resetForm()
                    setMode('create')
                  }}
                >
                  <Plus className='mr-2 size-4' />
                  {t('customCommand:createButton')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {commandList.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  {t('customCommand:emptyState')}
                </p>
              ) : (
                <div className='space-y-2'>
                  {commandList.map((command) => {
                    const actionType = ACTION_TYPES.find(a => a.value === command.actionType)
                    return (
                      <div
                        key={command.id}
                        className='flex items-center justify-between p-4 border rounded-lg'
                      >
                        <div className='space-y-1 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold'>!{command.commandName}</span>
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            {actionType?.label}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Switch
                            checked={command.enabled}
                            onCheckedChange={() => toggleEnabledMutation.mutate(command)}
                            disabled={
                              !isEnabled ||
                              toggleEnabledMutation.isPending ||
                              deleteMutation.isPending
                            }
                          />
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleEdit(command)}
                            disabled={!isEnabled || deleteMutation.isPending}
                          >
                            <Edit2 className='size-4' />
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => deleteMutation.mutate(command.id)}
                            disabled={!isEnabled || deleteMutation.isPending}
                          >
                            <Trash2 className='size-4 text-destructive' />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {mode !== 'list' && (
          <Card className='border'>
            <CardContent className='space-y-4 pt-3'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='commandName' className='text-base font-semibold'>
                      {t('customCommand:commandNameLabel')}
                    </Label>
                    <Button
                      type='button'
                      variant='ghost'
                      className='h-8 px-2'
                      onClick={() => {
                        setMode('list')
                        setEditingCommand(null)
                        resetForm()
                      }}
                    >
                      <X className='mr-1 size-4' />
                      {t('customCommand:closeButton')}
                    </Button>
                  </div>
                  <Input
                    id='commandName'
                    className='h-11'
                    placeholder={t('customCommand:commandNamePlaceholder')}
                    value={formData.commandName}
                    onChange={(e) => setFormData({ ...formData, commandName: e.target.value })}
                    disabled={!isEnabled || createOrUpdateMutation.isPending}
                  />
                </div>

              </div>

              <div className='space-y-4'>
                <div className='space-y-2'>
                    <Label htmlFor='actionType' className='text-base font-semibold'>{t('customCommand:actionTypeLabel')}</Label>
                    <Select
                      value={formData.actionType.toString()}
                      onValueChange={(value) => setFormData({ ...formData, actionType: parseInt(value) })}
                      disabled={!isEnabled || createOrUpdateMutation.isPending}
                    >
                      <SelectTrigger id='actionType' className='h-11 w-full'>
                        <SelectValue placeholder={t('customCommand:actionTypePlaceholder')}>
                            {ACTION_TYPES.find(a => a.value === formData.actionType)?.label || t('customCommand:actionTypePlaceholder')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((action) => (
                          <SelectItem key={action.value} value={action.value.toString()} className='flex flex-col items-start'>
                            <span className='font-medium'>{action.label}</span>
                            <span className='text-sm text-muted-foreground'>{action.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.actionType === 0 && (
                    <div className='space-y-2'>
                      <Label htmlFor='targetChannelId' className='text-base font-semibold'>{t('customCommand:targetChannelLabel')}</Label>
                      <Select
                        value={formData.targetChannelId || ''}
                        onValueChange={(value) => setFormData({ ...formData, targetChannelId: value })}
                        disabled={!isEnabled || channelsLoading || createOrUpdateMutation.isPending}
                      >
                        <SelectTrigger id='targetChannelId' className='h-11 w-full'>
                          <SelectValue placeholder={channelsLoading ? t('customCommand:channelsLoading') : t('customCommand:channelSelectPlaceholder')}>
                            {formData.targetChannelId && channels.find((c) => c.id === formData.targetChannelId) && (
                              <div className='flex items-center gap-2'>
                                <span className='text-lg'>#</span>
                                <span>{channels.find((c) => c.id === formData.targetChannelId)?.name}</span>
                                {channels.find((c) => c.id === formData.targetChannelId)?.nsfw && (
                                  <span className='text-xs text-muted-foreground'>(NSFW)</span>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SearchableSelectContent
                          className='max-h-[300px]'
                          items={channels.map((c) => ({
                            value: c.id,
                            label: c.nsfw ? `# ${c.name} (NSFW)` : `# ${c.name}`,
                          }))}
                          searchPlaceholder={t('customCommand:channelSearchPlaceholder')}
                          loading={channelsLoading}
                        />
                      </Select>
                    </div>
                  )}

                  {(formData.actionType === 0 || formData.actionType === 1) && (
                    <div className='space-y-2'>
                      <Label htmlFor='message' className='text-base font-semibold'>{t('customCommand:messageLabel')}</Label>
                      <Textarea
                        id='message'
                        className='min-h-[100px] text-base resize-none'
                        placeholder={t('customCommand:messagePlaceholder')}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        disabled={!isEnabled || createOrUpdateMutation.isPending}
                        rows={4}
                      />
                    </div>
                  )}

                  {(formData.actionType === 2 || formData.actionType === 3) && (
                    <div className='space-y-2'>
                      <Label htmlFor='roleId' className='text-base font-semibold'>{t('customCommand:roleSelectLabel')}</Label>
                      <Select
                        value={formData.roleId || ''}
                        onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                        disabled={!isEnabled || rolesLoading || createOrUpdateMutation.isPending}
                      >
                        <SelectTrigger id='roleId' className='h-11 w-full'>
                          <SelectValue placeholder={rolesLoading ? t('customCommand:rolesLoading') : t('customCommand:roleSelectPlaceholder')}>
                            {formData.roleId && roles.find((r) => r.id === formData.roleId) && (
                              <div className='flex items-center gap-2'>
                                <div
                                  className='size-4 rounded-full border-2 border-background'
                                  style={{
                                    backgroundColor: getRoleColor(
                                      roles.find((r) => r.id === formData.roleId)?.color || 0
                                    ),
                                  }}
                                />
                                <span>{roles.find((r) => r.id === formData.roleId)?.name}</span>
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
                          searchPlaceholder={t('customCommand:roleSearchPlaceholder')}
                          loading={rolesLoading}
                        />
                      </Select>
                    </div>
                  )}
              </div>

              <div className='flex gap-2 border-t pt-4'>
                <Button
                  onClick={handleSubmit}
                  size='lg'
                  className='min-w-[140px] h-11 text-base font-semibold flex-1'
                  disabled={!isEnabled || createOrUpdateMutation.isPending}
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      {editingCommand ? t('customCommand:updating') : t('customCommand:creating')}
                    </>
                  ) : (
                    editingCommand ? t('customCommand:updateButton') : t('customCommand:createButton')
                  )}
                </Button>
                {editingCommand && (
                  <Button
                    variant='outline'
                    size='lg'
                    className='h-11'
                    onClick={() => {
                      setEditingCommand(null)
                      resetForm()
                    }}
                    disabled={createOrUpdateMutation.isPending}
                  >
                    {t('customCommand:cancelButton')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </Main>
    </>
  )
}
