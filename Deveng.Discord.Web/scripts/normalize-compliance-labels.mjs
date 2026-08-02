/**
 * UI-facing legal labels → ücretsiz ürün çizgisine uygun nötr başlıklar / bağlantı metni.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesRoot = path.join(__dirname, '..', 'src', 'locales')
const legalRoot = path.join(localesRoot, 'legal')

const termsSection5Title = {
  en: 'Service availability & quotas',
  tr: 'Hizmet erişimi ve kotaları',
  fr: 'Disponibilité du service et quotas',
  de: 'Service-Verfügbarkeit und Kontingente',
  es: 'Disponibilidad del servicio y cuotas',
  pt: 'Disponibilidade do serviço e quotas',
  ar: 'توافر الخدمة والحدود',
  zh: '服務可用性與配额',
  ru: 'Доступность сервиса и квоты',
  ko: '서비스 가용성 및 할당량',
  hr: 'Dostupnost usluge i kvote',
  cnr: 'Dostupnost usluge i kvote',
}

const linkCommercial = {
  en: 'Supplementary terms (archive)',
  tr: 'Ek referans şartları (arşiv)',
  fr: 'Conditions complémentaires (archives)',
  de: 'Ergänzende Bedingungen (Archiv)',
  es: 'Condiciones complementarias (archivo)',
  pt: 'Termos complementares (arquivo)',
  ar: 'شروط تكميلية (أرشيف)',
  zh: '補充條款（歸檔）',
  ru: 'Дополнительные условия (архив)',
  ko: '부가 이용약관 (보관본)',
  hr: 'Dopunski uvjeti (arhiva)',
  cnr: 'Dopunski uvjeti (arhiv)',
}

/** @param {Record<string,string>} vals */
function walkStrings(node, vals) {
  if (typeof node === 'string') {
    let t = node
    for (const [from, to] of Object.entries(vals)) {
      if (t.includes(from)) t = t.split(from).join(to)
    }
    return t
  }
  if (Array.isArray(node)) return node.map((x) => walkStrings(x, vals))
  if (node && typeof node === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(node)) o[k] = walkStrings(v, vals)
    return o
  }
  return node
}

for (const f of fs.readdirSync(localesRoot)) {
  if (!f.endsWith('.json')) continue
  const lng = path.basename(f, '.json')
  const fp = path.join(localesRoot, f)
  let j = JSON.parse(fs.readFileSync(fp, 'utf8'))
  if (j.terms) j.terms.section5Title = termsSection5Title[lng] ?? termsSection5Title.en
  if (j.privacy) j.privacy.linkTermsCommercial = linkCommercial[lng] ?? linkCommercial.en
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

for (const f of fs.readdirSync(legalRoot)) {
  if (!f.endsWith('.json')) continue
  const fp = path.join(legalRoot, f)
  let j = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const legalReplacements = {
    'External external processor': 'A third‑party processor',
    PSPs: 'external processors',
    PSP: 'external processor',
    'Commercial tariff': 'Legacy schedule',
    commercially: 'operationally',
    Commercial: 'Legacy',
    commercial: 'legacy',
    'paid SKUs': 'legacy offers',
    'paid SKU': 'legacy offer',
  }
  j = walkStrings(j, legalReplacements)
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

console.info('normalize-compliance-labels: done')
