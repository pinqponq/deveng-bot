/**
 * Translates terms + privacy namespaces in main locale JSON files from en template.
 *
 * Usage:
 *   node scripts/translate-main-legal.mjs hu
 *   node scripts/translate-main-legal.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { translate } from '@vitalets/google-translate-api'
import {
  ALL_PANEL_LOCALES,
  LEGAL_BODY_LOCALES,
} from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '../src/locales')
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS ?? 8000)

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

async function translateBlock(obj, locale) {
  const json = JSON.stringify(obj)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { text } = await translate(json, { from: 'en', to: ltCode(locale), forceBatch: true })
      return JSON.parse(text)
    } catch (err) {
      await sleep(DELAY_MS * attempt)
      if (attempt === 5) throw err
    }
  }
}

async function translateLocale(locale) {
  const enPath = path.join(LOCALES_DIR, 'en.json')
  const targetPath = path.join(LOCALES_DIR, `${locale}.json`)
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'))

  console.info(`translate-main-legal: ${locale}`)
  current.terms = await translateBlock(en.terms, locale)
  await sleep(DELAY_MS)
  current.privacy = await translateBlock(en.privacy, locale)

  fs.writeFileSync(targetPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  console.info(`  wrote terms/privacy in ${targetPath}`)
}

function localesFromArgs(args) {
  if (args.includes('--all')) {
    return ALL_PANEL_LOCALES.filter((l) => l !== 'en' && !LEGAL_BODY_LOCALES.includes(l))
  }
  return args.filter((a) => !a.startsWith('--'))
}

async function main() {
  const locales = localesFromArgs(process.argv.slice(2))
  for (const locale of locales) {
    await translateLocale(locale)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
