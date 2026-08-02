import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { guildApi } from '@/lib/api'
import { getBotInviteUrl } from '@/lib/env'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Server, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { canManageDiscordGuild } from '@/utils/discord-guild-permissions'

export const Route = createFileRoute('/_authenticated/select-server')({
  component: SelectServer,
})

function SelectServer() {
  const { t } = useTranslation(['apps', 'common'])
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const allGuilds = auth.user?.discord?.guilds || []

  const { data: botGuilds = [], isPending: isBotGuildsLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => guildApi.getAll(),
  })

  const botGuildIds = useMemo(
    () => new Set(botGuilds.map((g) => g.guildId)),
    [botGuilds]
  )

  // Sadece yönetilebilir sunucuları filtrele, icon URL ve bot durumu ekle
  const guilds = useMemo(
    () =>
      allGuilds
        .filter((guild) => canManageDiscordGuild(guild.permissions, guild.owner))
        .map((guild) => ({
          ...guild,
          hasBot: botGuildIds.has(guild.id),
          iconUrl:
            guild.iconUrl ||
            (guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
              : undefined),
        })),
    [allGuilds, botGuildIds]
  )

  const handleSelectServer = async (guild: {
    id: string
    name: string
    icon: string | null
    iconUrl?: string | null
  }) => {
    setLoading(true)
    try {
      // Seçilen sunucuyu store'a kaydet
      auth.setSelectedGuild({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl: guild.iconUrl || undefined,
      })

      toast.success(t('apps:serverSelected'), {
        description: `${guild.name} ${t('apps:redirecting')}`,
      })

      // Ana sayfaya yönlendir
      setTimeout(() => {
        navigate({ to: '/dashboard/$guildId', params: { guildId: guild.id }, replace: true })
      }, 500)
    } catch (error) {
      console.error('Server selection error:', error)
      toast.error(t('apps:serverSelectError'))
      setLoading(false)
    }
  }

  if (guilds.length === 0 && !isBotGuildsLoading) {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>{t('apps:noServerFound')}</CardTitle>
            <CardDescription>
              {t('apps:noServerDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate({ to: '/sign-in' })}
              variant='outline'
              className='w-full'
            >
              {t('apps:signInAgain')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4'>
      <div className='w-full max-w-4xl space-y-6'>
        <div className='text-center space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>
            {t('apps:selectServer')}
          </h1>
          <p className='text-muted-foreground'>
            {t('apps:selectServerDescription')}
          </p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {guilds.map((guild) => (
            <Card
              key={guild.id}
              className={
                !isBotGuildsLoading && guild.hasBot
                  ? 'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50'
                  : 'transition-all hover:shadow-md'
              }
              onClick={() =>
                !isBotGuildsLoading && guild.hasBot && !loading && handleSelectServer(guild)
              }
            >
              <CardHeader>
                <div className='flex items-center gap-4'>
                  <Avatar className='size-12'>
                    <AvatarImage
                      src={
                        guild.iconUrl ||
                        (guild.icon
                          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
                          : undefined)
                      }
                      alt={guild.name}
                    />
                    <AvatarFallback>
                      {guild.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1 min-w-0'>
                    <CardTitle className='truncate'>{guild.name}</CardTitle>
                    <CardDescription className='truncate'>
                      {isBotGuildsLoading
                        ? t('common:loading')
                        : guild.hasBot
                          ? t('common:botAdded')
                          : t('common:botNotAdded')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isBotGuildsLoading ? (
                  <Button variant='outline' className='w-full' disabled>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    {t('common:loading')}
                  </Button>
                ) : guild.hasBot ? (
                  <Button
                    variant='outline'
                    className='w-full !bg-white !text-black hover:!bg-gray-100 dark:!bg-white dark:hover:!bg-gray-100 dark:!text-black border border-gray-300 dark:border-gray-500'
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectServer(guild)
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        {t('apps:redirecting')}
                      </>
                    ) : (
                      <>
                        <Server className='mr-2 size-4' />
                        {t('apps:manageServer')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(getBotInviteUrl(guild.id), '_blank', 'noopener,noreferrer')
                    }}
                  >
                    <Bot className='mr-2 size-4' />
                    {t('common:addBot')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
