/**
 * Bootstraps missing Discord locale files (main, legal, panelFaq).
 * Usage: node scripts/bootstrap-discord-locales.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALL_PANEL_LOCALES,
  localeBootstrapSource,
  LEGACY_LOCALE_ALIASES,
} from './discord-locale-config.mjs'
import { legalChromeByLocale } from './legal-footer-labels.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '../src/locales')
const LEGAL_DIR = path.join(LOCALES_DIR, 'legal')
const PANEL_FAQ_DIR = path.join(LOCALES_DIR, 'panelFaq')
const EN_MAIN = path.join(LOCALES_DIR, 'en.json')
const EN_LEGAL = path.join(LEGAL_DIR, 'en.json')
const EN_PANEL_FAQ = path.join(PANEL_FAQ_DIR, 'en.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function resolveMainSource(lng) {
  const mapped = localeBootstrapSource[lng]
  if (mapped) {
    const mappedPath = path.join(LOCALES_DIR, `${mapped}.json`)
    if (fs.existsSync(mappedPath)) return readJson(mappedPath)
  }
  return readJson(EN_MAIN)
}

function buildLegal(lng) {
  const base = structuredClone(readJson(EN_LEGAL))
  const chrome = legalChromeByLocale[lng] ?? legalChromeByLocale.en
  if (chrome?.footer) base.footer = { ...base.footer, ...chrome.footer }
  if (chrome?.public) base.public = { ...base.public, ...chrome.public }
  return base
}

function ensureMainLocale(lng) {
  const target = path.join(LOCALES_DIR, `${lng}.json`)
  if (fs.existsSync(target)) return false
  writeJson(target, resolveMainSource(lng))
  return true
}

function ensureLegalLocale(lng) {
  const target = path.join(LEGAL_DIR, `${lng}.json`)
  const created = !fs.existsSync(target)
  writeJson(target, buildLegal(lng))
  return created
}

function ensurePanelFaq(lng) {
  const target = path.join(PANEL_FAQ_DIR, `${lng}.json`)
  if (fs.existsSync(target)) return false
  writeJson(target, readJson(EN_PANEL_FAQ))
  return true
}

function migrateLegacyFiles() {
  for (const [legacy, modern] of Object.entries(LEGACY_LOCALE_ALIASES)) {
    const legacyPath = path.join(LOCALES_DIR, `${legacy}.json`)
    const modernPath = path.join(LOCALES_DIR, `${modern}.json`)
    if (fs.existsSync(legacyPath) && !fs.existsSync(modernPath)) {
      fs.copyFileSync(legacyPath, modernPath)
      console.info(`migrated main ${legacy} -> ${modern}`)
    }
    const legacyLegal = path.join(LEGAL_DIR, `${legacy}.json`)
    const modernLegal = path.join(LEGAL_DIR, `${modern}.json`)
    if (fs.existsSync(legacyLegal) && !fs.existsSync(modernLegal)) {
      fs.copyFileSync(legacyLegal, modernLegal)
      console.info(`migrated legal ${legacy} -> ${modern}`)
    }
    const legacyFaq = path.join(PANEL_FAQ_DIR, `${legacy}.json`)
    const modernFaq = path.join(PANEL_FAQ_DIR, `${modern}.json`)
    if (fs.existsSync(legacyFaq) && !fs.existsSync(modernFaq)) {
      fs.copyFileSync(legacyFaq, modernFaq)
      console.info(`migrated panelFaq ${legacy} -> ${modern}`)
    }
  }
}

function main() {
  migrateLegacyFiles()
  let createdMain = 0
  let createdLegal = 0
  let createdFaq = 0

  for (const lng of ALL_PANEL_LOCALES) {
    if (ensureMainLocale(lng)) createdMain++
    if (ensureLegalLocale(lng)) createdLegal++
    if (ensurePanelFaq(lng)) createdFaq++
  }

  console.info(
    `bootstrap-discord-locales: created main=${createdMain}, legal=${createdLegal}, panelFaq=${createdFaq}`,
  )
}

main()
