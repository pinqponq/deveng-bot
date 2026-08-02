/**
 * Merges missing main-locale keys (vs en.json) into fr, es, de, ar, pt, zh, ru, ko, hr, cnr.
 * Also applies translation overrides when a locale still has the English fallback value.
 * Usage: node scripts/sync-missing-locale-keys.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations } from './locale-missing-translations.mjs'
import { recentBatchTranslations } from './locale-recent-i18n-batch.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '../src/locales')
import { ALL_PANEL_LOCALES } from './discord-locale-config.mjs'

const TARGET_LANGS = ALL_PANEL_LOCALES.filter((lng) => lng !== 'en')

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key))
    else out[key] = v
  }
  return out
}

function unflatten(flat) {
  const result = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
  return result
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {}
      deepMerge(target[k], v)
    } else {
      target[k] = v
    }
  }
  return target
}

function getLangTranslations(lng) {
  return {
    ...(translations[lng] ?? {}),
    ...(recentBatchTranslations[lng] ?? {}),
  }
}

const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
const enFlat = flatten(en)

for (const lng of TARGET_LANGS) {
  const filePath = path.join(LOCALES_DIR, `${lng}.json`)
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const currentFlat = flatten(current)
  const langTranslations = getLangTranslations(lng)

  const missingKeys = Object.keys(enFlat).filter((k) => !(k in currentFlat))
  const overrideKeys = Object.keys(langTranslations).filter(
    (k) => k in enFlat && currentFlat[k] === enFlat[k]
  )

  const patchFlat = {}
  for (const key of missingKeys) {
    patchFlat[key] = langTranslations[key] ?? enFlat[key]
  }
  for (const key of overrideKeys) {
    patchFlat[key] = langTranslations[key]
  }

  if (!Object.keys(patchFlat).length) {
    console.info(`${lng}: already complete`)
    continue
  }

  const merged = deepMerge(current, unflatten(patchFlat))
  fs.writeFileSync(filePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')

  const untranslatedMissing = missingKeys.filter((k) => !langTranslations[k])
  console.info(
    `${lng}: added ${missingKeys.length} keys (${untranslatedMissing.length} fell back to en), updated ${overrideKeys.length} EN fallbacks`
  )
}
