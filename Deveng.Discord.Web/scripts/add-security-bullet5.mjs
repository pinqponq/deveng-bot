import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const needle =
  '    "securityBullet4": "Privacy, cookies, and GDPR/KVKK notices describe retention, logging, and lawful bases — read them alongside this page."\n  },'
const insert =
  '    "securityBullet4": "Privacy, cookies, and GDPR/KVKK notices describe retention, logging, and lawful bases — read them alongside this page.",\n    "securityBullet5": "Public pages and the management panel are served over HTTPS (TLS); payment-card handling is external to our application tier when PSP flows exist."\n  },'

for (const f of ['de', 'fr', 'es', 'pt', 'ru', 'ko', 'zh', 'ar', 'hr', 'cnr']) {
  const p = path.join(__dirname, '../src/locales/legal', `${f}.json`)
  let s = fs.readFileSync(p, 'utf8')
  if (!s.includes('securityBullet5')) {
    s = s.replace(needle, insert)
    fs.writeFileSync(p, s)
    console.log('ok', f)
  }
}
