import { type ChangeEvent, useState, useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, ArrowUpAZ, ArrowDownAZ, Server, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Main } from '@/components/layout/main'
import { useAuthStore } from '@/stores/auth-store'
import { guildApi } from '@/lib/api'

import { getBotInviteUrl } from '@/lib/env'
import { canManageDiscordGuild } from '@/utils/discord-guild-permissions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const route = getRouteApi('/_authenticated/apps/')

export function Apps() {
  const { t } = useTranslation(['apps', 'common'])
  const {
    filter = '',
    sort: initSort = 'asc',
  } = route.useSearch()
  const navigate = route.useNavigate()
  const { auth } = useAuthStore()
  const discordGuilds = auth.user?.discord?.guilds || []

  const { data: botGuilds = [], isPending: isBotGuildsLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => guildApi.getAll(),
  })

  const botGuildIds = useMemo(() => new Set(botGuilds.map((g) => g.guildId)), [botGuilds])

  const [sort, setSort] = useState(initSort)
  const [searchTerm, setSearchTerm] = useState(filter)

  // Sadece yönetilebilir sunucuları filtrele, bot durumuna göre kart oluştur
  const serverApps = useMemo(
    () =>
      discordGuilds
        .filter((guild) => canManageDiscordGuild(guild.permissions, guild.owner))
        .map((guild) => {
          const iconUrl =
            guild.iconUrl ||
            (guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
              : undefined)
          return {
            id: guild.id,
            name: guild.name,
            hasBot: botGuildIds.has(guild.id),
            iconUrl,
            permissions: guild.permissions ?? 0,
          }
        }),
    [discordGuilds, botGuildIds]
  )

  // Bot ekli olanlar önce, sonra isim sırası (arama filtresi uygulanır)
  const filteredApps = serverApps
    .filter((app) =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!isBotGuildsLoading && a.hasBot !== b.hasBot) return a.hasBot ? -1 : 1
      return sort === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    })

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    navigate({
      search: {
        filter: value || undefined,
        sort: sort || undefined,
      },
    })
  }


  const handleSortChange = (newSort: 'asc' | 'desc') => {
    setSort(newSort)
    navigate({
      search: {
        filter: searchTerm || undefined,
        sort: newSort || undefined,
      },
    })
  }

  return (
    <>
      {/* ===== Content ===== */}
      <Main fixed>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('apps:serversTitle')}
          </h1>
          <p className='text-muted-foreground'>
            {t('apps:serversDescription')}
          </p>
        </div>
        <div className='my-4 flex items-end justify-between sm:my-0 sm:items-center'>
          <div className='flex flex-col gap-4 sm:my-4 sm:flex-row'>
            <Input
              placeholder={t('common:searchServer')}
              className='h-9 w-40 lg:w-[250px]'
              value={searchTerm}
              onChange={handleSearch}
            />
            {/* Filtreleme kaldırıldı - sadece yönetilebilir sunucular gösteriliyor */}
          </div>

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className='w-16'>
              <SelectValue>
                <SlidersHorizontal size={18} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent align='end'>
              <SelectItem value='asc'>
                <div className='flex items-center gap-4'>
                  <ArrowUpAZ size={16} />
                  <span>{t('common:ascending')}</span>
                </div>
              </SelectItem>
              <SelectItem value='desc'>
                <div className='flex items-center gap-4'>
                  <ArrowDownAZ size={16} />
                  <span>{t('common:descending')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className='shadow-sm' />
        {serverApps.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <Server className='text-muted-foreground mb-4 size-16' />
            <h3 className='text-lg font-semibold'>{t('apps:noServerFound')}</h3>
            <p className='text-muted-foreground mt-2 text-sm'>
              {t('apps:noServerDescription')}
            </p>
          </div>
        ) : (
          <ul className='faded-bottom no-scrollbar grid grid-cols-1 gap-4 overflow-auto pt-4 pb-16 md:grid-cols-3'>
            {filteredApps.map((app) => (
              <li
                key={app.id}
                className={
                  !isBotGuildsLoading && app.hasBot
                    ? 'cursor-pointer rounded-xl border bg-card/80 p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40'
                    : 'rounded-xl border bg-card/80 p-4 shadow-sm transition-all hover:shadow-md'
                }
                onClick={() => {
                  if (isBotGuildsLoading || !app.hasBot) return
                  auth.setSelectedGuild({
                    id: app.id,
                    name: app.name,
                    icon: null,
                    iconUrl: app.iconUrl,
                  })
                  navigate({ to: '/dashboard/$guildId', params: { guildId: app.id }, search: {} })
                }}
              >
                <div className='flex items-center gap-4'>
                  <Avatar className='size-12 shrink-0 rounded-xl ring-1 ring-border/50'>
                    <AvatarImage src={app.iconUrl} alt={app.name} />
                    <AvatarFallback className='rounded-xl bg-muted text-sm font-semibold'>
                      {app.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <h2 className='truncate font-semibold' title={app.name}>
                      {app.name}
                    </h2>
                  </div>
                  <div className='flex shrink-0 items-center gap-1.5'>
                    {isBotGuildsLoading ? (
                      <Button
                        size='sm'
                        variant='secondary'
                        className='shrink-0'
                        disabled
                      >
                        <Loader2 className='mr-1 size-3.5 animate-spin' />
                        {t('common:loading')}
                      </Button>
                    ) : app.hasBot ? (
                      <Button
                        size='sm'
                        className='shrink-0'
                        onClick={(e) => {
                          e.stopPropagation()
                          auth.setSelectedGuild({
                            id: app.id,
                            name: app.name,
                            icon: null,
                            iconUrl: app.iconUrl,
                          })
                          navigate({ to: '/dashboard/$guildId', params: { guildId: app.id }, search: {} })
                        }}
                      >
                        {t('apps:manage')}
                      </Button>
                    ) : (
                      <Button
                        variant='secondary'
                        size='sm'
                        className='shrink-0'
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(getBotInviteUrl(app.id), '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <Bot className='mr-1 size-3.5' />
                        {t('common:addBot')}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Main>
    </>
  )
}
