/**
 * Merges scripts/overlays/legal-{locale}.json into src/locales/legal/{locale}.json.
 * Preserves meta; applies footer/public chrome from legal-footer-labels.mjs.
 * Skips hand-translated locales (tr, fr, de) unless --force.
 *
 * Usage:
 *   node scripts/apply-legal-overlays-batch.mjs
 *   node scripts/apply-legal-overlays-batch.mjs hu ja
 *   node scripts/apply-legal-overlays-batch.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALL_PANEL_LOCALES,
  LEGAL_BODY_LOCALES,
  LEGACY_LOCALE_ALIASES,
} from './discord-locale-config.mjs'
import { legalChromeByLocale } from './legal-footer-labels.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const OVERLAY_DIR = path.join(__dirname, 'overlays')
const EN_PATH = path.join(LEGAL_DIR, 'en.json')

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

const OVERLAY_LOCALES = [
  'hu', 'cs', 'ko', 'it', 'nl', 'uk', 'vi', 'pl', 'pt-BR', 'th', 'ro', 'zh-TW',
  'ru', 'es-419', 'es-ES', 'sv', 'zh-CN', 'ja', 'ar', 'hr', 'cnr',
  'es', 'pt', 'zh',
]

function applyLocale(locale, { force = false } = {}) {
  if (!force && LEGAL_BODY_LOCALES.includes(locale)) {
    console.info(`apply-legal-overlays-batch: skip ${locale} (hand-translated)`)
    return false
  }

  const overlayPath = path.join(OVERLAY_DIR, `legal-${locale}.json`)
  if (!fs.existsSync(overlayPath)) {
    console.warn(`apply-legal-overlays-batch: missing ${overlayPath}`)
    return false
  }

  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const targetPath = path.join(LEGAL_DIR, `${locale}.json`)
  let base = { meta: en.meta, footer: en.footer, public: en.public }
  if (fs.existsSync(targetPath)) {
    try {
      base = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
    } catch {
      /* use en skeleton */
    }
  }

  const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'))
  const out = {
    meta: base.meta ?? en.meta,
    footer: base.footer ?? en.footer,
    public: base.public ?? en.public,
  }

  for (const section of BODY_SECTIONS) {
    out[section] = overlay[section] ?? en[section]
  }

  const chrome = legalChromeByLocale[locale] ?? legalChromeByLocale.en
  out.footer = { ...out.footer, ...chrome.footer }
  out.public = { ...out.public, ...chrome.public }

  fs.writeFileSync(targetPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.info(`apply-legal-overlays-batch: wrote ${targetPath}`)
  return true
}

function resolveLocales(args) {
  const force = args.includes('--force')
  const filtered = args.filter((a) => !a.startsWith('--'))
  if (filtered.includes('--all') || (filtered.length === 0 && args.includes('--all'))) {
    return { locales: OVERLAY_LOCALES, force }
  }
  if (filtered.length > 0) {
    return { locales: filtered, force }
  }
  return { locales: OVERLAY_LOCALES, force }
}

function main() {
  const args = process.argv.slice(2)
  const { locales, force } = resolveLocales(args)
  let n = 0
  for (const locale of locales) {
    if (applyLocale(locale, { force })) n++
  }
  if (args.includes('--sync-aliases')) {
    for (const [alias, source] of Object.entries(LEGACY_LOCALE_ALIASES)) {
      const aliasPath = path.join(LEGAL_DIR, `${alias}.json`)
      const sourcePath = path.join(LEGAL_DIR, `${source}.json`)
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, aliasPath)
        console.info(`apply-legal-overlays-batch: synced alias ${alias} <- ${source}`)
      }
    }
  }
  console.info(`apply-legal-overlays-batch: applied ${n} locale(s)`)
}

main()
