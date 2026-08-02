/**
 * Section-batch legal translator — fewer API calls, longer delays to avoid rate limits.
 * Preserves meta; applies footer/public chrome after translation.
 *
 * Usage:
 *   node scripts/translate-legal-batch.mjs hu
 *   node scripts/translate-legal-batch.mjs --all
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
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS ?? 8000)

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

const LT_TARGET = {
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

function ltCode(locale) {
  return LT_TARGET[locale] ?? locale.split('-')[0]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translateSection(sectionObj, locale) {
  const json = JSON.stringify(sectionObj)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { text } = await translate(json, { from: 'en', to: ltCode(locale), forceBatch: true })
      return JSON.parse(text)
    } catch (err) {
      const wait = DELAY_MS * attempt
      console.warn(`  retry ${attempt}/5 after error: ${err.message?.slice(0, 80)}`)
      await sleep(wait)
    }
  }
  throw new Error(`failed section translate for ${locale}`)
}

function applyChrome(bundle, locale) {
  const chrome = legalChromeByLocale[locale] ?? legalChromeByLocale.en
  bundle.footer = { ...bundle.footer, ...chrome.footer }
  bundle.public = { ...bundle.public, ...chrome.public }
}

async function translateLocale(locale) {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const out = {
    meta: en.meta,
    footer: en.footer,
    public: en.public,
  }

  console.info(`translate-legal-batch: ${locale} (${ltCode(locale)})`)
  for (const section of BODY_SECTIONS) {
    process.stdout.write(`  ${section}… `)
    out[section] = await translateSection(en[section], locale)
    console.info('ok')
    await sleep(DELAY_MS)
  }

  applyChrome(out, locale)
  const target = path.join(LEGAL_DIR, `${locale}.json`)
  fs.writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.info(`  wrote ${target}`)
}

function localesFromArgs(args) {
  if (args.includes('--all')) {
    return ALL_PANEL_LOCALES.filter((l) => l !== 'en' && !LEGAL_BODY_LOCALES.includes(l))
  }
  return args.filter((a) => !a.startsWith('--'))
}

async function main() {
  const locales = localesFromArgs(process.argv.slice(2))
  if (!locales.length) {
    console.error('Usage: node scripts/translate-legal-batch.mjs <locale>|--all')
    process.exit(1)
  }
  for (const locale of locales) {
    await translateLocale(locale)
  }
  console.info('translate-legal-batch: complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
