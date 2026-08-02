/**
 * MyMemory legal translator — per-string within each section (reliable parsing).
 * Usage: node scripts/translate-legal-mymemory.mjs hu
 *        node scripts/translate-legal-mymemory.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALL_PANEL_LOCALES,
  LEGAL_BODY_LOCALES,
} from './discord-locale-config.mjs'
import { legalChromeByLocale } from './legal-footer-labels.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const LOCALES_DIR = path.join(__dirname, '../src/locales')
const EN_PATH = path.join(LEGAL_DIR, 'en.json')
const EMAIL = process.env.MYMEMORY_EMAIL ?? 'support@deveng.global'
const CHUNK = 450
const DELAY = Number(process.env.TRANSLATE_DELAY_MS ?? 250)

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

const MM_TARGET = {
  'es-ES': 'es',
  'es-419': 'es',
  'pt-BR': 'pt',
  pt: 'pt',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  zh: 'zh-TW',
  cnr: 'sr',
  uk: 'uk',
}

const PRESERVE = [
  /^support@deveng\.global$/i,
  /^privacy@deveng\.global$/i,
  /^https?:\/\//i,
  /^GET \/health/i,
  /^8761221802$/,
  /^Deveng Bot$/,
  /^deveng\.app$/,
  /^EULA$/,
  /^FAQ$/,
  /^GDPR$/,
  /^Refund$/i,
]

const cache = new Map()

function mmCode(locale) {
  return MM_TARGET[locale] ?? locale.split('-')[0]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function preserve(s) {
  return PRESERVE.some((re) => re.test(s.trim()))
}

function collectStrings(node, out = []) {
  if (typeof node === 'string') {
    out.push(node)
    return out
  }
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out)
    return out
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStrings(v, out)
  }
  return out
}

function rebuildStrings(node, values, idx = { i: 0 }) {
  if (typeof node === 'string') return values[idx.i++]
  if (Array.isArray(node)) return node.map((item) => rebuildStrings(item, values, idx))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = rebuildStrings(v, values, idx)
    return out
  }
  return node
}

async function mmTranslateText(text, locale) {
  const key = `${locale}::${text}`
  if (cache.has(key)) return cache.get(key)
  if (!text.trim() || preserve(text)) {
    cache.set(key, text)
    return text
  }
  let out = ''
  for (let i = 0; i < text.length; i += CHUNK) {
    const chunk = text.slice(i, i + CHUNK)
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}` +
      `&langpair=en|${mmCode(locale)}&de=${encodeURIComponent(EMAIL)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.responseStatus !== 200) {
      throw new Error(`MyMemory ${data.responseStatus}: ${data.responseDetails ?? 'quota/error'}`)
    }
    out += data.responseData.translatedText
    await sleep(DELAY)
  }
  cache.set(key, out)
  return out
}

async function translateObject(obj, locale) {
  const originals = collectStrings(obj)
  const translated = []
  for (const s of originals) {
    translated.push(await mmTranslateText(s, locale))
  }
  return rebuildStrings(obj, translated)
}

function applyChrome(bundle, locale) {
  const chrome = legalChromeByLocale[locale] ?? legalChromeByLocale.en
  bundle.footer = { ...bundle.footer, ...chrome.footer }
  bundle.public = { ...bundle.public, ...chrome.public }
}

async function translateLegalLocale(locale) {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const out = { meta: en.meta, footer: en.footer, public: en.public }
  console.info(`translate-legal-mymemory: ${locale} (${mmCode(locale)})`)
  for (const section of BODY_SECTIONS) {
    process.stdout.write(`  ${section}… `)
    out[section] = await translateObject(en[section], locale)
    console.info('ok')
  }
  applyChrome(out, locale)
  fs.writeFileSync(path.join(LEGAL_DIR, `${locale}.json`), `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.info(`  wrote legal/${locale}.json`)
}

async function translateMainLegal(locale) {
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const targetPath = path.join(LOCALES_DIR, `${locale}.json`)
  if (!fs.existsSync(targetPath)) return
  const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
  current.terms = await translateObject(en.terms, locale)
  current.privacy = await translateObject(en.privacy, locale)
  fs.writeFileSync(targetPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  console.info(`  wrote main/${locale}.json terms+privacy`)
}

function localesFromArgs(args) {
  if (args.includes('--all')) {
    return ALL_PANEL_LOCALES.filter((l) => l !== 'en' && !LEGAL_BODY_LOCALES.includes(l))
  }
  return args.filter((a) => !a.startsWith('--'))
}

async function main() {
  const locales = localesFromArgs(process.argv.slice(2))
  for (const locale of locales) {
    try {
      await translateLegalLocale(locale)
      await translateMainLegal(locale)
    } catch (err) {
      console.error(`FAILED ${locale}:`, err.message)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
