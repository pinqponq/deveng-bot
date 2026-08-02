/**
 * Builds scripts/legal-footer-labels.mjs from existing legal/*.json chrome,
 * regional inheritance, and hardcoded patches for new Discord locales.
 * Usage: node scripts/build-legal-chrome.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PANEL_LOCALES } from './discord-locale-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LEGAL_DIR = path.join(__dirname, '../src/locales/legal')
const OUT = path.join(__dirname, 'legal-footer-labels.mjs')

/** Partial footer/public overrides for locales without dedicated legal files yet */
const CHROME_PATCHES = {
  hu: {
    footer: { legalHeading: 'JOGI', privacyHeading: 'ADATVÉDELEM', supportHeading: 'TÁMOGATÁS', termOfUse: 'Felhasználási feltételek', privacyPolicy: 'Adatvédelmi irányelvek', cookie: 'Cookie-szabályzat', gdprNotice: 'GDPR tájékoztató', faq: 'GYIK', contactUs: 'Kapcsolat', aboutUs: 'Rólunk' },
    public: { backHome: 'Vissza a f?oldalra', lastUpdated: 'Utolsó frissítés: 2026. május 10.', shellProductNav: 'Termék', shellLegalNav: 'Jogi és irányelvek' },
  },
  cs: {
    footer: { legalHeading: 'PRÁVNÍ', privacyHeading: 'SOUKROMÍ', supportHeading: 'PODPORA', termOfUse: 'Podmínky použití', privacyPolicy: 'Zásady ochrany osobních údaj?', cookie: 'Zásady cookies', gdprNotice: 'Oznámení GDPR', faq: '?asté dotazy', contactUs: 'Kontaktujte nás', aboutUs: 'O nás' },
    public: { backHome: 'Zp?t na úvod', lastUpdated: 'Poslední aktualizace: 10. kv?tna 2026', shellProductNav: 'Produkt', shellLegalNav: 'Právní a zásady' },
  },
  it: {
    footer: { legalHeading: 'LEGALE', privacyHeading: 'PRIVACY', supportHeading: 'SUPPORTO', termOfUse: 'Termini di utilizzo', privacyPolicy: 'Informativa sulla privacy', cookie: 'Politica sui cookie', gdprNotice: 'Informativa GDPR', faq: 'FAQ', contactUs: 'Contattaci', aboutUs: 'Chi siamo' },
    public: { backHome: 'Torna alla home', lastUpdated: 'Ultimo aggiornamento: 10 maggio 2026', shellProductNav: 'Prodotto', shellLegalNav: 'Legale e policy' },
  },
  nl: {
    footer: { legalHeading: 'JURIDISCH', privacyHeading: 'PRIVACY', supportHeading: 'ONDERSTEUNING', termOfUse: 'Gebruiksvoorwaarden', privacyPolicy: 'Privacybeleid', cookie: 'Cookiebeleid', gdprNotice: 'AVG-mededeling', faq: 'Veelgestelde vragen', contactUs: 'Contact', aboutUs: 'Over ons' },
    public: { backHome: 'Terug naar home', lastUpdated: 'Laatst bijgewerkt: 10 mei 2026', shellProductNav: 'Product', shellLegalNav: 'Juridisch en beleid' },
  },
  uk: {
    footer: { legalHeading: '??????? ??????????', privacyHeading: '????????????????', supportHeading: '?????????', termOfUse: '????? ????????????', privacyPolicy: '???????? ????????????????', cookie: '???????? cookie', gdprNotice: '???????????? GDPR', faq: '??????? ?? ?????????', contactUs: '??’??????? ? ????', aboutUs: '??? ???' },
    public: { backHome: '?? ???????', lastUpdated: '??????? ?????????: 10 ?????? 2026', shellProductNav: '???????', shellLegalNav: '??????? ?????????? ?? ????????' },
  },
  vi: {
    footer: { legalHeading: 'PHÁP LÝ', privacyHeading: 'QUY?N RIÊNG T?', supportHeading: 'H? TR?', termOfUse: '?i?u kho?n s? d?ng', privacyPolicy: 'Chính sách quy?n riêng t?', cookie: 'Chính sách cookie', gdprNotice: 'Thông báo GDPR', faq: 'Câu h?i th??ng g?p', contactUs: 'Liên h?', aboutUs: 'V? chúng tôi' },
    public: { backHome: 'V? trang ch?', lastUpdated: 'C?p nh?t l?n cu?i: 10 tháng 5 n?m 2026', shellProductNav: 'S?n ph?m', shellLegalNav: 'Pháp lý và chính sách' },
  },
  pl: {
    footer: { legalHeading: 'PRAWNE', privacyHeading: 'PRYWATNO??', supportHeading: 'WSPARCIE', termOfUse: 'Warunki u?ytkowania', privacyPolicy: 'Polityka prywatno?ci', cookie: 'Polityka plików cookie', gdprNotice: 'Informacja RODO', faq: 'FAQ', contactUs: 'Kontakt', aboutUs: 'O nas' },
    public: { backHome: 'Powrót do strony g?ównej', lastUpdated: 'Ostatnia aktualizacja: 10 maja 2026', shellProductNav: 'Produkt', shellLegalNav: 'Prawne i zasady' },
  },
  th: {
    footer: { legalHeading: '??????', privacyHeading: '???????????????', supportHeading: '???????????', termOfUse: '?????????????????', privacyPolicy: '?????????????????????', cookie: '????????????', gdprNotice: '?????? GDPR', faq: '??????????????', contactUs: '?????????', aboutUs: '????????????' },
    public: { backHome: '???????????', lastUpdated: '????????????: 10 ??????? 2026', shellProductNav: '?????????', shellLegalNav: '???????????????' },
  },
  ro: {
    footer: { legalHeading: 'LEGAL', privacyHeading: 'CONFIDEN?IALITATE', supportHeading: 'ASISTEN??', termOfUse: 'Termeni de utilizare', privacyPolicy: 'Politica de confiden?ialitate', cookie: 'Politica cookie', gdprNotice: 'Notificare GDPR', faq: 'Întreb?ri frecvente', contactUs: 'Contacta?i-ne', aboutUs: 'Despre noi' },
    public: { backHome: 'Înapoi acas?', lastUpdated: 'Ultima actualizare: 10 mai 2026', shellProductNav: 'Produs', shellLegalNav: 'Legal ?i politici' },
  },
  sv: {
    footer: { legalHeading: 'JURIDISKT', privacyHeading: 'INTEGRITET', supportHeading: 'SUPPORT', termOfUse: 'Användarvillkor', privacyPolicy: 'Integritetspolicy', cookie: 'Cookiepolicy', gdprNotice: 'GDPR-meddelande', faq: 'Vanliga frågor', contactUs: 'Kontakta oss', aboutUs: 'Om oss' },
    public: { backHome: 'Tillbaka till startsidan', lastUpdated: 'Senast uppdaterad: 10 maj 2026', shellProductNav: 'Produkt', shellLegalNav: 'Juridik och policy' },
  },
  ja: {
    footer: { legalHeading: '????', privacyHeading: '??????', supportHeading: '????', termOfUse: '????', privacyPolicy: '??????????', cookie: 'Cookie ????', gdprNotice: 'GDPR ??', faq: '??????', contactUs: '??????', aboutUs: '???????' },
    public: { backHome: '??????', lastUpdated: '????: 2026?5?10?', shellProductNav: '??', shellLegalNav: '?????????' },
  },
  'zh-CN': {
    footer: { legalHeading: '??', privacyHeading: '??', supportHeading: '??', termOfUse: '????', privacyPolicy: '????', cookie: 'Cookie ??', gdprNotice: 'GDPR ??', faq: '????', contactUs: '????', aboutUs: '????' },
    public: { backHome: '????', lastUpdated: '?????2026 ? 5 ? 10 ?', shellProductNav: '??', shellLegalNav: '?????' },
  },
  'es-419': {
    footer: { legalHeading: 'LEGAL', privacyHeading: 'PRIVACIDAD', supportHeading: 'SOPORTE', termOfUse: 'Términos y condiciones', privacyPolicy: 'Política de privacidad', cookie: 'Política de cookies', gdprNotice: 'Aviso de privacidad', faq: 'Preguntas frecuentes', contactUs: 'Contáctanos', aboutUs: 'Acerca de nosotros' },
    public: { backHome: 'Volver al inicio', lastUpdated: 'Última actualización: 10 de mayo de 2026', shellProductNav: 'Producto', shellLegalNav: 'Legal y políticas' },
  },
  'es-ES': {
    footer: { legalHeading: 'LEGAL', privacyHeading: 'PRIVACIDAD', supportHeading: 'SOPORTE', termOfUse: 'Términos y condiciones', privacyPolicy: 'Política de privacidad', cookie: 'Política de cookies', gdprNotice: 'Aviso RGPD', faq: 'Preguntas frecuentes', contactUs: 'Contáctanos', aboutUs: 'Sobre nosotros' },
    public: { backHome: 'Volver al inicio', lastUpdated: 'Última actualización: 10 de mayo de 2026', shellProductNav: 'Producto', shellLegalNav: 'Legal y políticas' },
  },
  'pt-BR': {
    footer: { legalHeading: 'JURÍDICO', privacyHeading: 'PRIVACIDADE', supportHeading: 'SUPORTE', termOfUse: 'Termos de uso', privacyPolicy: 'Política de privacidade', cookie: 'Política de cookies', gdprNotice: 'Aviso de privacidade', faq: 'Perguntas frequentes', contactUs: 'Fale conosco', aboutUs: 'Sobre nós' },
    public: { backHome: 'Voltar ao início', lastUpdated: 'Última atualização: 10 de maio de 2026', shellProductNav: 'Produto', shellLegalNav: 'Jurídico e políticas' },
  },
  'zh-TW': {
    footer: { legalHeading: '??', privacyHeading: '??', supportHeading: '??', termOfUse: '????', privacyPolicy: '?????', cookie: 'Cookie ??', gdprNotice: 'GDPR ??', faq: '????', contactUs: '????', aboutUs: '????' },
    public: { backHome: '????', lastUpdated: '?????2026 ? 5 ? 10 ?', shellProductNav: '??', shellLegalNav: '?????' },
  },
}

const chrome = {}
for (const file of fs.readdirSync(LEGAL_DIR)) {
  if (!file.endsWith('.json')) continue
  const lng = file.replace(/\.json$/, '')
  const data = JSON.parse(fs.readFileSync(path.join(LEGAL_DIR, file), 'utf8'))
  chrome[lng] = { footer: { ...data.footer }, public: { ...data.public } }
}

const inherit = { 'es-ES': 'es', 'es-419': 'es', 'pt-BR': 'pt', 'zh-TW': 'zh' }
for (const [target, source] of Object.entries(inherit)) {
  if (chrome[source]) {
    chrome[target] = structuredClone(chrome[target] ?? chrome[source])
  }
}

for (const lng of ALL_PANEL_LOCALES) {
  if (!chrome[lng]) chrome[lng] = structuredClone(chrome.en)
  const patch = CHROME_PATCHES[lng]
  if (patch) {
    chrome[lng].footer = { ...chrome[lng].footer, ...patch.footer }
    chrome[lng].public = { ...chrome[lng].public, ...patch.public }
  }
}

const body = `/**
 * Auto-generated by scripts/build-legal-chrome.mjs — do not edit by hand.
 */
export const legalChromeByLocale = ${JSON.stringify(chrome, null, 2)}
`
fs.writeFileSync(OUT, body, 'utf8')
console.info(`build-legal-chrome: wrote ${Object.keys(chrome).length} locales`)
