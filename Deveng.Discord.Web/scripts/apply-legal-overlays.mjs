/**
 * Applies hand-maintained legal body overlays onto en.json skeleton.
 * Overlay files: scripts/legal-overlays/{locale}.json (body sections only).
 * Skips locales listed in LEGAL_BODY_LOCALES unless --force.
 *
 * Usage:
 *   node scripts/apply-legal-overlays.mjs
 *   node scripts/apply-legal-overlays.mjs hu ja
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
const OVERLAY_DIR = path.join(__dirname, 'legal-overlays')
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

function deepMerge(base, overlay) {
  if (!overlay) return base
  if (typeof overlay !== 'object' || overlay === null) return overlay
  if (Array.isArray(overlay)) return overlay
  const out = { ...base }
  for (const [k, v] of Object.entries(overlay)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

function applyLocale(locale, { force = false } = {}) {
  if (!force && LEGAL_BODY_LOCALES.includes(locale)) {
    console.info(`apply-legal-overlays: skip ${locale} (hand-translated)`)
    return false
  }
  const overlayPath = path.join(OVERLAY_DIR, `${locale}.json`)
  if (!fs.existsSync(overlayPath)) {
    console.warn(`apply-legal-overlays: missing overlay ${overlayPath}`)
    return false
  }

  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'))
  const out = {
    meta: en.meta,
    footer: en.footer,
    public: en.public,
  }
  for (const section of BODY_SECTIONS) {
    out[section] = deepMerge(en[section], overlay[section] ?? overlay)
    if (overlay[section]) out[section] = overlay[section]
    else if (section in overlay && typeof overlay[section] === 'object') {
      out[section] = overlay[section]
    } else if (!overlay[section] && overlay.eula) {
      out[section] = en[section]
    }
  }

  // overlay is full body replacement when it contains eula key at root
  if (overlay.eula) {
    for (const section of BODY_SECTIONS) {
      if (overlay[section]) out[section] = overlay[section]
    }
  }

  const chrome = legalChromeByLocale[locale] ?? legalChromeByLocale.en
  out.footer = { ...out.footer, ...chrome.footer }
  out.public = { ...out.public, ...chrome.public }

  const target = path.join(LEGAL_DIR, `${locale}.json`)
  fs.writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.info(`apply-legal-overlays: wrote ${target}`)
  return true
}

function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const locales =
    args.filter((a) => !a.startsWith('--')).length > 0
      ? args.filter((a) => !a.startsWith('--'))
      : ALL_PANEL_LOCALES.filter((l) => l !== 'en')

  let n = 0
  for (const locale of locales) {
    if (applyLocale(locale, { force })) n++
  }
  console.info(`apply-legal-overlays: applied ${n} locale(s)`)
}

main()
