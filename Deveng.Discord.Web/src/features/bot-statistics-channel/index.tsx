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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { statisticsChannelApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Loader2, Save, X, Plus, Trash2, ChevronUp } from 'lucide-react'
import type { StatisticsChannelDto } from '@/lib/api'

export function BotStatisticsChannel() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [selectedCounterType, setSelectedCounterType] = React.useState<string>('')
  const [channelNameFormat, setChannelNameFormat] = React.useState<string>('{kind}: {count}')
  const [enabled, setEnabled] = React.useState<boolean>(true)
  const [roleIds, setRoleIds] = React.useState<string[]>([''])
  const [editingChannel, setEditingChannel] = React.useState<StatisticsChannelDto | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false)

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'statistics', featureDisplayName: t('nav:statisticsChannels') })

  const COUNTER_TYPES = React.useMemo(
    () => [
      { value: 'Botlar', label: t('statisticsChannel:counterTypeBots') },
      { value: 'Üye Sayısı', label: t('statisticsChannel:counterTypeMemberCount') },
      { value: 'Rekor Çevrimiçi', label: t('statisticsChannel:counterTypeRecordOnline') },
      { value: 'Çevrimiçi Üye', label: t('statisticsChannel:counterTypeOnlineMembers') },
      { value: 'Metin Kanalları', label: t('statisticsChannel:counterTypeTextChannels') },
      { value: 'Toplam Kanal Sayısı', label: t('statisticsChannel:counterTypeTotalChannels') },
      { value: 'Toplam Üye', label: t('statisticsChannel:counterTypeTotalMembers') },
      { value: 'Toplam Rol Sayısı', label: t('statisticsChannel:counterTypeTotalRoles') },
      { value: 'Ses Kanalları', label: t('statisticsChannel:counterTypeVoiceChannels') },
      { value: 'Rol Sayacı', label: t('statisticsChannel:counterTypeRoleCounter') },
    ],
    [t]
  )

  // Mevcut istatistik kanallarını getir
  const { data: channels, isLoading } = useQuery({
    queryKey: ['statisticsChannels', guildId],
    queryFn: () => statisticsChannelApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  const savedCounterTypeKeys = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of channels ?? []) {
      if (c.counterType) set.add(c.counterType)
    }
    return set
  }, [channels])

  /** Yeni sayaç eklerken listede yalnızca sunucuda henüz olmayan türler */
  const availableCounterTypes = React.useMemo(
    () => COUNTER_TYPES.filter((ct) => !savedCounterTypeKeys.has(ct.value)),
    [COUNTER_TYPES, savedCounterTypeKeys]
  )

  React.useEffect(() => {
    if (!isDialogOpen || editingChannel) return
    if (selectedCounterType && savedCounterTypeKeys.has(selectedCounterType)) {
      setSelectedCounterType('')
    }
  }, [isDialogOpen, editingChannel, selectedCounterType, savedCounterTypeKeys])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      guildId: string
      counterType: string
      channelId: string
      channelNameFormat?: string
      enabled: boolean
      roleIds?: string[]
    }) =>
      statisticsChannelApi.create({
        guildId: data.guildId,
        counterType: data.counterType,
        channelId: data.channelId,
        channelName: data.channelNameFormat?.trim() || undefined,
        enabled: data.enabled,
        roleIds: data.counterType === 'Rol Sayacı' ? data.roleIds?.filter(id => id.trim()) : undefined,
      }),
    onSuccess: () => {
      toast.success(t('statisticsChannel:created'))
      queryClient.invalidateQueries({ queryKey: ['statisticsChannels', guildId] })
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number
      channelId?: string
      channelName?: string
      enabled?: boolean
      roleIds?: string[]
    }) =>
      statisticsChannelApi.update(guildId, data.id, {
        channelId: data.channelId,
        channelName: data.channelName,
        enabled: data.enabled,
        roleIds: data.roleIds?.filter(id => id.trim()),
      }),
    onSuccess: () => {
      toast.success(t('statisticsChannel:updated'))
      queryClient.invalidateQueries({ queryKey: ['statisticsChannels', guildId] })
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => statisticsChannelApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('statisticsChannel:deleted'))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || t('common:anErrorOccurred'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['statisticsChannels'] })
    },
  })

  const resetForm = () => {
    setSelectedCounterType('')
    setChannelNameFormat('{kind}: {count}')
    setEnabled(true)
    setRoleIds([''])
    setEditingChannel(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (channel: StatisticsChannelDto) => {
    setEditingChannel(channel)
    setSelectedCounterType(channel.counterType)
    setChannelNameFormat(channel.channelName?.trim() || '{kind}: {count}')
    setEnabled(channel.enabled)
    if (channel.counterType === 'Rol Sayacı' && channel.roles) {
      setRoleIds(channel.roles.map(r => r.roleId))
    } else {
      setRoleIds([''])
    }
    setIsDialogOpen(true)
  }

  const handleNewCounter = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCounterType) {
      toast.error(t('statisticsChannel:selectCounterType'))
      return
    }

    if (editingChannel) {
      updateMutation.mutate({
        id: editingChannel.id,
        channelId: editingChannel.channelId, // Mevcut kanal ID'sini kullan
        channelName: channelNameFormat?.trim() || undefined,
        enabled,
        roleIds: selectedCounterType === 'Rol Sayacı' ? roleIds?.filter(id => id.trim()) : undefined,
      })
    } else {
      // Aynı tip sayaç zaten var mı kontrol et
      const existing = channels?.find(c => c.counterType === selectedCounterType)
      if (existing) {
        toast.error(t('statisticsChannel:counterTypeExists'))
        return
      }

      createMutation.mutate({
        guildId,
        counterType: selectedCounterType,
        channelId: '', // Bot otomatik oluşturacak - boş string gönder, API IsNullOrWhiteSpace ile kontrol edecek
        channelNameFormat,
        enabled,
        roleIds: selectedCounterType === 'Rol Sayacı' ? roleIds?.filter(id => id.trim()) : undefined,
      })
    }
  }

  const handleAddRole = () => {
    setRoleIds([...roleIds, ''])
  }

  const handleRemoveRole = (index: number) => {
    setRoleIds(roleIds.filter((_, i) => i !== index))
  }

  const handleRoleChange = (index: number, value: string) => {
    const newRoleIds = [...roleIds]
    newRoleIds[index] = value
    setRoleIds(newRoleIds)
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
          {/* Başlık Bölümü - MEE6 Tarzı */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('statisticsChannel:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('statisticsChannel:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='statistics'
              featureDisplayName={t('statisticsChannel:pageTitle')}
              confirmDescription={t('statisticsChannel:disableConfirmDescription')}
            />
          </div>

          {/* Temel Sayaçlar Bölümü */}
          <Card className='border'>
            <CardHeader className='pb-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-2xl'>{t('statisticsChannel:basicCountersTitle')}</CardTitle>
                  <ChevronUp className='size-5 text-muted-foreground' />
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {channels && channels.length > 0 ? (
                channels.map((channel) => {
                  // Kanal adını formatla (örnek: "Metin Kanalı: 19")
                  const getDisplayName = () => {
                    const emojiMap: Record<string, string> = {
                      'Botlar': '🤖',
                      'Üye Sayısı': '👥',
                      'Rekor Çevrimiçi': '📊',
                      'Çevrimiçi Üye': '🟢',
                      'Metin Kanalları': '💬',
                      'Toplam Kanal Sayısı': '📁',
                      'Toplam Üye': '👥',
                      'Toplam Rol Sayısı': '🎭',
                      'Ses Kanalları': '🔊',
                      'Rol Sayacı': '👤',
                    }
                    const emoji = emojiMap[channel.counterType] || '📊'
                    return `${emoji} ${channel.counterType}`
                  }
                  
                  return (
                    <div
                      key={channel.id}
                      className='flex items-center justify-between rounded-lg border p-4'
                    >
                      <div className='space-y-1'>
                        <p className='font-medium'>{getDisplayName()}</p>
                        <p className='text-sm text-muted-foreground'>
                          {t('statisticsChannel:channelIdLabel', { id: channel.channelId })}
                        </p>
                        {channel.counterType === 'Rol Sayacı' && channel.roles && (
                          <p className='text-sm text-muted-foreground'>
                            {t('statisticsChannel:rolesCountLabel', { count: channel.roles.length })}
                          </p>
                        )}
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEdit(channel)}
                        >
                          {t('statisticsChannel:edit')}
                        </Button>
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => {
                            if (confirm(t('statisticsChannel:deleteConfirm'))) {
                              deleteMutation.mutate(channel.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className='size-4 animate-spin' />
                          ) : (
                            <Trash2 className='size-4' />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className='text-sm text-muted-foreground'>
                  {t('statisticsChannel:emptyState')}
                </p>
              )}
              
              <Button
                onClick={handleNewCounter}
                className='w-full'
                disabled={availableCounterTypes.length === 0}
              >
                <Plus className='mr-2 size-4' />
                {t('statisticsChannel:addNewCounter')}
              </Button>
              {availableCounterTypes.length === 0 && (
                <p className='text-center text-sm text-muted-foreground'>
                  {t('statisticsChannel:allCounterTypesDefined')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Yeni Sayaç Ekleme/Düzenleme Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-[500px]'>
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? t('statisticsChannel:dialogEditTitle') : t('statisticsChannel:dialogNewTitle')}
              </DialogTitle>
              <DialogDescription>
                {editingChannel
                  ? t('statisticsChannel:dialogEditDescription')
                  : t('statisticsChannel:dialogNewDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='counterType'>{t('statisticsChannel:counterLabel')}</Label>
                <Select
                  value={selectedCounterType}
                  onValueChange={setSelectedCounterType}
                  disabled={!!editingChannel || (!editingChannel && availableCounterTypes.length === 0)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('statisticsChannel:counterPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(editingChannel ? COUNTER_TYPES : availableCounterTypes).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!editingChannel && availableCounterTypes.length === 0 && (
                  <p className='text-sm text-muted-foreground'>{t('statisticsChannel:noMoreCounterTypes')}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='channelNameFormat'>{t('statisticsChannel:channelNameLabel')}</Label>
                <p className='text-sm text-muted-foreground'>
                  {t('statisticsChannel:channelNameHelp')}
                </p>
                <Input
                  id='channelNameFormat'
                  value={channelNameFormat}
                  onChange={(e) => setChannelNameFormat(e.target.value)}
                  placeholder='{kind}: {count}'
                />
              </div>

              <div className='flex items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <Label>{t('statisticsChannel:activeLabel')}</Label>
                  <p className='text-sm text-muted-foreground'>
                    {t('statisticsChannel:activeHelp')}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {selectedCounterType === 'Rol Sayacı' && (
                <div className='space-y-2'>
                  <Label>{t('statisticsChannel:rolesLabel')}</Label>
                  <p className='text-sm text-muted-foreground'>
                    {t('statisticsChannel:rolesHelp')}
                  </p>
                  {roleIds.map((roleId, index) => (
                    <div key={index} className='flex gap-2'>
                      <Input
                        value={roleId}
                        onChange={(e) => handleRoleChange(index, e.target.value)}
                        placeholder={t('statisticsChannel:roleIdPlaceholder')}
                      />
                      {roleIds.length > 1 && (
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => handleRemoveRole(index)}
                        >
                          <X className='size-4' />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddRole}
                    className='w-full'
                  >
                    <Plus className='mr-2 size-4' />
                    {t('statisticsChannel:addRole')}
                  </Button>
                </div>
              )}

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={resetForm}
                >
                  {t('statisticsChannel:close')}
                </Button>
                <Button
                  type='submit'
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  )}
                  <Save className='mr-2 size-4' />
                  {t('statisticsChannel:save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}

