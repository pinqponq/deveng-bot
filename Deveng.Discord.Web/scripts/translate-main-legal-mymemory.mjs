/**
 * Translates terms + privacy namespaces in main locale JSON (/terms, /privacy routes).
 * Usage: node scripts/translate-main-legal-mymemory.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PANEL_LOCALES, LEGAL_BODY_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '../src/locales')
const EMAIL = process.env.MYMEMORY_EMAIL ?? 'support@deveng.global'
const CHUNK = 450
const DELAY = Number(process.env.TRANSLATE_DELAY_MS ?? 200)

const MM_TARGET = {
  'es-ES': 'es', 'es-419': 'es', 'pt-BR': 'pt', pt: 'pt',
  'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', zh: 'zh-TW', cnr: 'sr', uk: 'uk',
}

const PRESERVE = [
  /^support@deveng\.global$/i, /^privacy@deveng\.global$/i, /^https?:\/\//i,
  /^privacyContactEmail$/i,
]

function mmCode(locale) {
  return MM_TARGET[locale] ?? locale.split('-')[0]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function collectStrings(node, out = []) {
  if (typeof node === 'string') { out.push(node); return out }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStrings(v, out)
  }
  return out
}

function rebuildStrings(node, values, idx = { i: 0 }) {
  if (typeof node === 'string') return values[idx.i++]
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = rebuildStrings(v, values, idx)
    return out
  }
  return node
}

function preserve(s) {
  return PRESERVE.some((re) => re.test(s.trim())) || s === 'privacy@deveng.global'
}

async function mmTranslate(text, locale) {
  if (!text.trim() || preserve(text)) return text
  let out = ''
  for (let i = 0; i < text.length; i += CHUNK) {
    const chunk = text.slice(i, i + CHUNK)
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}` +
      `&langpair=en|${mmCode(locale)}&de=${encodeURIComponent(EMAIL)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.responseStatus !== 200) {
      throw new Error(`MyMemory ${data.responseStatus}: ${data.responseDetails ?? 'error'}`)
    }
    out += data.responseData.translatedText
    await sleep(DELAY)
  }
  return out
}

async function translateObject(obj, locale) {
  const originals = collectStrings(obj)
  const translated = []
  for (const s of originals) translated.push(await mmTranslate(s, locale))
  return rebuildStrings(obj, translated)
}

function needsTranslation(locale, en) {
  if (LEGAL_BODY_LOCALES.includes(locale)) return false
  const p = path.join(LOCALES_DIR, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  return data.privacy?.section1Content === en.privacy.section1Content
}

async function translateLocale(locale, en) {
  if (!needsTranslation(locale, en)) {
    console.info(`skip ${locale}`)
    return
  }
  const targetPath = path.join(LOCALES_DIR, `${locale}.json`)
  const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
  console.info(`translate-main-legal: ${locale}`)
  current.terms = await translateObject(en.terms, locale)
  current.privacy = await translateObject(en.privacy, locale)
  fs.writeFileSync(targetPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  console.info(`  ok`)
}

async function main() {
  const args = process.argv.slice(2)
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const locales = args.includes('--all')
    ? ALL_PANEL_LOCALES.filter((l) => l !== 'en')
    : args.filter((a) => !a.startsWith('--'))
  for (const locale of locales) {
    try { await translateLocale(locale, en) }
    catch (e) { console.error(`FAILED ${locale}:`, e.message) }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
