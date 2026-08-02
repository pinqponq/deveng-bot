import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { TeamSwitcher } from './team-switcher'
import { useAuthStore } from '@/stores/auth-store'
import { useGuildFeatures } from '@/hooks/use-guild-features'
import { Link, useRouterState } from '@tanstack/react-router'
import { resolveNavUrl } from '@/utils/nav-url'
import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** URL'den guildId çıkar (/dashboard/123 veya /dashboard/123/bot-welcome -> 123). */
function useGuildIdFromUrl(): string | undefined {
  const matches = useRouterState({ select: (s) => s.matches })
  const dashboardMatch = matches.find((m) =>
    typeof m.routeId === 'string' && m.routeId.startsWith('/_authenticated/dashboard/$guildId')
  )
  return (dashboardMatch?.params as { guildId?: string })?.guildId
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { collapsible, variant } = useLayout()
  const { auth } = useAuthStore()
  const guildIdFromUrl = useGuildIdFromUrl()
  const user = auth.user

  const resolvedSelectedGuild =
    auth.selectedGuild ??
    (guildIdFromUrl && user?.discord?.guilds
      ? (() => {
          const g = user.discord.guilds.find((x) => x.id === guildIdFromUrl)
          return g
            ? {
                id: g.id,
                name: g.name,
                icon: g.icon,
                iconUrl:
                  g.iconUrl || (g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : undefined),
              }
            : null
        })()
      : null)
  const { enabledFeatureNames } = useGuildFeatures(resolvedSelectedGuild?.id)

  // Sunucu seçilmediyse tam bot menüsü yok; "Genel" altında yalnızca /apps.
  // Guild kapsamındaki URL'ler /dashboard/:guildId/... formatına dönüştürülür
  const guildId = resolvedSelectedGuild?.id
  const filteredNavGroups = resolvedSelectedGuild
    ? sidebarData.navGroups
        .map((group) => ({
          ...group,
          items: group.items
            .map((item) => {
              if ('url' in item && item.url) {
                return { ...item, url: resolveNavUrl(item.url as string, guildId) as `/${string}` }
              }
              if ('items' in item && item.items) {
                return {
                  ...item,
                  items: item.items.map((sub) => ({
                    ...sub,
                    url: resolveNavUrl(sub.url as string, guildId) as `/${string}`,
                  })),
                }
              }
              return item
            }),
        }))
        .filter((group) => group.items.length > 0) // Boş grupları gizle
    : []

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} fallbackSelectedGuild={resolvedSelectedGuild} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {!resolvedSelectedGuild ? (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav:general', { defaultValue: 'Genel' })}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('nav:myServers', { defaultValue: 'Sunucularım' })}>
                  <Link to='/apps'>
                    <LayoutDashboard />
                    <span>{t('nav:myServers', { defaultValue: 'Sunucularım' })}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        {filteredNavGroups.map((props) => (
          <NavGroup
            key={props.title}
            enabledFeatureNames={enabledFeatureNames}
            {...props}
          />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
