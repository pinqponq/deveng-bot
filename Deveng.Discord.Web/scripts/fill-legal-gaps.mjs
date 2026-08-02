/**
 * Fills remaining English-only string leaves in hand-translated legal locales (tr/fr/de).
 * Usage: node scripts/fill-legal-gaps.mjs de fr
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGAL_BODY_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const EN_PATH = path.join(LEGAL_DIR, 'en.json')
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

function walkPairs(enNode, locNode, pathParts, gaps) {
  if (typeof enNode === 'string' && typeof locNode === 'string') {
    if (enNode === locNode && pathParts[0] !== 'meta') {
      gaps.push({ path: pathParts.join('.'), value: enNode })
    }
    return
  }
  if (enNode && typeof enNode === 'object' && !Array.isArray(enNode)) {
    for (const k of Object.keys(enNode)) {
      walkPairs(enNode[k], locNode?.[k], [...pathParts, k], gaps)
    }
  }
}

function setPath(obj, pathStr, value) {
  const parts = pathStr.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
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
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const p = path.join(LEGAL_DIR, `${locale}.json`)
  const loc = JSON.parse(fs.readFileSync(p, 'utf8'))
  const gaps = []
  for (const [k, v] of Object.entries(en)) {
    if (k === 'meta') continue
    walkPairs(v, loc[k], [k], gaps)
  }
  console.info(`fill-legal-gaps: ${locale} — ${gaps.length} gap(s)`)
  for (const gap of gaps) {
    const t = await translate(gap.value, locale)
    setPath(loc, gap.path, t)
    console.info(`  ${gap.path}`)
  }
  fs.writeFileSync(p, `${JSON.stringify(loc, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = process.argv.slice(2)
  const locales = args.length ? args : LEGAL_BODY_LOCALES
  for (const locale of locales) {
    await fillLocale(locale)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
