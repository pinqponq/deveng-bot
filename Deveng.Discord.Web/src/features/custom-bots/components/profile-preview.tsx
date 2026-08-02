import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const PRESENCE_COLORS: Record<string, string> = {
  online: 'bg-[#23a559]',
  idle: 'bg-[#f0b232]',
  dnd: 'bg-[#f23f43]',
  invisible: 'bg-[#80848e]',
}

function activityLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'Streaming':
      return t('activityStreaming')
    case 'Listening':
      return t('activityListening')
    case 'Watching':
      return t('activityWatching')
    case 'Competing':
      return t('activityCompeting')
    default:
      return t('activityPlaying')
  }
}

type ProfilePreviewProps = {
  botName: string
  clientId: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  presenceStatus: string
  activityType: string
  activityText?: string
}

export function CustomBotProfilePreview({
  botName,
  clientId,
  avatarUrl,
  bannerUrl,
  presenceStatus,
  activityType,
  activityText,
}: ProfilePreviewProps) {
  const { t } = useTranslation('customBots')
  const displayName = botName.trim() || t('defaultBotName')
  const statusColor = PRESENCE_COLORS[presenceStatus] ?? PRESENCE_COLORS.online
  const activityPrefix = activityLabel(activityType, t)
  const activityDisplay = activityText?.trim() || '/help'

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='mb-1 text-sm font-semibold'>{t('memberListPreview')}</h3>
        <div className='rounded-lg bg-[#2b2d31] p-3'>
          <div className='flex items-center gap-2.5'>
            <div className='relative shrink-0'>
              {avatarUrl ? (
                <img src={avatarUrl} alt='' className='size-8 rounded-full object-cover' />
              ) : (
                <div className='flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white'>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#2b2d31]',
                  statusColor
                )}
              />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-1.5'>
                <span className='truncate text-sm font-medium text-[#f2f3f5]'>{displayName}</span>
                <span className='rounded bg-[#5865f2] px-1 py-0.5 text-[10px] font-semibold text-white'>
                  APP
                </span>
              </div>
              <p className='truncate text-xs text-[#b5bac1]'>{activityDisplay}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className='mb-1 text-sm font-semibold'>{t('profilePreview')}</h3>
        <div className='overflow-hidden rounded-lg bg-[#232428]'>
          <div
            className='h-16 bg-gradient-to-r from-[#5865f2] to-[#7289da]'
            style={
              bannerUrl
                ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          />
          <div className='relative px-4 pb-4'>
            <div className='-mt-8 mb-2'>
              <div className='relative inline-block'>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=''
                    className='size-16 rounded-full border-4 border-[#232428] object-cover'
                  />
                ) : (
                  <div className='flex size-16 items-center justify-center rounded-full border-4 border-[#232428] bg-[#5865f2] text-xl font-bold text-white'>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={cn(
                    'absolute bottom-1 right-1 size-4 rounded-full border-4 border-[#232428]',
                    statusColor
                  )}
                />
              </div>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='text-base font-semibold text-[#f2f3f5]'>{displayName}</span>
              <span className='rounded bg-[#5865f2] px-1 py-0.5 text-[10px] font-semibold text-white'>
                APP
              </span>
            </div>
            <p className='text-xs text-[#b5bac1]'>
              {displayName}#{clientId.slice(-4).padStart(4, '0')}
            </p>
            <div className='mt-3 rounded-md bg-[#111214] px-3 py-2'>
              <p className='text-xs text-[#b5bac1]'>{activityPrefix}</p>
              <p className='text-sm font-semibold text-[#f2f3f5]'>{activityDisplay}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
