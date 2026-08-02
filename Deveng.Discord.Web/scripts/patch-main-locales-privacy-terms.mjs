/**
 * Keeps translated main locale bundles (fr,de,…) aligned with neutral `en.json` legal copy.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '..', 'src', 'locales')
const locales = ['fr', 'de', 'es', 'pt', 'ar', 'zh', 'ru', 'ko', 'hr', 'cnr']

const section9Neutral = {
  section9Title: 'Service notices',
  section9Content:
    'The dashboard is offered without charge, with fair operational limits; contact support@deveng.global for account matters.',
}

const section9 = Object.fromEntries(locales.map((lng) => [lng, { ...section9Neutral }]))

const termsSection5Neutral =
  'Deveng may change feature availability and reasonable per-server quotas to keep the Service reliable. Core tools are available without fees from this dashboard; limits exist to keep the service reliable.'

const termsSection5 = Object.fromEntries(locales.map((lng) => [lng, termsSection5Neutral]))

const section8Replace = {
  fr: [
    'Pour exercer les droits : support@deveng.global',
    'Pour les droits liés à la confidentialité : privacy@deveng.global. Support général et compte : support@deveng.global',
  ],
  de: [
    'Zur Ausübung Ihrer Rechte: support@deveng.global',
    'Datenschutzrechte: privacy@deveng.global. Allgemeiner Support: support@deveng.global',
  ],
  es: [
    'Para ejercer derechos: support@deveng.global',
    'Privacidad y derechos: privacy@deveng.global. Soporte general y cuenta: support@deveng.global',
  ],
  pt: [
    'Para exercer direitos: support@deveng.global',
    'Direitos de privacidade: privacy@deveng.global. Suporte geral e conta: support@deveng.global',
  ],
  ar: [
    'لممارسة الحقوق: support@deveng.global',
    'حقوق الخصوصية: privacy@deveng.global. الدعم العام والحساب: support@deveng.global',
  ],
  zh: ['行使權利：support@deveng.global', '隱私權行使：privacy@deveng.global。一般支援與帳號：support@deveng.global'],
  ru: [
    'Чтобы воспользоваться своими правами: support@deveng.global',
    'Права на конфиденциальность: privacy@deveng.global. Общая поддержка и аккаунт: support@deveng.global',
  ],
  ko: ['권리 행사: support@deveng.global', '개인정보 권리: privacy@deveng.global. 일반 지원 및 계정: support@deveng.global'],
  hr: [
    'Za ostvarivanje prava: support@deveng.global',
    'Prava privatnosti: privacy@deveng.global. Opća podrška i račun: support@deveng.global',
  ],
  cnr: [
    'Za ostvarivanje prava: support@deveng.global',
    'Prava privatnosti: privacy@deveng.global. Opšta podrška i nalog: support@deveng.global',
  ],
}

const lastUpdatedTerms = {
  fr: 'Dernière mise à jour : mai 2026',
  de: 'Letzte Aktualisierung: Mai 2026',
  es: 'Última actualización: mayo de 2026',
  pt: 'Última atualização: maio de 2026',
  ar: 'آخر تحديث: مايو 2026',
  zh: '最後更新：2026 年 5 月',
  ru: 'Последнее обновление: май 2026 г.',
  ko: '최종 업데이트: 2026년 5월',
  hr: 'Posljednje ažuriranje: svibanj 2026.',
  cnr: 'Posljednje ažuriranje: maj 2026.',
}

const lastUpdatedPrivacy = lastUpdatedTerms

for (const lng of locales) {
  const fp = path.join(localesDir, `${lng}.json`)
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'))
  if (!j.privacy || !j.terms) continue

  j.terms.lastUpdated = lastUpdatedTerms[lng]
  j.terms.section5Content = termsSection5[lng]
  j.privacy.lastUpdated = lastUpdatedPrivacy[lng]

  const s9 = section9[lng]
  j.privacy.section9Title = s9.section9Title
  j.privacy.section9Content = s9.section9Content

  const [from, to] = section8Replace[lng]
  if (from && j.privacy.section8Content?.includes(from)) {
    j.privacy.section8Content = j.privacy.section8Content.replace(from, to)
  }

  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

console.log('patched main locale bundles from neutral baseline copy')
