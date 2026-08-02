/**
 * Applies scripts/overlays/terms-privacy-{locale}.json onto src/locales/{locale}.json
 * Usage: node scripts/apply-terms-privacy-overlays.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PANEL_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OVERLAY_DIR = path.join(__dirname, 'overlays')
const LOCALES_DIR = path.join(__dirname, '../src/locales')

function apply(locale) {
  const overlayPath = path.join(OVERLAY_DIR, `terms-privacy-${locale}.json`)
  if (!fs.existsSync(overlayPath)) return false
  const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'))
  const targetPath = path.join(LOCALES_DIR, `${locale}.json`)
  const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
  if (overlay.terms) current.terms = overlay.terms
  if (overlay.privacy) current.privacy = overlay.privacy
  fs.writeFileSync(targetPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  console.info(`applied terms/privacy overlay: ${locale}`)
  return true
}

const args = process.argv.slice(2)
const locales = args.includes('--all')
  ? ALL_PANEL_LOCALES.filter((l) => l !== 'en')
  : args

let n = 0
for (const locale of locales) if (apply(locale)) n++
console.info(`apply-terms-privacy-overlays: ${n} locale(s)`)
