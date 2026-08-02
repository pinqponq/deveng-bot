/**
 * Patches localized legal chrome (footer/public) on existing legal bundles.
 * Usage: node scripts/apply-legal-chrome.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PANEL_LOCALES } from './discord-locale-config.mjs'
import { legalChromeByLocale } from './legal-footer-labels.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')

for (const lng of ALL_PANEL_LOCALES) {
  if (lng === 'en') continue
  const target = path.join(LEGAL_DIR, `${lng}.json`)
  if (!fs.existsSync(target)) continue
  const current = JSON.parse(fs.readFileSync(target, 'utf8'))
  const chrome = legalChromeByLocale[lng] ?? legalChromeByLocale.en
  current.footer = { ...current.footer, ...chrome.footer }
  current.public = { ...current.public, ...chrome.public }
  fs.writeFileSync(target, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
}

console.info('apply-legal-chrome: footer/public chrome patched')
