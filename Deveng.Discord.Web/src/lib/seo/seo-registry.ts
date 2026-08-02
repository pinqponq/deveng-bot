import { PUBLIC_COMMAND_SEO_LINES_EN, PUBLIC_DOC_SEO_LINES_EN } from '@/lib/seo/public-seo-en'
import { LANDING_FEATURES, LANDING_FEATURE_SEO_EN } from '@/features/public/landing-content'
import {
  createCommandsSchema,
  createDocsHowToSchemas,
  createFaqPageSchema,
  createSoftwareApplicationSchema,
} from './schema'
import { type SeoMeta, type SeoRouteConfig } from './seo-types'
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_OG_IMAGE,
  SEO_SITE_NAME,
  SEO_THEME_COLOR,
  createSeoDescription,
  formatSeoTitle,
  normalizePathname,
  toAbsoluteUrl,
} from './seo-utils'

export const PUBLIC_INDEXABLE_ROUTES = [
  '/',
  '/features',
  '/commands',
  '/docs',
  '/faq',
  '/status',
  '/security',
  '/about',
  '/terms',
  '/privacy',
  '/eula',
  '/copyright',
  '/cookies',
  '/gdpr',
] as const

export const PRIVATE_NOINDEX_PREFIXES = [
  '/dashboard',
  '/apps',
  '/select-server',
  '/auth',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/otp',
] as const

export const ERROR_NOINDEX_PATHS = ['/401', '/403', '/404', '/500', '/503'] as const

const featureDescriptions = LANDING_FEATURES.map((feature) => LANDING_FEATURE_SEO_EN[feature.slug].line)
const commandDescriptions = PUBLIC_COMMAND_SEO_LINES_EN
const docsDescriptions = PUBLIC_DOC_SEO_LINES_EN

export const PUBLIC_FAQ_SCHEMA_ITEMS = [
  {
    question: 'How do I add Deveng to my server?',
    answer: 'Use the Add to Discord button or invite link on the home page, then review and approve the requested permissions.',
  },
  {
    question: 'How do I open the management dashboard?',
    answer: 'Sign in with Discord on the home page; you can manage servers where you have access and the bot is installed.',
  },
  {
    question: 'Which modules are available?',
    answer: 'Welcome and goodbye flows, embed messages, polls, giveaways, tickets, music, levels, moderation, logging, custom commands, automations, and more.',
  },
  {
    question: 'Are usage limits enforced per server?',
    answer:
      'Yes—each Discord server gets generous caps for configurable items (automations, custom commands, and more). If you exceed a limit you will receive a quota error.',
  },
] as const

const publicRouteConfigs: Record<string, SeoRouteConfig> = {
  '/': {
    path: '/',
    pageName: 'Discord automation & moderation',
    descriptionCandidates: [
      'Add Deveng Bot to your Discord server',
      'Manage moderation, tickets, engagement, and automations from one secure web dashboard.',
      ...featureDescriptions.slice(0, 6),
    ],
  },
  '/features': {
    path: '/features',
    pageName: 'Features',
    descriptionCandidates: [
      'Deveng Bot feature overview',
      'Moderation, tickets, roles, music, polls, giveaways, logging, automations, and more for Discord communities.',
      ...featureDescriptions,
    ],
    ogImage: '/images/og/features.svg',
  },
  '/commands': {
    path: '/commands',
    pageName: 'Commands',
    descriptionCandidates: [
      'Deveng Bot slash command reference',
      'Server management, moderation, tickets, polls, giveaways, roles, and custom commands from Discord.',
      ...commandDescriptions,
    ],
    ogImage: '/images/og/commands.svg',
  },
  '/docs': {
    path: '/docs',
    pageName: 'Documentation',
    descriptionCandidates: [
      'Deveng Bot documentation',
      'Step-by-step guides for inviting the bot, security settings, ticket panels, and reaction roles.',
      ...docsDescriptions,
    ],
    ogImage: '/images/og/docs.svg',
  },
  '/faq': {
    path: '/faq',
    pageName: 'FAQ',
    descriptionCandidates: [
      'Answers about the Deveng bot, web dashboard, security, and support.',
      ...PUBLIC_FAQ_SCHEMA_ITEMS.map((item) => `${item.question} ${item.answer}`),
    ],
  },
  '/status': {
    path: '/status',
    pageName: 'Service status',
    descriptionCandidates: [
      'How Deveng monitors uptime, where to check the public health endpoint, and how incident communication works.',
    ],
  },
  '/security': {
    path: '/security',
    pageName: 'Security',
    descriptionCandidates: [
      'Security overview for Deveng Bot: Discord OAuth, HTTPS, server-side sessions, least-privilege bot invites, and data-handling policies.',
    ],
  },
  '/about': {
    path: '/about',
    pageName: 'About',
    descriptionCandidates: [
      'About Deveng Bot and the team behind Discord automation tooling, dashboards, documentation, and support contacts.',
    ],
  },
  '/terms': {
    path: '/terms',
    pageName: 'Terms of Service',
    descriptionCandidates: [
      'Terms of service for the Deveng Discord bot and web dashboard: accounts, permissions, acceptable use, and service conditions.',
    ],
  },
  '/privacy': {
    path: '/privacy',
    pageName: 'Privacy Policy',
    descriptionCandidates: [
      'Privacy policy for Deveng Bot and the dashboard: sessions, Discord account data, and how server configuration is processed.',
    ],
  },
  '/eula': {
    path: '/eula',
    pageName: 'EULA',
    descriptionCandidates: [
      'End user license for the Deveng Discord bot, custom bot offerings, and the web-based management panel.',
    ],
  },
  '/copyright': {
    path: '/copyright',
    pageName: 'Copyright',
    descriptionCandidates: [
      'Copyright and usage terms for Deveng bot software, the panel, documentation, and marketing materials.',
    ],
  },
  '/cookies': {
    path: '/cookies',
    pageName: 'Cookie Policy',
    descriptionCandidates: [
      'How the Deveng dashboard uses cookies and local storage for sessions, security, and preferences.',
    ],
  },
  '/gdpr': {
    path: '/gdpr',
    pageName: 'GDPR & data protection',
    descriptionCandidates: [
      'GDPR and KVKK notice describing how Deveng Bot processes personal data for the Discord bot and panel services.',
    ],
  },
}

function isNoIndexPath(pathname: string): boolean {
  return (
    PRIVATE_NOINDEX_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) || ERROR_NOINDEX_PATHS.includes(pathname as (typeof ERROR_NOINDEX_PATHS)[number])
  )
}

function createJsonLd(pathname: string, context: { url: string; image: string; description: string }) {
  const softwareSchema = createSoftwareApplicationSchema(context)

  if (pathname === '/faq') {
    return [softwareSchema, createFaqPageSchema([...PUBLIC_FAQ_SCHEMA_ITEMS])]
  }

  if (pathname === '/commands') {
    return [softwareSchema, createCommandsSchema(context.url)]
  }

  if (pathname === '/docs') {
    return [softwareSchema, ...createDocsHowToSchemas()]
  }

  return [softwareSchema]
}

export function resolveSeoMeta(pathnameInput: string, baseUrl?: string): SeoMeta {
  const pathname = normalizePathname(pathnameInput)
  const route = publicRouteConfigs[pathname]
  const noindex = isNoIndexPath(pathname)
  const pageName = route?.pageName || (noindex ? 'Dashboard' : 'Deveng Bot')
  const description = createSeoDescription(route?.descriptionCandidates || [], SEO_DEFAULT_DESCRIPTION)
  const canonicalPath = route?.canonicalPath || route?.path || '/'
  const canonicalUrl = toAbsoluteUrl(canonicalPath, baseUrl)
  const ogImageUrl = toAbsoluteUrl(route?.ogImage || SEO_DEFAULT_OG_IMAGE, baseUrl)

  return {
    title: formatSeoTitle(pageName),
    description,
    canonicalUrl,
    robots: noindex || !route ? 'noindex,nofollow' : route.robots || 'index,follow',
    ogType: route?.ogType || 'website',
    ogImage: {
      url: ogImageUrl,
      width: 1200,
      height: 630,
      alt: `${SEO_SITE_NAME} — social preview image`,
    },
    siteName: SEO_SITE_NAME,
    themeColor: SEO_THEME_COLOR,
    jsonLd: route && !noindex ? createJsonLd(pathname, { url: canonicalUrl, image: ogImageUrl, description }) : [],
  }
}

export function getPublicSeoRoutes(): SeoRouteConfig[] {
  return PUBLIC_INDEXABLE_ROUTES.map((path) => publicRouteConfigs[path]).filter(Boolean)
}
