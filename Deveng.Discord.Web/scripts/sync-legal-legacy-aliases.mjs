/**
 * Copies translated legal bodies to legacy alias locale files (es, pt, zh).
 * Usage: node scripts/sync-legal-legacy-aliases.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGACY_LOCALE_ALIASES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')

for (const [legacy, modern] of Object.entries(LEGACY_LOCALE_ALIASES)) {
  const src = path.join(LEGAL_DIR, `${modern}.json`)
  const dest = path.join(LEGAL_DIR, `${legacy}.json`)
  if (!fs.existsSync(src)) {
    console.warn(`sync-legal-legacy: missing ${modern}`)
    continue
  }
  fs.copyFileSync(src, dest)
  console.info(`sync-legal-legacy: ${modern} -> ${legacy}`)
}
