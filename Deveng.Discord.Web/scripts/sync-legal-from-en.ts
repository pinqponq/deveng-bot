/**
 * Copies src/locales/legal/en.json to other locale legal bundles,
 * preserving each file's localized `footer` labels when possible.
 * Skips locales with non-English legal bodies (see LEGAL_BODY_LOCALES + auto-detect).
 *
 * Usage: npx tsx scripts/sync-legal-from-en.ts
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PANEL_LOCALES, LEGAL_BODY_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const EN_PATH = path.join(LEGAL_DIR, 'en.json')

function isBodyTranslated(locale: string, enIntro: string): boolean {
  if (LEGAL_BODY_LOCALES.includes(locale)) return true
  const p = path.join(LEGAL_DIR, `${locale}.json`)
  if (!fs.existsSync(p)) return false
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      eula?: { intro?: string }
    }
    return Boolean(data.eula?.intro && data.eula.intro !== enIntro)
  } catch {
    return false
  }
}

function main() {
  const base = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as Record<string, unknown>
  const enIntro = (base.eula as { intro?: string })?.intro ?? ''
  const skipped: string[] = []
  const synced: string[] = []

  for (const lng of ALL_PANEL_LOCALES) {
    if (lng === 'en') continue
    if (isBodyTranslated(lng, enIntro)) {
      skipped.push(lng)
      continue
    }
    const p = path.join(LEGAL_DIR, `${lng}.json`)
    let footer = base.footer as Record<string, unknown>
    try {
      const prev = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>
      if (prev.footer && typeof prev.footer === 'object') footer = prev.footer as Record<string, unknown>
    } catch {
      /** first run or missing file */
    }
    const out = structuredClone(base)
    out.footer = footer
    fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n')
    synced.push(lng)
  }
  console.info(
    `sync-legal-from-en: synced [${synced.join(', ') || 'none'}]; skipped translated [${skipped.join(', ')}].`,
  )
}

main()
