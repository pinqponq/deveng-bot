import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { customBotApi, type CustomBotDto } from '@/lib/api'
import { ImageUploadTile } from './image-upload-tile'
import { CustomBotProfilePreview } from './profile-preview'

const AVATAR_MAX_BYTES = 256 * 1024
const BANNER_MAX_BYTES = 512 * 1024

const PRESENCE_OPTIONS = ['online', 'idle', 'dnd', 'invisible'] as const
const ACTIVITY_OPTIONS = ['Playing', 'Listening', 'Watching', 'Streaming', 'Competing'] as const

type CustomBotPersonalizerFormProps = {
  bot: CustomBotDto
}

export function CustomBotPersonalizerForm({ bot }: CustomBotPersonalizerFormProps) {
  const { t } = useTranslation('customBots')
  const queryClient = useQueryClient()

  const [botName, setBotName] = useState(bot.botName ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(bot.avatarUrl ?? null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(bot.bannerUrl ?? null)
  const [presenceStatus, setPresenceStatus] = useState(bot.presenceStatus || 'online')
  const [activityType, setActivityType] = useState(bot.activityType || 'Playing')
  const [activityText, setActivityText] = useState(bot.activityText ?? '')
  const [personalizationEnabled, setPersonalizationEnabled] = useState(bot.personalizationEnabled)

  useEffect(() => {
    setBotName(bot.botName ?? '')
    setAvatarUrl(bot.avatarUrl ?? null)
    setBannerUrl(bot.bannerUrl ?? null)
    setPresenceStatus(bot.presenceStatus || 'online')
    setActivityType(bot.activityType || 'Playing')
    setActivityText(bot.activityText ?? '')
    setPersonalizationEnabled(bot.personalizationEnabled)
  }, [bot])

  const saveMutation = useMutation({
    mutationFn: () =>
      customBotApi.updatePersonalization(bot.id, {
        botName: botName.trim() || undefined,
        avatarUrl,
        bannerUrl,
        presenceStatus,
        activityType,
        activityText: activityText.trim() || null,
        personalizationEnabled,
      }),
    onSuccess: async (updated) => {
      queryClient.invalidateQueries({ queryKey: ['customBots'] })
      toast.success(t('personalizationSaved'))

      if (updated.status === 'Active' && updated.personalizationEnabled) {
        try {
          const result = await customBotApi.applyProfile(bot.id)
          if (result.warnings?.length) {
            result.warnings.forEach((w) => toast.warning(w))
          }
          if (result.success) {
            toast.success(t('personalizationApplied'))
          } else if (result.error) {
            toast.error(result.error)
          }
        } catch {
          // apply-profile PUT içinde de tetikleniyor; sessizce geç
        }
      }
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        error.response?.data?.message || error.message || t('personalizationSaveFailed')
      )
    },
  })

  return (
    <div className='grid gap-6 xl:grid-cols-[minmax(200px,240px)_1fr_minmax(260px,320px)]'>
      <div className='space-y-4'>
        <ImageUploadTile
          label={t('icon')}
          value={avatarUrl}
          onChange={setAvatarUrl}
          maxSizeBytes={AVATAR_MAX_BYTES}
          aspectClass='aspect-square max-w-[200px]'
        />
        <ImageUploadTile
          label={t('banner')}
          value={bannerUrl}
          onChange={setBannerUrl}
          maxSizeBytes={BANNER_MAX_BYTES}
          aspectClass='aspect-[5/2] max-w-[200px]'
          placeholderText={t('clickToUploadBanner')}
        />
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5'>
          <div>
            <p className='text-sm font-medium'>{t('enablePersonalizer')}</p>
            <p className='text-muted-foreground text-xs'>{t('enablePersonalizerHint')}</p>
          </div>
          <Switch checked={personalizationEnabled} onCheckedChange={setPersonalizationEnabled} />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='personalizerBotName'>{t('botName')}</Label>
          <Input
            id='personalizerBotName'
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            maxLength={32}
            placeholder={t('botNamePlaceholder')}
            className='h-11'
          />
        </div>

        <div className='space-y-2'>
          <Label>{t('botStatus')}</Label>
          <Select value={presenceStatus} onValueChange={setPresenceStatus}>
            <SelectTrigger className='h-11'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESENCE_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`presence_${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label>{t('activityType')}</Label>
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className='h-11'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`activityType_${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='activityText'>{t('statusText')}</Label>
          <Input
            id='activityText'
            value={activityText}
            onChange={(e) => setActivityText(e.target.value)}
            maxLength={128}
            placeholder='/help'
            className='h-11'
          />
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className='w-full sm:w-auto sm:min-w-48'
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className='mr-2 size-4 animate-spin' />
              {t('saving')}
            </>
          ) : (
            t('saveAndApply')
          )}
        </Button>
      </div>

      <div className='xl:sticky xl:top-4 xl:self-start'>
        <CustomBotProfilePreview
          botName={botName}
          clientId={bot.clientId}
          avatarUrl={avatarUrl}
          bannerUrl={bannerUrl}
          presenceStatus={presenceStatus}
          activityType={activityType}
          activityText={activityText}
        />
      </div>
    </div>
  )
}
