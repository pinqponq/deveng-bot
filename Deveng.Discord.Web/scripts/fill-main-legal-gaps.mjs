/**
 * Fills English-only terms/privacy leaves in hand-translated main locales (tr/fr/de).
 * Usage: node scripts/fill-main-legal-gaps.mjs de
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGAL_BODY_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '../src/locales')
const EMAIL = process.env.MYMEMORY_EMAIL ?? 'support@deveng.global'
const CHUNK = 450
const DELAY = 250

const MM_TARGET = { cnr: 'sr', uk: 'uk' }

function mmCode(locale) {
  return MM_TARGET[locale] ?? locale.split('-')[0]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function collectGaps(enNs, locNs, prefix, gaps) {
  for (const [k, v] of Object.entries(enNs)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      if (locNs[k] === v) gaps.push({ path: p, value: v })
    }
  }
}

function setPath(obj, pathStr, value) {
  const [ns, key] = pathStr.split('.')
  obj[ns][key] = value
}

async function translate(text, locale) {
  let out = ''
  for (let i = 0; i < text.length; i += CHUNK) {
    const chunk = text.slice(i, i + CHUNK)
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}` +
      `&langpair=en|${mmCode(locale)}&de=${encodeURIComponent(EMAIL)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.responseStatus !== 200) throw new Error(data.responseDetails)
    out += data.responseData.translatedText
    await sleep(DELAY)
  }
  return out
}

async function fillLocale(locale) {
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const p = path.join(LOCALES_DIR, `${locale}.json`)
  const loc = JSON.parse(fs.readFileSync(p, 'utf8'))
  const gaps = []
  collectGaps(en.terms, loc.terms, 'terms', gaps)
  collectGaps(en.privacy, loc.privacy, 'privacy', gaps)
  console.info(`fill-main-legal-gaps: ${locale} — ${gaps.length} gap(s)`)
  for (const gap of gaps) {
    setPath(loc, gap.path, await translate(gap.value, locale))
    console.info(`  ${gap.path}`)
  }
  fs.writeFileSync(p, `${JSON.stringify(loc, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = process.argv.slice(2)
  const locales = args.length ? args : LEGAL_BODY_LOCALES
  for (const locale of locales) await fillLocale(locale)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
