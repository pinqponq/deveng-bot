import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'
import { splitHrefPathAndSearch } from '@/utils/nav-url'

function useNavLabel(item: { title: string; titleKey?: string }) {
  const { t } = useTranslation()
  return item.titleKey ? t(item.titleKey) : item.title
}

export function NavGroup({
  title,
  titleKey,
  items,
  enabledFeatureNames,
}: NavGroupProps) {
  const { t } = useTranslation()
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  const groupLabel = titleKey ? t(titleKey) : title

  // Grup daraltma durumu — localStorage'da kalıcı. 38 öğelik sidebar'ı yönetilebilir kılar.
  const storageKey = `nav-group:${titleKey ?? title}`
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(storageKey) !== 'closed'
  })
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    try {
      window.localStorage.setItem(storageKey, next ? 'open' : 'closed')
    } catch {
      // localStorage erişilemezse sessizce yoksay
    }
  }

  const menu = (
    <SidebarMenu>
      {items.map((item) => {
        const key = `${item.title}-${item.url}`

        if (!item.items)
          return (
            <SidebarMenuLink
              key={key}
              item={item}
              href={href}
              enabledFeatureNames={enabledFeatureNames}
            />
          )

        if (state === 'collapsed' && !isMobile)
          return (
            <SidebarMenuCollapsedDropdown
              key={key}
              item={item}
              href={href}
              enabledFeatureNames={enabledFeatureNames}
            />
          )

        return (
          <SidebarMenuCollapsible
            key={key}
            item={item}
            href={href}
            enabledFeatureNames={enabledFeatureNames}
          />
        )
      })}
    </SidebarMenu>
  )

  // İkon (collapsed) modunda: label gizli olduğundan grup daraltma devre dışı.
  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
        {menu}
      </SidebarGroup>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className='group/nav-group'
    >
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            asChild
            className='hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full cursor-pointer'
          >
            <button type='button'>
              {groupLabel}
              <ChevronRight className='ms-auto size-4 transition-transform duration-200 group-data-[state=open]/nav-group:rotate-90 rtl:rotate-180' />
            </button>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          {menu}
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function FeatureStatusIndicator({
  featureName,
  featureStatusAlso,
  enabledFeatureNames,
}: {
  featureName: string
  featureStatusAlso?: string[]
  enabledFeatureNames?: Set<string>
}) {
  const { t } = useTranslation('nav')
  if (!enabledFeatureNames) return null
  const names = [featureName, ...(featureStatusAlso ?? [])]
  const isEnabled = names.some((n) => enabledFeatureNames.has(n))
  return (
    <span
      className={`ms-auto flex size-2 shrink-0 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
      title={isEnabled ? t('featureActive') : t('featureInactive')}
      aria-label={isEnabled ? t('featureActive') : t('featureInactive')}
    />
  )
}

function SidebarMenuLink({
  item,
  href,
  enabledFeatureNames,
}: {
  item: NavLink
  href: string
  enabledFeatureNames?: Set<string>
}) {
  const { setOpenMobile } = useSidebar()
  const label = useNavLabel(item)
  const hrefStr = String(item.url)
  const { to, search } = splitHrefPathAndSearch(hrefStr)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={checkIsActive(href, item)} tooltip={label}>
        <Link to={to} {...(search ? { search } : {})} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{label}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
          {item.featureName ? (
            <FeatureStatusIndicator
              featureName={item.featureName}
              featureStatusAlso={item.featureStatusAlso}
              enabledFeatureNames={enabledFeatureNames}
            />
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
  enabledFeatureNames: _enabledFeatureNames,
}: {
  item: NavCollapsible
  href: string
  enabledFeatureNames?: Set<string>
}) {
  const { t } = useTranslation()
  const { setOpenMobile } = useSidebar()
  const label = item.titleKey ? t(item.titleKey) : item.title
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label}>
            {item.icon && <item.icon />}
            <span>{label}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              const subHref = String(subItem.url)
              const { to: subTo, search: subSearch } = splitHrefPathAndSearch(subHref)
              return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                >
                  <Link to={subTo} {...(subSearch ? { search: subSearch } : {})} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon />}
                    <span>{subItem.titleKey ? t(subItem.titleKey) : subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
  enabledFeatureNames: _enabledFeatureNames,
}: {
  item: NavCollapsible
  href: string
  enabledFeatureNames?: Set<string>
}) {
  const { t } = useTranslation()
  const label = item.titleKey ? t(item.titleKey) : item.title
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{label}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {label} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => {
            const subHref = String(sub.url)
            const { to: subTo, search: subSearch } = splitHrefPathAndSearch(subHref)
            return (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={subTo}
                {...(subSearch ? { search: subSearch } : {})}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.titleKey ? t(sub.titleKey) : sub.title}</span>
                {sub.badge && (
                  <span className='ms-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function pathnameOnly(u: string) {
  const q = u.indexOf('?')
  return q === -1 ? u : u.slice(0, q)
}

function hrefSearchParams(href: string): URLSearchParams {
  const q = href.indexOf('?')
  if (q === -1) return new URLSearchParams()
  return new URLSearchParams(href.slice(q + 1))
}

/** Sidebar `item.url` içindeki her sorgu anahtarı konum href'inde aynı değerde olmalı. */
function searchParamsSubsetMatch(href: string, itemUrl: string): boolean {
  const qItem = itemUrl.indexOf('?')
  if (qItem === -1) return true
  const pItem = new URLSearchParams(itemUrl.slice(qItem + 1))
  const pHref = hrefSearchParams(href)
  for (const [key, want] of pItem.entries()) {
    const got = pHref.get(key)
    if (got === want) continue
    // bot-music: URL'de view yokken rota varsayılanı home
    if (key === 'view' && want === 'home' && (got === null || got === '')) continue
    return false
  }
  return true
}

/** Sorgusuz menü URL'si: pathname eşleşsin (sorgu farkı ayrı ele alınır). */
function pathOnlyNavItemActive(_href: string, _itemUrl: string): boolean {
  return true
}

/** Geçerli konum `href` ile sidebar `itemUrl` aynı sayfayı mı gösteriyor? */
function navHrefMatchesLocation(href: string, itemUrl: string): boolean {
  if (!itemUrl) return false
  if (href === itemUrl) return true
  const pathH = pathnameOnly(href)
  const pathI = pathnameOnly(itemUrl)
  if (pathH !== pathI) return false
  if (itemUrl.includes('?')) return searchParamsSubsetMatch(href, itemUrl)
  return pathOnlyNavItemActive(href, itemUrl)
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  const itemUrl = 'url' in item && item.url != null ? String(item.url) : ''
  return (
    navHrefMatchesLocation(href, itemUrl) ||
    !!(item?.items?.filter((i) => navHrefMatchesLocation(href, String(i.url)))?.length) ||
    !!(
      mainNav &&
      itemUrl &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === pathnameOnly(itemUrl).split('/')[1]
    )
  )
}
