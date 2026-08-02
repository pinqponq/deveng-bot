/**
 * Verifies legal overlay files exist and eula.intro differs from English.
 * Usage: node scripts/verify-legal-overlays.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OVERLAY_DIR = path.join(__dirname, 'overlays')
const EN_PATH = path.join(__dirname, '../src/locales/legal/en.json')

const EXPECTED = [
  'hu', 'cs', 'ko', 'it', 'nl', 'uk', 'vi', 'pl', 'pt-BR', 'th', 'ro', 'zh-TW',
  'ru', 'es-419', 'es-ES', 'sv', 'zh-CN', 'ja', 'ar', 'hr', 'cnr',
  'es', 'pt', 'zh',
]

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
const enIntro = en.eula.intro

const missing = []
const stillEnglish = []
const ok = []

for (const locale of EXPECTED) {
  const p = path.join(OVERLAY_DIR, `legal-${locale}.json`)
  if (!fs.existsSync(p)) {
    missing.push(locale)
    continue
  }
  const overlay = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (!overlay.eula?.intro || overlay.eula.intro === enIntro) {
    stillEnglish.push(locale)
  } else {
    ok.push(locale)
  }
}

console.info('verify-legal-overlays:')
console.info(`  ok (${ok.length}):`, ok.join(', ') || '(none)')
console.info(`  missing (${missing.length}):`, missing.join(', ') || '(none)')
console.info(`  still English (${stillEnglish.length}):`, stillEnglish.join(', ') || '(none)')
process.exit(missing.length + stillEnglish.length > 0 ? 1 : 0)
