/**
 * Deep-translates legal JSON bodies from en.json into target locales.
 * Preserves meta, merges localized footer/public chrome from legal-footer-labels.
 *
 * Usage:
 *   node scripts/translate-legal-bodies.mjs hu
 *   node scripts/translate-legal-bodies.mjs --all
 *   node scripts/translate-legal-bodies.mjs --all --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { translate } from '@vitalets/google-translate-api'
import {
  ALL_PANEL_LOCALES,
  LEGAL_BODY_LOCALES,
} from './discord-locale-config.mjs'
import { legalChromeByLocale } from './legal-footer-labels.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const EN_PATH = path.join(LEGAL_DIR, 'en.json')

/** Keys whose string values must stay verbatim (emails, URLs, IDs) */
const PRESERVE_PATTERNS = [
  /^support@deveng\.global$/i,
  /^privacy@deveng\.global$/i,
  /^https?:\/\//i,
  /^GET \/health/i,
  /^8761221802$/,
  /^Deveng Bot$/,
  /^deveng\.app$/,
  /^deveng\.global$/,
  /^EULA$/,
  /^FAQ$/,
  /^GDPR$/,
  /^KVKK$/,
  /^Refund$/i,
]

/** Map panel locale codes to LibreTranslate target codes */
const LT_TARGET = {
  'es-ES': 'es',
  'es-419': 'es',
  'pt-BR': 'pt',
  pt: 'pt',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  zh: 'zh',
  cnr: 'sr',
  uk: 'uk',
}

const SKIP_TOP = new Set(['meta', 'footer', 'public'])

const BODY_SECTIONS = [
  'publicTrust',
  'eula',
  'copyright',
  'cookies',
  'gdpr',
  'faq',
  'termsAndConditions',
  'refundPolicy',
  'about',
  'deliveryTerms',
  'distanceSales',
  'preContract',
]

const cache = new Map()

function shouldPreserve(value) {
  if (!value || typeof value !== 'string') return true
  if (value.trim().length === 0) return true
  return PRESERVE_PATTERNS.some((re) => re.test(value.trim()))
}

function ltCode(locale) {
  return LT_TARGET[locale] ?? locale.split('-')[0]
}

async function translateText(text, target, retries = 3) {
  const key = `${target}::${text}`
  if (cache.has(key)) return cache.get(key)
  if (shouldPreserve(text)) {
    cache.set(key, text)
    return text
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { text: out } = await translate(text, { from: 'en', to: ltCode(target) })
      cache.set(key, out)
      await sleep(80)
      return out
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(500 * attempt)
    }
  }
  return text
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translateNode(node, target, pathParts = []) {
  if (typeof node === 'string') {
    return translateText(node, target)
  }
  if (Array.isArray(node)) {
    const out = []
    for (let i = 0; i < node.length; i++) {
      out.push(await translateNode(node[i], target, [...pathParts, String(i)]))
    }
    return out
  }
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      const p = [...pathParts, k]
      if (p.length === 1 && SKIP_TOP.has(k)) {
        out[k] = v
        continue
      }
      out[k] = await translateNode(v, target, p)
    }
    return out
  }
  return node
}

function applyChrome(bundle, locale) {
  const chrome = legalChromeByLocale[locale] ?? legalChromeByLocale.en
  bundle.footer = { ...bundle.footer, ...chrome.footer }
  bundle.public = { ...bundle.public, ...chrome.public }
  return bundle
}

async function translateLocale(locale, { dryRun = false } = {}) {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const targetPath = path.join(LEGAL_DIR, `${locale}.json`)

  let existingFooter = en.footer
  let existingPublic = en.public
  if (fs.existsSync(targetPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
      if (prev.footer) existingFooter = prev.footer
      if (prev.public) existingPublic = prev.public
    } catch {
      /* ignore */
    }
  }

  console.info(`translate-legal-bodies: ${locale} (${ltCode(locale)})`)
  const translated = await translateNode(structuredClone(en), locale)
  translated.meta = en.meta
  translated.footer = existingFooter
  translated.public = existingPublic
  applyChrome(translated, locale)

  if (dryRun) {
    console.info(`  dry-run sample: ${translated.eula.intro.slice(0, 80)}`)
    return
  }

  const overlayOnly = process.argv.includes('--overlay-out')
  if (overlayOnly) {
    const overlayDir = path.join(__dirname, 'overlays')
    fs.mkdirSync(overlayDir, { recursive: true })
    const body = {}
    for (const section of BODY_SECTIONS) {
      if (translated[section]) body[section] = translated[section]
    }
    const overlayPath = path.join(overlayDir, `legal-${locale}.json`)
    fs.writeFileSync(overlayPath, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
    console.info(`  wrote overlay ${overlayPath}`)
    return
  }

  fs.writeFileSync(targetPath, `${JSON.stringify(translated, null, 2)}\n`, 'utf8')
  console.info(`  wrote ${targetPath}`)
}

function localesToTranslate(requested) {
  if (requested.length === 0) return []
  if (requested[0] === '--all') {
    return ALL_PANEL_LOCALES.filter(
      (lng) => lng !== 'en' && !LEGAL_BODY_LOCALES.includes(lng),
    )
  }
  return requested.filter((lng) => lng !== 'en')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const locales = localesToTranslate(args.filter((a) => !a.startsWith('--')))
  if (locales.length === 0) {
    console.error('Usage: node scripts/translate-legal-bodies.mjs <locale>|--all [--dry-run]')
    process.exit(1)
  }

  for (const locale of locales) {
    await translateLocale(locale, { dryRun })
  }
  console.info(`translate-legal-bodies: done (${locales.length} locale(s), cache ${cache.size})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
