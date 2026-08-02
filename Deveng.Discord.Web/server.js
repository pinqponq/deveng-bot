import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { RedisStore as RateLimitRedisStore } from 'rate-limit-redis'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import { createClient } from 'redis'
import cookieParser from 'cookie-parser'
import { Readable } from 'stream'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })
dotenv.config({ path: resolve(__dirname, '.env.local'), override: true })

const ES_URI = (process.env.ES_URI || '').trim()
const ES_INDEX_PREFIX = (process.env.ES_INDEX_PREFIX || 'deveng-discord-web-logs').trim()
const ES_API_KEY = (process.env.ES_API_KEY || '').trim()
const ES_LOG_DISABLED = process.env.ES_LOG_DISABLED === '1' || process.env.ES_LOG_DISABLED === 'true'

function getEsIndex() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${ES_INDEX_PREFIX}-${y}.${m}.${day}`
}

function sendToEs(level, message) {
  if (ES_LOG_DISABLED || !ES_URI) return
  const headers = { 'Content-Type': 'application/json' }
  if (ES_API_KEY) headers.Authorization = `ApiKey ${ES_API_KEY}`
  fetch(`${ES_URI.replace(/\/$/, '')}/${getEsIndex()}/_doc`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ '@timestamp': new Date().toISOString(), level: level.toUpperCase(), message, app: 'deveng-discord-web' }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {})
}

const serverLogger = {
  info:  (msg) => { console.log(`${new Date().toLocaleTimeString('tr-TR')} [INFO ] ${msg}`);  sendToEs('info', msg)  },
  warn:  (msg) => { console.warn(`${new Date().toLocaleTimeString('tr-TR')} [WARN ] ${msg}`); sendToEs('warn', msg)  },
  error: (msg) => { console.error(`${new Date().toLocaleTimeString('tr-TR')} [ERROR] ${msg}`); sendToEs('error', msg) },
}

// Global hata güvenlik ağı: yakalanmamış promise reddi / istisnalar sessizce
// süreci düşürmesin veya izlenemez kalmasın. Rejection'da servis çalışmaya devam
// eder; gerçekten yakalanmamış istisnada süreç bilinmeyen durumdadır → loglanıp
// çıkılır ki orkestratör (docker restart) temiz şekilde yeniden başlatsın.
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}` : String(reason)
  serverLogger.error(`Unhandled promise rejection: ${msg}`)
})
process.on('uncaughtException', (err) => {
  serverLogger.error(`Uncaught exception: ${err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)}`)
  process.exit(1)
})

/** Discord yanıtındaki e-posta (identify+email scope); boş / yoksa dönüş yok — loglamayın. */
function optionalDiscordProfileEmail(user) {
  if (!user || typeof user.email !== 'string') return undefined
  const t = user.email.trim()
  return t !== '' ? t : undefined
}

function buildPublicConfig() {
  return {
    apiUrl: (process.env.PUBLIC_API_URL || '').trim(),
    panelBaseUrl: (process.env.PUBLIC_PANEL_BASE_URL || '').trim(),
    discordClientId: (process.env.PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '').trim(),
    clerkPublishableKey: (process.env.CLERK_PUBLISHABLE_KEY || '').trim(),
    turnstileSiteKey: (process.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim(),
  }
}

const SEO_SITE_NAME = 'Deveng'
const SEO_PRODUCT_NAME = 'Deveng Bot'
const SEO_THEME_COLOR = '#5865F2'
const SEO_DEFAULT_BASE_URL = 'https://deveng.app'
const SEO_DEFAULT_OG_IMAGE = '/images/og/default.svg'
const SEO_DEFAULT_DESCRIPTION =
  'Deveng Bot is an all-in-one Discord bot and web dashboard for moderation, tickets, music, polls, roles, automations, and community management.'
/** Bitmask string for bot invite URLs — keep in sync with `src/lib/discord-bot-invite-permissions.ts`. */
const DEFAULT_BOT_INVITE_PERMISSIONS = '2197949378519'
const SEO_HOME_FEATURE_LINES_EN = [
  'Polls: create polls and collect community feedback.',
  'Reminders: track important dates and events.',
  'Reaction roles: assign roles automatically with emojis.',
  'Temporary voice channels: lock, hide, set limits, and manage access.',
  'Tickets: automated support channels for your staff.',
  'Birthdays: celebrate members automatically.',
]
const SEO_PUBLIC_ROUTES = [
  {
    path: '/',
    pageName: 'Discord automation & moderation',
    descriptionCandidates: [
      'Add Deveng Bot to your Discord server',
      'Manage moderation, tickets, engagement, and automations from one secure web dashboard.',
      ...SEO_HOME_FEATURE_LINES_EN,
    ],
  },
  {
    path: '/features',
    pageName: 'Features',
    descriptionCandidates: [
      'Deveng Bot feature overview',
      'Moderation, tickets, roles, music, polls, giveaways, logging, automations, and more for Discord communities.',
    ],
    ogImage: '/images/og/features.svg',
  },
  {
    path: '/commands',
    pageName: 'Commands',
    descriptionCandidates: [
      'Deveng Bot slash command reference',
      'Server management, moderation, tickets, polls, giveaways, roles, and custom commands from Discord.',
    ],
    ogImage: '/images/og/commands.svg',
  },
  {
    path: '/docs',
    pageName: 'Documentation',
    descriptionCandidates: [
      'Deveng Bot documentation',
      'Step-by-step guides for inviting the bot, security settings, ticket panels, and reaction roles.',
    ],
    ogImage: '/images/og/docs.svg',
  },
  {
    path: '/faq',
    pageName: 'FAQ',
    descriptionCandidates: ['Answers about the Deveng bot, web dashboard, security, and support.'],
  },
  {
    path: '/terms',
    pageName: 'Terms of Service',
    descriptionCandidates: ['Terms of service for the Deveng Discord bot and web dashboard: accounts, permissions, acceptable use, and service conditions.'],
  },
  {
    path: '/privacy',
    pageName: 'Privacy Policy',
    descriptionCandidates: ['Privacy policy for Deveng Bot and the dashboard: sessions, Discord account data, and how server configuration is processed.'],
  },
  {
    path: '/eula',
    pageName: 'EULA',
    descriptionCandidates: ['End user license for the Deveng Discord bot, custom bot offerings, and the web-based management panel.'],
  },
  {
    path: '/copyright',
    pageName: 'Copyright',
    descriptionCandidates: ['Copyright and usage terms for Deveng bot software, the panel, documentation, and marketing materials.'],
  },
  {
    path: '/cookies',
    pageName: 'Cookie Policy',
    descriptionCandidates: ['How the Deveng dashboard uses cookies and local storage for sessions, security, and preferences.'],
  },
  {
    path: '/gdpr',
    pageName: 'GDPR & data protection',
    descriptionCandidates: ['GDPR and KVKK notice describing how Deveng Bot processes personal data for the Discord bot and panel services.'],
  },
  {
    path: '/status',
    pageName: 'Service status',
    descriptionCandidates: [
      'How Deveng monitors uptime, where to check the public health endpoint, and how incident communication works.',
    ],
  },
  {
    path: '/security',
    pageName: 'Security',
    descriptionCandidates: [
      'Security overview for Deveng: Discord OAuth, server-side sessions, least-privilege bot invites, and data handling policies.',
    ],
  },
]
const SEO_PRIVATE_PREFIXES = ['/dashboard', '/apps', '/select-server', '/auth', '/sign-in', '/sign-up', '/forgot-password', '/otp', '/clerk']
const SEO_ERROR_PATHS = ['/401', '/403', '/404', '/500', '/503']

function normalizeSeoPath(pathname) {
  const raw = (pathname || '/').split('?')[0].split('#')[0]
  return raw.length > 1 ? raw.replace(/\/+$/, '') : raw || '/'
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeSeoText(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}

function formatSeoTitle(pageName) {
  const normalized = normalizeSeoText(pageName)
  return !normalized || normalized === SEO_PRODUCT_NAME ? SEO_PRODUCT_NAME : `${normalized} | ${SEO_PRODUCT_NAME}`
}

function createSeoDescription(candidates) {
  const combined = normalizeSeoText((candidates || []).filter(Boolean).join(' '))
  const source = combined.length >= 50 ? combined : SEO_DEFAULT_DESCRIPTION
  if (source.length <= 160) return source
  const clipped = source.slice(0, 161)
  const lastSpace = clipped.lastIndexOf(' ')
  const safe = (lastSpace > 120 ? clipped.slice(0, lastSpace) : clipped.slice(0, 160)).trim()
  return safe.replace(/[,.!?;:]+$/, '') + '...'
}

function getSeoBaseUrl(req) {
  const configured = (process.env.PUBLIC_PANEL_BASE_URL || '').trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch (err) {
      serverLogger.warn(`[SEO] Geçersiz PUBLIC_PANEL_BASE_URL, request host'a düşülüyor: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (req?.get) {
    const host = req.get('host')
    if (host) return `${req.protocol || 'https'}://${host}`
  }
  return SEO_DEFAULT_BASE_URL
}

function toAbsoluteSeoUrl(pathOrUrl, req) {
  try {
    return new URL(pathOrUrl).toString()
  } catch (_) {
    const path = String(pathOrUrl || '/').startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `${getSeoBaseUrl(req)}${path}`
  }
}

function isSeoNoIndexPath(pathname) {
  return SEO_PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    SEO_ERROR_PATHS.includes(pathname)
}

function createSoftwareApplicationSchema(url, image, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SEO_PRODUCT_NAME,
    alternateName: 'Deveng Discord Bot',
    applicationCategory: 'BotApplication',
    operatingSystem: 'Discord',
    url,
    image,
    description,
    featureList: [
      'Moderation',
      'Tickets',
      'Music',
      'Polls',
      'Giveaways',
      'Reaction roles',
      'Logging',
      'Custom commands',
    ],
    publisher: { '@type': 'Organization', name: SEO_SITE_NAME, url },
  }
}

function createRouteJsonLd(pathname, url, image, description) {
  const software = createSoftwareApplicationSchema(url, image, description)
  if (pathname === '/faq') {
    return [software, {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'How do I add Deveng to my server?', acceptedAnswer: { '@type': 'Answer', text: 'Use the Add to Discord button or invite link on the home page, then review and approve the requested permissions.' } },
        { '@type': 'Question', name: 'How do I open the management dashboard?', acceptedAnswer: { '@type': 'Answer', text: 'Sign in with Discord on the home page; you can manage servers where you have access and the bot is installed.' } },
        { '@type': 'Question', name: 'Are usage limits enforced per server?', acceptedAnswer: { '@type': 'Answer', text: 'Yes—each Discord server gets generous caps for configurable features. If you exceed a limit you receive a quota error instead of needing a subscription.' } },
      ],
    }]
  }
  if (pathname === '/commands') {
    return [software, {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: 'Deveng Bot commands',
      url,
      hasDefinedTerm: ['/help', '/setup', '/moderator', '/logs', '/poll', '/giveaway', '/ticket-panel', '/custom-command'].map((name) => ({ '@type': 'DefinedTerm', name })),
    }]
  }
  if (pathname === '/docs') {
    return [software, {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to add Deveng Bot to a Discord server',
      description: 'Use the Discord OAuth invite to add the bot, then approve the requested permissions.',
      step: [
        'Open the Add to Discord link from the home page.',
        'Choose the Discord server where Deveng should be installed.',
        'Review requested permissions and complete authorization.',
        'Sign in to the dashboard with Discord to open server settings.',
      ].map((text, index) => ({ '@type': 'HowToStep', position: index + 1, text })),
    }]
  }
  return [software]
}

function resolveServerSeo(pathnameInput, req) {
  const pathname = normalizeSeoPath(pathnameInput)
  const route = SEO_PUBLIC_ROUTES.find((item) => item.path === pathname)
  const noindex = isSeoNoIndexPath(pathname) || !route
  const title = formatSeoTitle(route?.pageName || (noindex ? 'Dashboard' : SEO_PRODUCT_NAME))
  const description = createSeoDescription(route?.descriptionCandidates)
  const canonicalUrl = toAbsoluteSeoUrl(route?.path || '/', req)
  const image = toAbsoluteSeoUrl(route?.ogImage || SEO_DEFAULT_OG_IMAGE, req)
  return {
    title,
    description,
    canonicalUrl,
    robots: noindex ? 'noindex,nofollow' : 'index,follow',
    ogType: 'website',
    siteName: SEO_SITE_NAME,
    themeColor: SEO_THEME_COLOR,
    image,
    imageWidth: '1200',
    imageHeight: '630',
    imageAlt: `${SEO_SITE_NAME} — social preview image`,
    jsonLd: route && !noindex ? createRouteJsonLd(pathname, canonicalUrl, image, description) : [],
  }
}

function renderSeoTags(seo) {
  const jsonLdTags = seo.jsonLd
    .map((graph) => `<script type="application/ld+json" data-deveng-seo="json-ld">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ')
  return `<!-- SEO_START -->
    <title>${escapeHtml(seo.title)}</title>
    <meta name="title" content="${escapeHtml(seo.title)}" />
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="robots" content="${escapeHtml(seo.robots)}" />
    <link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />
    <meta property="og:type" content="${escapeHtml(seo.ogType)}" />
    <meta property="og:site_name" content="${escapeHtml(seo.siteName)}" />
    <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:image" content="${escapeHtml(seo.image)}" />
    <meta property="og:image:width" content="${escapeHtml(seo.imageWidth)}" />
    <meta property="og:image:height" content="${escapeHtml(seo.imageHeight)}" />
    <meta property="og:image:alt" content="${escapeHtml(seo.imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(seo.canonicalUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${escapeHtml(seo.image)}" />
    ${jsonLdTags}
    <!-- SEO_END -->`
}

function injectSeoIntoHtml(html, seo) {
  const block = renderSeoTags(seo)
  if (/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/.test(html)) {
    return html.replace(/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/, block)
  }
  return html.replace('</head>', `${block}\n  </head>`)
}

function injectHtmlLangAttribute(html, lang) {
  const q = escapeHtml(lang)
  if (/<html\s+lang="/i.test(html)) {
    return html.replace(/<html(\s+lang=")[^"]*(")/i, `<html$1${q}$2`)
  }
  if (/<html>/i.test(html)) return html.replace('<html>', `<html lang="${q}">`)
  return html.replace(/<html(\s)/i, `<html lang="${q}"$1`)
}

function buildBotInviteUrlForCrawl(req) {
  const clientId = (process.env.PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '').trim()
  if (!clientId) return ''
  return `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=${DEFAULT_BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`
}

function buildCrawlableMainHtml(pathname, seo, req) {
  const base = getSeoBaseUrl(req)
  const invite = buildBotInviteUrlForCrawl(req)
  const trust = `<p><a href="${escapeHtml(`${base}/privacy`)}">Privacy</a> · <a href="${escapeHtml(`${base}/terms`)}">Terms</a> · <a href="${escapeHtml(`${base}/security`)}">Security</a> · <a href="${escapeHtml(`${base}/gdpr`)}">GDPR notice</a> · <a href="${escapeHtml(`${base}/cookies`)}">Cookies</a></p>`
  if (pathname === '/') {
    const highlights = [
      'Moderation, logging, and staff tools for safer communities.',
      'Ticket workflows and private support threads.',
      'Reaction roles, welcomes, and engagement automations.',
      'Polls, giveaways, levels, and custom commands.',
      'Music, embed announcements, feeds, and stat channels.',
      'Per-feature limits that suit growing communities.',
    ]
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join('')
    const addTo = invite
      ? `<p><a href="${escapeHtml(invite)}">Add Deveng to Discord</a> (granular permissions, not Administrator) — <a href="${escapeHtml(`${base}/`)}">open dashboard</a> with Discord sign-in.</p>`
      : `<p><a href="${escapeHtml(`${base}/`)}">Open the dashboard</a> and sign in with Discord. Set DISCORD_CLIENT_ID so automated invite links can be generated.</p>`
    return `<main id="deveng-crawl" class="deveng-seo-prerender" lang="en" data-deveng-crawl="1"><h1>${escapeHtml(seo.title)}</h1><p>${escapeHtml(seo.description)}</p><h2>What you can automate</h2><ul>${highlights}</ul><h2>Product</h2><p><a href="${escapeHtml(`${base}/features`)}">Features</a> · <a href="${escapeHtml(`${base}/commands`)}">Commands</a> · <a href="${escapeHtml(`${base}/docs`)}">Documentation</a> · <a href="${escapeHtml(`${base}/faq`)}">FAQ</a> · <a href="${escapeHtml(`${base}/status`)}">Status</a> · <a href="${escapeHtml(`${base}/security`)}">Security</a></p>${addTo}<h2>Trust &amp; policies</h2>${trust}<p><small>Summary for search engines and no-JS clients; the full app loads with JavaScript.</small></p></main>`
  }
  return `<main id="deveng-crawl" class="deveng-seo-prerender" lang="en" data-deveng-crawl="1"><h1>${escapeHtml(seo.title)}</h1><p>${escapeHtml(seo.description)}</p><p><a href="${escapeHtml(`${base}/`)}">Home</a> · <a href="${escapeHtml(`${base}/features`)}">Features</a> · <a href="${escapeHtml(`${base}/docs`)}">Documentation</a> · <a href="${escapeHtml(`${base}/status`)}">Status</a> · <a href="${escapeHtml(`${base}/security`)}">Security</a></p>${trust}</main>`
}

function injectCrawlableIntoRootHtml(html, req, seo) {
  if (seo.robots !== 'index,follow') return html
  html = html.replace(
    /<div id="root">\s*(<main\b[^>]*\bid=["']deveng-crawl["'][^>]*>[\s\S]*?<\/main>)\s*<\/div>/i,
    '$1\n    <div id="root"></div>',
  )
  if (/\bid=["']deveng-crawl["']/i.test(html)) {
    return html
  }
  const pathname = normalizeSeoPath(req.path)
  const block = buildCrawlableMainHtml(pathname, seo, req)
  const replacement = `${block}\n    <div id="root"></div>`
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', replacement)
  }
  return html.replace(/<div id="root">\s*<\/div>/, replacement)
}

const app = express()
const PORT = Number(process.env.PORT) || 3001

/** Proxy loglarında tam URL/topology sızdırmamak için yalnızca path (+ isteğe bağlı arama) */
function proxyPathForLog(req) {
  const raw = req.originalUrl || req.url || req.path || ''
  try {
    const u = new URL(raw, 'http://localhost')
    return u.pathname + (u.search ? '?…' : '')
  } catch {
    return raw.split('?')[0] || '/'
  }
}

// TLS çoğu kurulumda reverse proxy'de biter; Trust etmezsek req.secure=false kalır ve
// secure: true session çerezi hiç set edilmez → BFF session'da accessToken yok → API 401.
const trustProxyExplicit = process.env.TRUST_PROXY
const trustProxy =
  trustProxyExplicit === '1' ||
  trustProxyExplicit === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    trustProxyExplicit !== '0' &&
    trustProxyExplicit !== 'false')
if (trustProxy) {
  app.set('trust proxy', 1)
}

// Session secret — env'den okunur; boşsa uygulama başlamaz (production safety)
const SESSION_SECRET = process.env.SESSION_SECRET || ''
if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] SESSION_SECRET env değişkeni tanımlı değil. Uygulama durduruluyor.')
  process.exit(1)
}

function parseDurationMs(value, fallback) {
  const parsed = parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// Idle cookie max-age: varsayılan 7 gün
const SESSION_IDLE_MAX_AGE_MS = parseDurationMs(
  process.env.SESSION_IDLE_MAX_AGE_MS || process.env.SESSION_MAX_AGE_MS,
  7 * 24 * 60 * 60 * 1000,
)
// Mutlak oturum ömrü: aktif kullanıcıda rolling cookie/refresh token sonsuza uzamasın
const SESSION_ABSOLUTE_MAX_AGE_MS = parseDurationMs(
  process.env.SESSION_ABSOLUTE_MAX_AGE_MS,
  30 * 24 * 60 * 60 * 1000,
)

const isProduction = process.env.NODE_ENV === 'production'

function parseBoolEnv(name, fallback) {
  const v = (process.env[name] || '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return fallback
}

const publicPanelBaseUrl = (process.env.PUBLIC_PANEL_BASE_URL || '').trim()
const publicPanelUsesHttp = /^http:\/\//i.test(publicPanelBaseUrl)
const sessionCookieSecure = parseBoolEnv(
  'SESSION_COOKIE_SECURE',
  isProduction && !publicPanelUsesHttp,
)
// __Host- öneki Secure + HTTPS şart; HTTP localhost’ta deveng.sid kullan
const sessionCookieName =
  (process.env.SESSION_COOKIE_NAME || '').trim() ||
  (sessionCookieSecure ? '__Host-sid' : 'deveng.sid')

const REDIS_URL = (process.env.REDIS_URL || process.env.WEB_SESSION_REDIS_URL || process.env.SESSION_REDIS_URL || '').trim()
let redisClient = null
if (REDIS_URL) {
  try {
    redisClient = createClient({ url: REDIS_URL })
    redisClient.on('error', (err) => serverLogger.error(`[Redis session] ${err.message}`))
    await redisClient.connect()
    serverLogger.info('Session store: Redis')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    serverLogger.error(`Redis session store bağlanamadı: ${msg}`)
    redisClient = null
    if (process.env.NODE_ENV === 'production') process.exit(1)
  }
} else {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] Production ortamında Redis session store zorunlu. REDIS_URL / WEB_SESSION_REDIS_URL / SESSION_REDIS_URL tanımlayın.')
    process.exit(1)
  }
  serverLogger.info('Session store: bellek (REDIS_URL / WEB_SESSION_REDIS_URL / SESSION_REDIS_URL yok)')
}

/** Discord API yükünü azaltmak için GET /api/auth/session özeti (Redis + bellek fallback). */
const SESSION_DISCORD_CACHE_TTL_MS = Math.min(
  Math.max(Number(process.env.SESSION_DISCORD_CACHE_TTL_MS || '45000'), 5000),
  120000,
)

const discordSessionMemFallback = new Map()

function discordSessionCacheKey(req) {
  const uid = req.session?.userId
  if (uid) return `uid:${uid}`
  const tok = req.session?.accessToken
  if (!tok || typeof tok !== 'string') return null
  const h = createHash('sha256').update(tok).digest('hex').slice(0, 24)
  return `tok:${h}`
}

async function readDiscordSessionCache(req) {
  const ck = discordSessionCacheKey(req)
  if (!ck) return null
  const redisKey = `deveng:web:discord_session:${ck}`
  try {
    if (redisClient?.isReady) {
      const raw = await redisClient.get(redisKey)
      if (raw) return JSON.parse(raw)
    }
  } catch (e) {
    serverLogger.warn(`[Auth] discord session cache okunamadı: ${e.message}`)
  }
  const hit = discordSessionMemFallback.get(redisKey)
  if (hit && hit.exp > Date.now()) return hit.payload
  return null
}

async function writeDiscordSessionCache(req, payload) {
  const ck = discordSessionCacheKey(req)
  if (!ck) return
  const redisKey = `deveng:web:discord_session:${ck}`
  const ttlSec = Math.ceil(SESSION_DISCORD_CACHE_TTL_MS / 1000)
  try {
    if (redisClient?.isReady) {
      await redisClient.set(redisKey, JSON.stringify(payload), { EX: ttlSec })
      return
    }
  } catch (e) {
    serverLogger.warn(`[Auth] discord session cache yazılamadı: ${e.message}`)
  }
  discordSessionMemFallback.set(redisKey, {
    exp: Date.now() + SESSION_DISCORD_CACHE_TTL_MS,
    payload,
  })
  if (discordSessionMemFallback.size > 5000) {
    const now = Date.now()
    for (const [k, v] of discordSessionMemFallback) {
      if (v.exp <= now) discordSessionMemFallback.delete(k)
    }
  }
}

app.use(cookieParser())

function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName, {
    path: '/',
    httpOnly: true,
    secure: sessionCookieSecure,
    sameSite: 'lax',
  })
}

function destroySession(req, res, reason) {
  return new Promise((resolve) => {
    if (!req.session) {
      clearSessionCookie(res)
      resolve()
      return
    }

    req.session.destroy((err) => {
      if (err) serverLogger.error(`Session destroy hatası (${reason}): ${err.message}`)
      clearSessionCookie(res)
      resolve()
    })
  })
}

function getSessionExpiryReason(req, { checkAccessTokenExpiry = false } = {}) {
  if (!req.session?.accessToken) return null
  const now = Date.now()
  if (!req.session.absoluteExpiresAt) {
    const loginAt = Number(req.session.loginAt || now)
    req.session.loginAt = loginAt
    req.session.absoluteExpiresAt = loginAt + SESSION_ABSOLUTE_MAX_AGE_MS
  }

  const absoluteExpiresAt = Number(req.session.absoluteExpiresAt || 0)
  if (absoluteExpiresAt > 0 && absoluteExpiresAt <= now) return 'absolute'

  const accessTokenExpiresAt = Number(req.session.expiresAt || 0)
  if (checkAccessTokenExpiry && accessTokenExpiresAt > 0 && accessTokenExpiresAt <= now) return 'access_token'

  return null
}

function sessionExpiredResponse(reason) {
  const isAbsolute = reason === 'absolute'
  return {
    authenticated: false,
    valid: false,
    code: isAbsolute ? 'session_absolute_expired' : 'access_token_expired',
    message: isAbsolute
      ? 'Oturumun maksimum süresi doldu, lütfen tekrar giriş yapın.'
      : 'Discord oturumu sona erdi, lütfen tekrar giriş yapın.',
  }
}

function requireActiveSession({ checkAccessTokenExpiry = false, destroyOnExpire = false } = {}) {
  return async (req, res, next) => {
    const reason = getSessionExpiryReason(req, { checkAccessTokenExpiry })
    if (!reason) return next()

    serverLogger.info(`[Auth] Session expired (${reason}) for ${req.method} ${proxyPathForLog(req)}`)
    if (destroyOnExpire || reason === 'absolute') {
      await destroySession(req, res, reason)
    }
    return res.status(401).json(sessionExpiredResponse(reason))
  }
}

// HttpOnly, Secure, SameSite=Strict server-side session
// rolling:true — her yanıtta cookie TTL'i sıfırlanır (idle-timeout davranışı)
app.use(session({
  store: redisClient
    ? new RedisStore({ client: redisClient, prefix: 'deveng:web:sess:' })
    : undefined,
  secret: SESSION_SECRET || 'dev-only-insecure-secret',
  name: sessionCookieName,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    path: '/',
    secure: sessionCookieSecure,
    // Lax: Spotify/Discord OAuth dönüşünde top-level GET çerez taşır; Strict oturumu silerdi.
    sameSite: 'lax',
    maxAge: SESSION_IDLE_MAX_AGE_MS,
  },
}))

serverLogger.info(
  `[Session] oturum çerezi: ${sessionCookieName} secure=${sessionCookieSecure}` +
    (publicPanelUsesHttp ? ' (PUBLIC_PANEL_BASE_URL http — localhost uyumu)' : ''),
)

app.use((req, res, next) => {
  const path = req.path || ''
  const isOAuthLanding =
    path.startsWith('/auth/spotify/callback') || path.startsWith('/auth/discord/callback')
  if (!isOAuthLanding) return next()
  if (req.cookies?.[sessionCookieName]) return next()

  const originalSetHeader = res.setHeader.bind(res)
  res.setHeader = (name, value) => {
    if (String(name).toLowerCase() !== 'set-cookie') return originalSetHeader(name, value)
    const list = (Array.isArray(value) ? value : [value]).filter(
      (v) => !String(v).startsWith(`${sessionCookieName}=`),
    )
    if (list.length === 0) return res
    return originalSetHeader(name, list.length === 1 ? list[0] : list)
  }
  next()
})

// Security headers (helmet). Clerk açıksa 3P script/connect izinleri eklenir.
const clerkConfigured = Boolean((process.env.CLERK_PUBLISHABLE_KEY || '').trim())
const musicImageSources = [
  'https://cdn.discordapp.com',
  'https://media.discordapp.net',
  'https://images-ext-1.discordapp.net',
  'https://images-ext-2.discordapp.net',
  'https://img.youtube.com',
  'https://i.ytimg.com',
  // YTM / Lavalink artworkUrl: lh3... ve ggpht; allowlist’te yoksa tarayıcı img-src engeller
  'https://*.googleusercontent.com',
  'https://*.ggpht.com',
  'https://www.gstatic.com',
  'https://i.scdn.co',
  'https://i1.sndcdn.com',
  'https://i2.sndcdn.com',
  'https://i3.sndcdn.com',
  'https://i4.sndcdn.com',
  'https://i1.ytimg.com',
  'https://i2.ytimg.com',
  'https://i3.ytimg.com',
  'https://i4.ytimg.com',
  'https://i5.ytimg.com',
  'https://i6.ytimg.com',
  'https://i7.ytimg.com',
  'https://i8.ytimg.com',
  'https://i9.ytimg.com',
  'https://yt3.ggpht.com',
  'https://yt3.googleusercontent.com',
  // Deezer / diğer Lavalink eklentileri (olası)
  'https://e-cdns-images.dzcdn.net',
]
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: clerkConfigured
        ? ["'self'", 'https://*.clerk.com', 'https://*.clerk.accounts.dev']
        : ["'self'"],
      // Radix UI popper produces inline styles; Report-Only CSP without unsafe-inline is telemetry-only (see /csp-report).
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: clerkConfigured
        ? ["'self'", 'data:', 'blob:', ...musicImageSources, 'https://img.clerk.com']
        : ["'self'", 'data:', 'blob:', ...musicImageSources],
      connectSrc: clerkConfigured
        ? ["'self'", 'https://*.clerk.com', 'https://*.clerk.accounts.dev']
        : ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // http://localhost: helmet production’da varsayılan upgrade-insecure-requests ekler; null ile kapat
      upgradeInsecureRequests: sessionCookieSecure ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  // HTTP localhost'ta HSTS tarayıcıyı https://localhost'a kilitler
  hsts: sessionCookieSecure
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
      }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

// Report-Only CSP: 'unsafe-inline' içermeyen sıkı politika.
// Tarayıcı her ihlali /csp-report endpoint'ine POST eder; enforce'a geçişten önce telemetri.
const reportOnlyDirectives = [
  "default-src 'self'",
  clerkConfigured
    ? "script-src 'self' https://*.clerk.com https://*.clerk.accounts.dev"
    : "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  clerkConfigured
    ? `img-src 'self' data: blob: ${musicImageSources.join(' ')} https://img.clerk.com`
    : `img-src 'self' data: blob: ${musicImageSources.join(' ')}`,
  clerkConfigured
    ? "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev"
    : "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /csp-report",
].join('; ')

app.use((req, res, next) => {
  if (req.path !== '/csp-report') {
    res.setHeader('Content-Security-Policy-Report-Only', reportOnlyDirectives)
  }
  next()
})

// CSP ihlal raporları — örneklenmiş şekilde sunucu loguna düşer.
const cspReportSampleRate = Number(process.env.CSP_REPORT_SAMPLE_RATE || '0.1')
app.post('/csp-report', express.json({ type: ['application/csp-report', 'application/json'], limit: '64kb' }), (req, res) => {
  if (Math.random() < cspReportSampleRate) {
    try {
      const report = req.body?.['csp-report'] || req.body
      const violated = report?.['violated-directive'] || report?.violatedDirective
      const blocked = report?.['blocked-uri'] || report?.blockedURL
      const docUri = report?.['document-uri'] || report?.documentURL
      serverLogger.warn(`[CSP] violated=${violated} blocked=${blocked} doc=${docUri}`)
    } catch (err) {
      serverLogger.warn(`[CSP] Rapor ayrıştırılamadı: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  res.status(204).end()
})

// CORS — CORS_ALLOWED_ORIGINS (virgülle) + PUBLIC_PANEL_BASE_URL kökeni (liste eksik kalsa bile panel)
const CORS_DEFAULT = ['http://localhost:3000', 'http://127.0.0.1:3000']
const CORS_ORIGINS = (() => {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  if (envOrigins) return envOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  return [...CORS_DEFAULT]
})()
const PANEL_ORIGIN = (() => {
  const base = (process.env.PUBLIC_PANEL_BASE_URL || '').trim()
  if (!base) return ''
  try {
    return new URL(base).origin
  } catch {
    return ''
  }
})()
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (CORS_ORIGINS.includes(origin)) return callback(null, true)
    if (PANEL_ORIGIN && origin === PANEL_ORIGIN) return callback(null, true)
    callback(new Error(`CORS: Origin '${origin}' not allowed`))
  },
  credentials: true,
}))
app.use(express.json())

// BFF → .NET API: mutlak URL zorunlu (Node fetch göreli path kabul etmez)
const BOT_API_URL = (
  process.env.BOT_API_URL ||
  process.env.API_BASE_URL ||
  process.env.PUBLIC_API_URL ||
  ''
).trim().replace(/\/$/, '')
try {
  if (BOT_API_URL) {
    const u = new URL(BOT_API_URL)
    if (u.protocol === 'https:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
  }
} catch (err) {
  serverLogger.warn(`[Config] BOT_API_URL ayrıştırılamadı: ${err instanceof Error ? err.message : String(err)}`)
}
const BOT_API_HOST = (() => {
  try {
    if (!BOT_API_URL) return ''
    const u = new URL(BOT_API_URL)
    return u.port ? `${u.hostname}:${u.port}` : u.hostname
  } catch {
    return ''
  }
})()

// Hop-by-hop header'ları proxy'de iletmeyelim
// content-length: node fetch body'ye göre otomatik hesaplar, yanlış değer iletilirse Kestrel'de HTTP framing bozulur
const HOP_HEADERS = new Set(['connection', 'keep-alive', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'proxy-authorization', 'proxy-authenticate', 'content-length'])

// Upstream cevabından SPA'ya iletmeyeceğimiz header'lar:
// - server/x-powered-by/x-aspnet-version: tech-stack fingerprint
// - via/x-forwarded-*: iç ağ topology sızıntısı
// Set-Cookie API tarafından hiç dönmemeli (BFF model); olası leak'i kapat.
const UPSTREAM_RESPONSE_HEADER_BLOCKLIST = new Set([
  'server',
  'x-powered-by',
  'x-aspnet-version',
  'x-aspnetmvc-version',
  'via',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'set-cookie',
])

function proxyTimeoutMs(method, relativePath) {
  const p = (relativePath || '').toLowerCase()
  if (method === 'GET' && (p.includes('discord/guild') || p.includes('/guild/'))) return 28000
  if (method === 'GET') return 42000
  return 90000
}

// Bot API'ye proxy (Docker'da web container'dan API'ye erişim için BOT_API_URL gerekli, örn. http://deveng-discord-api:9000): Node'un üstlenmediği /api isteklerini bot-api'ye yönlendirir (CORS bypass)
// Discord OAuth callback Node'da kalır; discord/guilds/* API'ye proxy edilir (Redis cache API'de)
function proxyToBotApi(req, res, next) {
  const path = (req.path || req.url || '').replace(/^\//, '')
  // BFF'de yönetilen endpoint'ler — API'ye iletilmez
  if (req.method === 'POST' && path.startsWith('auth/discord/callback')) return next()
  if (req.method === 'POST' && path.startsWith('auth/spotify/callback')) return next()
  if (req.method === 'GET' && path.startsWith('auth/session')) return next()
  if (req.method === 'POST' && path.startsWith('auth/refresh-token')) return next()
  if (req.method === 'POST' && path.startsWith('auth/logout')) return next()

  if (!BOT_API_URL) {
    const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    serverLogger.warn(`[Proxy] BOT_API_URL yok — ${req.method} ${proxyPathForLog(req)} reddedildi`)
    return res.status(503).json({
      error: 'API üst katmanı yapılandırılmamış.',
      hint: 'BOT_API_URL veya API_BASE_URL veya PUBLIC_API_URL ortam değişkenini mutlak URL olarak ayarlayın (örn. http://deveng-discord-api:9000).',
      traceId,
    })
  }

  const targetUrl = `${BOT_API_URL}${req.originalUrl?.startsWith('/') ? req.originalUrl : '/' + (req.originalUrl || req.url || '')}`
  const startTime = Date.now()
  serverLogger.info(`[Proxy] --> ${req.method} ${proxyPathForLog(req)}`)
  const headers = {}
  for (const [k, v] of Object.entries(req.headers)) {
    const lower = k.toLowerCase()
    if (v == null || HOP_HEADERS.has(lower)) continue
    headers[k] = v
  }
  headers.host = BOT_API_HOST

  const timeoutMs = proxyTimeoutMs(req.method, path)
  const maxProxyRetries = req.method === 'GET' ? 2 : 1
  const doFetch = () => {
    const opts = { method: req.method, headers, signal: AbortSignal.timeout(timeoutMs) }
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }
    return fetch(targetUrl, opts)
  }
  const isRetryable = (err) => {
    const code = err.cause?.code
    const msg = (err.message || '').toLowerCase()
    return code === 'EAI_AGAIN' || code === 'ETIMEDOUT' || code === 'ABORT_ERR' || code === 'ECONNREFUSED' || code === 'UND_ERR_SOCKET' ||
      msg.includes('timeout') || msg.includes('aborted') || msg.includes('terminated') || msg.includes('socket')
  }
  const fetchWithRetry = (attempt = 0) =>
    doFetch().catch((err) => {
      if (isRetryable(err) && attempt < maxProxyRetries) {
        serverLogger.warn(`[Proxy] Retry ${attempt + 1}/${maxProxyRetries}: ${req.method} ${proxyPathForLog(req)} (timeout=${timeoutMs}ms)`)
        return new Promise((resolve, reject) => {
          setTimeout(() => fetchWithRetry(attempt + 1).then(resolve, reject), 500)
        })
      }
      return Promise.reject(err)
    })

  fetchWithRetry()
    .then((upstream) => {
      const durationMs = Date.now() - startTime
        serverLogger.info(`[Proxy] <-- ${req.method} ${proxyPathForLog(req)} ${upstream.status} (${durationMs}ms)`)
      res.status(upstream.status)
      upstream.headers.forEach((v, k) => {
        const lower = k.toLowerCase()
        if (lower === 'transfer-encoding') return
        if (UPSTREAM_RESPONSE_HEADER_BLOCKLIST.has(lower)) return
        res.setHeader(k, v)
      })
      const body = upstream.body
      // Node 18+ fetch body Web ReadableStream döner; Express res'e pipe için Node stream'e çeviriyoruz
      if (body) {
        const nodeStream = Readable.fromWeb(body)
        nodeStream.on('error', (err) => {
          serverLogger.warn(`[Proxy] stream closed: ${req.method} ${proxyPathForLog(req)} - ${err?.message || err}`)
          if (!res.headersSent) {
            res.status(502).json({ error: 'Upstream yanıtı tamamlanamadı.' })
          } else {
            res.end()
          }
        })
        res.on('close', () => {
          nodeStream.destroy()
        })
        nodeStream.pipe(res)
      } else res.end()
    })
    .catch((err) => {
      if (res.headersSent) return
      const durationMs = Date.now() - startTime
      const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      serverLogger.error(`[Proxy] <-- FAIL ${req.method} ${proxyPathForLog(req)} 502 (${durationMs}ms) trace=${traceId}`)
      res.status(502).json({
        error: 'Upstream hizmetine şu an ulaşılamıyor.',
        traceId,
      })
    })
}

// Discord OAuth (BFF callback) — ortam değişkenleri
const DISCORD_CLIENT_ID = (process.env.DISCORD_CLIENT_ID || '').trim()
const DISCORD_CLIENT_SECRET = (process.env.DISCORD_CLIENT_SECRET || '').trim()
const DISCORD_REDIRECT_URI = (process.env.DISCORD_REDIRECT_URI || '').trim()
const DISCORD_BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || '').trim()
const TURNSTILE_SECRET_KEY = (process.env.TURNSTILE_SECRET_KEY || '').trim()

/**
 * Cloudflare Turnstile server-side doğrulama (callback brute-force / bot trafiği).
 * TURNSTILE_SECRET_KEY tanımlıysa istemci turnstileToken göndermek zorundadır.
 */
async function verifyTurnstileToken(token, remoteIp) {
  if (!TURNSTILE_SECRET_KEY || !token || typeof token !== 'string') return false
  const body = new URLSearchParams()
  body.set('secret', TURNSTILE_SECRET_KEY)
  body.set('response', token.trim())
  if (remoteIp && typeof remoteIp === 'string') body.set('remoteip', remoteIp)
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) return false
  const data = await r.json()
  return data.success === true
}

function buildRedisRateLimitStore(prefix) {
  if (!redisClient) return undefined
  return new RateLimitRedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix,
  })
}

// Rate limiting — auth endpoint'leri için sıkı, genel API için geniş
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
  store: buildRedisRateLimitStore('deveng:web:rl:auth:'),
  skip: (req) => {
    if (req.method !== 'GET') return false
    const p = req.path || ''
    return p === '/api/auth/session' || p.startsWith('/api/auth/session/')
  },
})
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
  store: buildRedisRateLimitStore('deveng:web:rl:api:'),
})
app.use('/api/auth', authLimiter)
app.use('/api', apiLimiter)

// ─── CSRF double-submit token (defense-in-depth) ──────────────────────────────
// SameSite=Strict zaten temel CSRF'i kapatır; bu katman:
//  1) HttpOnly olmayan `csrf-token` cookie'sini oturum başında set eder (SPA okur)
//  2) State-changing /api istekleri için `X-CSRF-Token` header'ı cookie ile eşleşmeli
// Discord OAuth callback Turnstile + CSRF'siz kabul edilir (henüz oturum/cookie yok).
const CSRF_COOKIE = 'deveng-csrf'
const CSRF_HEADER = 'x-csrf-token'

function ensureCsrfCookie(req, res) {
  const existing = req.cookies?.[CSRF_COOKIE]
  if (existing && /^[A-Za-z0-9_-]{32,}$/.test(existing)) return existing
  const token = randomBytes(24).toString('base64url')
  res.cookie(CSRF_COOKIE, token, {
    path: '/',
    httpOnly: false,           // SPA bunu fetch interceptor'da okuyacak
    secure: sessionCookieSecure,
    sameSite: 'lax',
    maxAge: SESSION_IDLE_MAX_AGE_MS,
  })
  return token
}

function csrfTokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
function isCsrfBypassPath(path) {
  // OAuth callback: kullanıcı henüz oturum/cookie sahibi değil; Turnstile ile korunuyor
  if (path === '/api/auth/discord/callback' || path.startsWith('/api/auth/discord/callback')) return true
  // Spotify: Discord oturumu cookie host farkı yüzünden gelmeyebilir; state ile korunur
  if (path === '/api/auth/spotify/callback' || path.startsWith('/api/auth/spotify/callback')) return true
  return false
}

app.use((req, res, next) => {
  // Cookie her isteğin başında set/refresh — SPA için her zaman okunabilir olsun
  ensureCsrfCookie(req, res)
  next()
})

app.use('/api', (req, res, next) => {
  if (CSRF_SAFE_METHODS.has(req.method)) return next()
  if (isCsrfBypassPath(req.path)) return next()
  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]
  if (!cookieToken || !headerToken || !csrfTokensMatch(cookieToken, String(headerToken))) {
    serverLogger.warn(`[CSRF] Token reddedildi: ${req.method} ${proxyPathForLog(req)}`)
    return res.status(403).json({
      code: 'csrf_token_invalid',
      message: 'CSRF doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.',
    })
  }
  next()
})

// Mutlak oturum ömrü tüm authenticated API isteklerinde uygulanır.
app.use('/api', requireActiveSession({ destroyOnExpire: true }))
// Session endpoint'i access token expiry'yi de deterministik döndürür; refresh endpoint'i refresh_token ile çalışabilsin.
app.use('/api/auth/session', requireActiveSession({ checkAccessTokenExpiry: true }))

// Session token'ı proxy isteklerine ekle (BFF: client token'ı server tarafında saklanır)
app.use('/api', (req, res, next) => {
  const path = (req.path || req.url || '').replace(/^\//, '')
  const isBffAuthEndpoint =
    (req.method === 'POST' && path.startsWith('auth/discord/callback')) ||
    (req.method === 'POST' && path.startsWith('auth/spotify/callback')) ||
    (req.method === 'GET' && path.startsWith('auth/session')) ||
    (req.method === 'POST' && path.startsWith('auth/refresh-token')) ||
    (req.method === 'POST' && path.startsWith('auth/logout'))

  if (!isBffAuthEndpoint) {
    const reason = getSessionExpiryReason(req, { checkAccessTokenExpiry: true })
    if (reason) {
      return res.status(401).json(sessionExpiredResponse(reason))
    }
  }

  if (req.session?.accessToken && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.session.accessToken}`
  }
  next()
})

// /api istekleri: önce proxy (bot-api'ye), Node'un hallettiği route'lar next() ile aşağıdaki route'lara düşer
app.use('/api', proxyToBotApi)

// Spotify OAuth callback — Discord session gerekmez; API state ile Discord user’a bağlar
app.post('/api/auth/spotify/callback', async (req, res) => {
  try {
    const { code, state } = req.body || {}
    if (!code || !state) {
      return res.status(400).json({ message: 'Spotify OAuth kodu veya state eksik.' })
    }
    if (!BOT_API_URL) {
      return res.status(503).json({ message: 'API üst katmanı yapılandırılmamış.' })
    }
    const upstream = await fetch(`${BOT_API_URL}/api/Music/spotify/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code, state }),
      signal: AbortSignal.timeout(20000),
    })
    const text = await upstream.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { message: text || 'Spotify bağlantısı başarısız.' }
    }
    if (!upstream.ok) {
      serverLogger.warn(`[Spotify OAuth] API ${upstream.status}: ${text?.slice(0, 300) || ''}`)
      return res.status(upstream.status).json(payload || { message: 'Spotify bağlantısı başarısız.' })
    }
    return res.status(200).json(payload)
  } catch (err) {
    serverLogger.error(`[Spotify OAuth] ${err?.message || err}`)
    return res.status(502).json({ message: 'Spotify bağlantısı şu an tamamlanamadı.' })
  }
})

// Discord OAuth callback endpoint
app.post('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code, turnstileToken } = req.body || {}

    if (!code) {
      return res.status(400).json({ error: 'Code parametresi gerekli' })
    }

    if (TURNSTILE_SECRET_KEY) {
      if (!turnstileToken || typeof turnstileToken !== 'string') {
        return res.status(400).json({ error: 'Güvenlik doğrulaması (Turnstile) gerekli' })
      }
      const ip = typeof req.ip === 'string' ? req.ip : ''
      const ok = await verifyTurnstileToken(turnstileToken, ip)
      if (!ok) {
        serverLogger.warn('[Auth] Turnstile siteverify başarısız')
        return res.status(403).json({ error: 'Güvenlik doğrulaması başarısız' })
      }
    }

    // 1. Discord'dan access token al
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      serverLogger.error(`Discord token hatası: ${errorText}`)
      return res.status(401).json({ error: 'Discord token alınamadı' })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token || null
    // Discord varsayılan: 604800 saniye (7 gün)
    const expiresIn = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 604800
    const loginAtMs = Date.now()
    const expiresAtMs = loginAtMs + expiresIn * 1000
    const absoluteExpiresAtMs = loginAtMs + SESSION_ABSOLUTE_MAX_AGE_MS

    // 2. Kullanıcı bilgilerini al
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Kullanıcı bilgileri alınamadı' })
    }

    const user = await userResponse.json()

    // 3. Kullanıcının sunucularını (guilds) al
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    let guilds = []
    if (guildsResponse.ok) {
      guilds = await guildsResponse.json()
    }

    // 4. Token'ları session'a yaz (HttpOnly cookie ile korunur — client'a gönderilmez)
    req.session.accessToken = accessToken
    req.session.refreshToken = refreshToken
    req.session.expiresAt = expiresAtMs
    req.session.loginAt = loginAtMs
    req.session.absoluteExpiresAt = absoluteExpiresAtMs
    req.session.userId = user.id

    // 5. Güvenli kullanıcı profili, guild listesi ve expiry bilgisini döndür
    const profileUser = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      globalName: user.global_name,
      verified: user.verified || false,
    }
    const profileEmail = optionalDiscordProfileEmail(user)
    if (profileEmail) profileUser.email = profileEmail

    res.json({
      user: profileUser,
      guilds: guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        permissions: guild.permissions,
        owner: guild.owner || false,
      })),
      expiresAt: expiresAtMs,
      absoluteExpiresAt: absoluteExpiresAtMs,
      expiresInMs: expiresIn * 1000,
    })
  } catch (error) {
    serverLogger.error(`Discord callback hatası: ${error.message}`)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

// /api/discord/* istekleri API'ye proxy edilir (Redis cache API tarafında)

// Discord token refresh — session'daki refresh_token ile Discord'dan yeni access_token alır.
// Bu handler proxy middleware'den önce kayıtlı olduğu için API'ye iletilmez; BFF'de çalışır.
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    const storedRefreshToken = req.session?.refreshToken
    if (!storedRefreshToken) {
      return res.status(401).json({ valid: false, message: 'Refresh token bulunamadı, lütfen tekrar giriş yapın.' })
    }

    serverLogger.info('[Auth] Discord refresh token exchange başlatılıyor')

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: storedRefreshToken,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      serverLogger.warn(`[Auth] Discord refresh token başarısız: ${tokenResponse.status} ${errorBody}`)
      // Geçersiz refresh token → session'ı temizle, client'ı logout'a yönlendir
      req.session.destroy((err) => {
        if (err) serverLogger.error(`Session destroy hatası: ${err.message}`)
      })
      clearSessionCookie(res)
      return res.status(401).json({ valid: false, message: 'Discord oturumu sona erdi, lütfen tekrar giriş yapın.' })
    }

    const tokenData = await tokenResponse.json()
    const newAccessToken = tokenData.access_token
    const newRefreshToken = tokenData.refresh_token || storedRefreshToken
    const expiresIn = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 604800
    const newExpiresAtMs = Date.now() + expiresIn * 1000

    // Session'ı yeni tokenlarla güncelle
    req.session.accessToken = newAccessToken
    req.session.refreshToken = newRefreshToken
    req.session.expiresAt = newExpiresAtMs

    serverLogger.info(`[Auth] Token yenilendi. Expires: ${new Date(newExpiresAtMs).toISOString()}`)

    return res.json({
      valid: true,
      message: 'Token yenilendi',
      expiresAt: newExpiresAtMs,
      absoluteExpiresAt: req.session.absoluteExpiresAt,
      expiresInMs: expiresIn * 1000,
      expiresInMinutes: Math.ceil(expiresIn / 60),
    })
  } catch (error) {
    serverLogger.error(`[Auth] Refresh token hatası: ${error.message}`)
    return res.status(500).json({ valid: false, message: 'Token yenileme sırasında bir hata oluştu.' })
  }
})

// Oturum özeti — guild listesi ve profil yalnızca bellekte; localStorage'da tutulmaz
app.get('/api/auth/session', async (req, res) => {
  try {
    const accessToken = req.session?.accessToken
    if (!accessToken) {
      return res.status(401).json({ authenticated: false })
    }

    const cached = await readDiscordSessionCache(req)
    if (cached?.user && Array.isArray(cached.guilds)) {
      return res.json({
        authenticated: true,
        expiresAt: req.session.expiresAt || Date.now(),
        absoluteExpiresAt: req.session.absoluteExpiresAt,
        user: cached.user,
        guilds: cached.guilds,
      })
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!userResponse.ok) {
      return res.status(401).json({ authenticated: false, message: 'Discord oturumu geçersiz.' })
    }
    const user = await userResponse.json()

    const fetchGuilds = async (attempt = 0) => {
      const r = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok && r.status !== 401 && r.status !== 403 && attempt < 2) {
        const retryAfterMs = r.status === 429 ? (Number(r.headers.get('retry-after') || '1') * 1000) : 600
        await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 2000)))
        return fetchGuilds(attempt + 1)
      }
      return r
    }
    const guildsResponse = await fetchGuilds()
    let guilds = []
    if (guildsResponse.ok) {
      guilds = await guildsResponse.json()
    }

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0', 10) % 5}.png`

    const guildsOut = guilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
        : undefined,
      permissions: guild.permissions,
      owner: guild.owner || false,
    }))

    const sessionUser = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      avatarUrl,
      globalName: user.global_name || null,
    }
    const sessionEmail = optionalDiscordProfileEmail(user)
    if (sessionEmail) sessionUser.email = sessionEmail

    await writeDiscordSessionCache(req, { user: sessionUser, guilds: guildsOut })

    return res.json({
      authenticated: true,
      expiresAt: req.session.expiresAt || Date.now(),
      absoluteExpiresAt: req.session.absoluteExpiresAt,
      user: sessionUser,
      guilds: guildsOut,
    })
  } catch (e) {
    serverLogger.error(`[Auth] session hatası: ${e.message}`)
    return res.status(500).json({ authenticated: false, message: 'Oturum okunamadı.' })
  }
})

// Session logout — cookie'yi temizle
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) serverLogger.error(`Session destroy hatası: ${err.message}`)
    clearSessionCookie(res)
    res.json({ success: true })
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Runtime public config (CSP: satır içi script yok; aynı kökenden /config.js)
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.send(`window.__CONFIG__=${JSON.stringify(buildPublicConfig())};`)
})

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = getSeoBaseUrl(req)
  const urls = SEO_PUBLIC_ROUTES.map((route) => {
    const loc = `${baseUrl}${route.path === '/' ? '/' : route.path}`
    return `  <url><loc>${escapeHtml(loc)}</loc><changefreq>weekly</changefreq><priority>${route.path === '/' ? '1.0' : '0.7'}</priority></url>`
  }).join('\n')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
})

// Statik SPA: dist/index'i doğrudan static ile verme; root aşağıdaki handler ile
const distPath = join(__dirname, 'dist')
// `.well-known/security.txt` için dotfiles: 'allow' (RFC 9116)
app.use(express.static(distPath, { index: false, dotfiles: 'allow' }))

function sendSpaIndexHtml(req, res, next) {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next()
  const indexPath = join(distPath, 'index.html')
  let html
  try {
    html = readFileSync(indexPath, 'utf-8')
  } catch (e) {
    serverLogger.error(`index.html okunamadı: ${e?.message || e}`)
    return res.status(500).send('Sunucu yapılandırma hatası')
  }
  const seo = resolveServerSeo(req.path, req)
  html = injectSeoIntoHtml(html, seo)
  html = injectHtmlLangAttribute(html, 'en')
  html = injectCrawlableIntoRootHtml(html, req, seo)
  if (seo.robots === 'noindex,nofollow') {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

app.get('/', sendSpaIndexHtml)
app.get('/{*splat}', sendSpaIndexHtml)

app.listen(PORT, () => {
  const baseUrl = (process.env.PUBLIC_PANEL_BASE_URL || '').trim() || `(port ${PORT})`
  serverLogger.info(`Accepting connections: ${baseUrl}`)
  serverLogger.info(`Discord OAuth: POST .../api/auth/discord/callback`)
  serverLogger.info(`Proxy target (BOT_API_URL): ${BOT_API_URL || 'BULUNAMADI — /api proxy 503 döner'}`)
  if (!BOT_API_URL) {
    serverLogger.warn(
      '[STARTUP] BOT_API_URL / API_BASE_URL / PUBLIC_API_URL tanımlı değil. Konteyner/stack ortamında örn. BOT_API_URL=http://deveng-discord-api:9000 verin.',
    )
    return
  }
  const probeUrl = `${BOT_API_URL}/api/auth/validate-token`
  const probeApi = (attempt = 1) => fetch(probeUrl, { method: 'GET', headers: { host: BOT_API_HOST }, signal: AbortSignal.timeout(5000) })
    .then((r) => {
      const ok = r.status === 401 || (r.status >= 200 && r.status < 300)
      if (ok) {
        serverLogger.info(`[STARTUP] Bot API bağlantısı doğrulandı ✓ (${BOT_API_URL})`)
      } else {
        serverLogger.warn(`[STARTUP] Bot API yanıt verdi ama beklenmeyen durum: ${r.status} (${BOT_API_URL})`)
      }
    })
    .catch((err) => {
      const cause = err.cause ? ` (cause: ${err.cause?.code ?? err.cause?.message ?? String(err.cause)})` : ''
      if (attempt < 5) {
        serverLogger.warn(`[STARTUP] Bot API hazır değil, tekrar denenecek (${attempt}/5): ${err.message}${cause}`)
        setTimeout(() => probeApi(attempt + 1), attempt * 2000)
        return
      }
      serverLogger.warn(`[STARTUP] Bot API bağlantısı doğrulanamadı; proxy istekleri gelince tekrar denenecek. Son hata: ${err.message}${cause}`)
    })
  probeApi()
})

