import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  /** i18n key (e.g. nav.dashboard); falls back to title when not set */
  titleKey?: string
  /** i18n key for dashboard card short description (e.g. dashboard:cardDescWelcome) */
  descriptionKey?: string
  badge?: string
  icon?: React.ElementType
  /** Guild feature name; when set and guild selected, sidebar shows active/inactive indicator */
  featureName?: string
  /** Ek özellik adları: bunlardan biri açıksa gösterge aktif sayılır (örn. özel + gelişmiş komutlar tek menüde). */
  featureStatusAlso?: string[]
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  /** i18n key for group label (e.g. nav:general) */
  titleKey?: string
  items: NavItem[]
  /** Aktif özellik isimleri; menüde özellik durumu göstergesi için */
  enabledFeatureNames?: Set<string>
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
