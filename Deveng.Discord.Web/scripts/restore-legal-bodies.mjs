/**
 * One-off restore: hand-translated legal bodies from c8fae6b, keep current footer chrome.
 * Usage: node scripts/restore-legal-bodies.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { LEGAL_BODY_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const REPO_ROOT = path.join(__dirname, '../..')
const RESTORE_COMMIT = 'c8fae6b'

const trPublicChrome = {
  backHome: 'Ana sayfaya dön',
  lastUpdated: 'Son güncelleme: 10 May?s 2026',
  shellProductNav: 'Ürün',
  shellLegalNav: 'Yasal ve politikalar',
}

for (const lng of LEGAL_BODY_LOCALES) {
  const gitPath = `Deveng.Discord.Web/src/locales/legal/${lng}.json`
  const restored = JSON.parse(
    execSync(`git show ${RESTORE_COMMIT}:${gitPath}`, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    }),
  )
  const currentPath = path.join(LEGAL_DIR, `${lng}.json`)
  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
  restored.footer = current.footer
  if (lng === 'tr') {
    restored.public = { ...restored.public, ...trPublicChrome }
  }
  fs.writeFileSync(currentPath, `${JSON.stringify(restored, null, 2)}\n`, 'utf8')
  console.info(`restore-legal-bodies: ${lng} (${restored.eula.intro.slice(0, 48)}…)`)
}
