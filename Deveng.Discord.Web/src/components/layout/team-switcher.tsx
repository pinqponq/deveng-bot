import * as React from 'react'
import { useMemo } from 'react'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigate } from '@tanstack/react-router'
import { guildApi } from '@/lib/api'

type TeamSwitcherProps = {
  teams?: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
  fallbackSelectedGuild?: { id: string; name: string; icon: string | null; iconUrl?: string } | null
}

type ActiveTeamType = {
  id: string
  name: string
  icon: string | null | undefined
}

export function TeamSwitcher({ teams: _teams, fallbackSelectedGuild }: TeamSwitcherProps) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const discordGuilds = auth.user?.discord?.guilds || []
  const selectedGuild = auth.selectedGuild ?? fallbackSelectedGuild ?? null

  const { data: botGuilds = [], isLoading: isLoadingBotGuilds } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => guildApi.getAll(),
  })
  const botGuildIds = useMemo(
    () => new Set(botGuilds.map((g) => g.guildId)),
    [botGuilds]
  )
  const manageableGuilds = useMemo(
    () => discordGuilds.filter((g) => botGuildIds.has(g.id)),
    [discordGuilds, botGuildIds]
  )

  const [activeTeam, setActiveTeam] = React.useState<ActiveTeamType | null>(
    selectedGuild
      ? {
          id: selectedGuild.id,
          name: selectedGuild.name,
          icon: selectedGuild.iconUrl,
        }
      : null
  )

  React.useEffect(() => {
    if (isLoadingBotGuilds) return
    if (selectedGuild && !botGuildIds.has(selectedGuild.id) && auth.selectedGuild) {
      auth.setSelectedGuild(null)
    }
  }, [selectedGuild, botGuildIds, auth, isLoadingBotGuilds])

  React.useEffect(() => {
    if (selectedGuild) {
      setActiveTeam({
        id: selectedGuild.id,
        name: selectedGuild.name,
        icon: selectedGuild.iconUrl,
      })
    } else {
      setActiveTeam(null)
    }
  }, [selectedGuild])

  const handleGuildSelect = React.useCallback(
    (guild: {
      id: string
      name: string
      icon: string | null
      iconUrl?: string | null
    }) => {
      auth.setSelectedGuild({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl: guild.iconUrl || undefined,
      })
      setActiveTeam({
        id: guild.id,
        name: guild.name,
        icon: guild.iconUrl || undefined,
      })
      navigate({ to: '/dashboard/$guildId', params: { guildId: guild.id } })
    },
    [auth, navigate]
  )

  const hasManageableGuilds = manageableGuilds.length > 0
  if (!hasManageableGuilds && !isLoadingBotGuilds) {
    return null
  }

  // Sunucu seçili değil ama yönetilebilir sunucu var: seçim menüsü (yan panel boş kalmasın)
  if ((!selectedGuild || !activeTeam) && hasManageableGuilds) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <div className='bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg border border-dashed'>
                  <Plus className='size-4' />
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>Sunucu seçin</span>
                  <span className='text-muted-foreground truncate text-xs'>Panel menüsü için</span>
                </div>
                <ChevronsUpDown className='ms-auto' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              align='start'
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className='text-muted-foreground text-xs'>Sunucular</DropdownMenuLabel>
              {manageableGuilds.map((guild) => (
                <DropdownMenuItem
                  key={guild.id}
                  className='gap-2 p-2'
                  onClick={() => handleGuildSelect(guild)}
                >
                  <Avatar className='size-6 rounded-sm'>
                    <AvatarImage
                      src={
                        guild.iconUrl ||
                        (guild.icon
                          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
                          : undefined)
                      }
                      alt={guild.name}
                    />
                    <AvatarFallback className='rounded-sm'>
                      {guild.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className='truncate'>{guild.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className='gap-2 p-2' onClick={() => navigate({ to: '/select-server' })}>
                <div className='bg-background flex size-6 items-center justify-center rounded-md border'>
                  <Plus className='size-4' />
                </div>
                <div className='text-muted-foreground font-medium'>Sunucu Değiştir</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!selectedGuild || !activeTeam) {
    return null
  }

  const displayGuild = manageableGuilds.find((g) => g.id === activeTeam.id) || selectedGuild
  
  const displayGuildIconUrl: string | undefined = displayGuild.iconUrl 
    ? displayGuild.iconUrl 
    : displayGuild.icon
      ? `https://cdn.discordapp.com/icons/${displayGuild.id}/${displayGuild.icon}.png?size=256`
      : undefined

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='size-8 rounded-lg'>
                <AvatarImage
                  src={displayGuildIconUrl}
                  alt={displayGuild.name}
                />
                <AvatarFallback className='rounded-lg'>
                  {displayGuild.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {displayGuild.name}
                </span>
                <span className='truncate text-xs'>Discord Sunucusu</span>
              </div>
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              Sunucular
            </DropdownMenuLabel>
            {manageableGuilds.map((guild) => (
              <DropdownMenuItem
                key={guild.id}
                onClick={() => handleGuildSelect(guild)}
                className='gap-2 p-2'
              >
                <Avatar className='size-6 rounded-sm'>
                  <AvatarImage
                    src={
                      guild.iconUrl ||
                      (guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
                        : undefined)
                    }
                    alt={guild.name}
                  />
                  <AvatarFallback className='rounded-sm'>
                    {guild.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className='truncate'>{guild.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='gap-2 p-2'
              onClick={() => navigate({ to: '/select-server' })}
            >
              <div className='bg-background flex size-6 items-center justify-center rounded-md border'>
                <Plus className='size-4' />
              </div>
              <div className='text-muted-foreground font-medium'>
                Sunucu Değiştir
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
