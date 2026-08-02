import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HAND = path.join(__dirname, 'hand')
const OUT = path.join(__dirname)

function mergeParts(prefix) {
  const parts = ['part1', 'part2', 'part3'].map((p) =>
    JSON.parse(fs.readFileSync(path.join(HAND, `${prefix}-${p}.json`), 'utf8')),
  )
  return Object.assign({}, ...parts)
}

function deepClone(o) {
  return JSON.parse(JSON.stringify(o))
}

function applyEs419(esES) {
  const o = deepClone(esES)
  const subs = [
    [/Añadir a Discord/g, 'Agregar a Discord'],
    [/añado/g, 'agrego'],
    [/Añada/g, 'Adicione'],
    [/añada/g, 'adicione'],
    [/correo electrónico/g, 'correo'],
    [/gremio/g, 'servidor'],
    [/Gremio/g, 'Servidor'],
    [/gremios/g, 'servidores'],
    [/Inicie sesión/g, 'Inicia sesión'],
    [/inicie sesión/g, 'inicia sesión'],
    [/Haga clic/g, 'Haz clic'],
    [/haga clic/g, 'haz clic'],
    [/Use el/g, 'Usa el'],
    [/Use los/g, 'Usa los'],
    [/Use la/g, 'Usa la'],
    [/Use /g, 'Usa '],
    [/Escriba/g, 'Escribe'],
    [/escriba/g, 'escribe'],
    [/Consulte/g, 'Consulta'],
    [/consulte/g, 'consulta'],
    [/Proporcione/g, 'Proporciona'],
    [/proporcione/g, 'proporciona'],
    [/Asegúrese/g, 'Asegúrate'],
    [/asegúrese/g, 'asegúrate'],
    [/Únase/g, 'Únete'],
    [/únase/g, 'únete'],
    [/Puede /g, 'Puedes '],
    [/puede /g, 'puedes '],
    [/Debe /g, 'Debes '],
    [/debe /g, 'debes '],
    [/Necesita /g, 'Necesitas '],
    [/necesita /g, 'necesitas '],
    [/Gestione/g, 'Gestiona'],
    [/gestione/g, 'gestiona'],
    [/Configure/g, 'Configura'],
    [/configure/g, 'configura'],
    [/Contacte/g, 'Contacta'],
    [/contacte/g, 'contacta'],
    [/Envíe/g, 'Envía'],
    [/envíe/g, 'envía'],
    [/Compruebe/g, 'Comprueba'],
    [/compruebe/g, 'comprueba'],
    [/Reintente/g, 'Reintenta'],
    [/reintente/g, 'reintenta'],
    [/Desactive/g, 'Desactiva'],
    [/desactive/g, 'desactiva'],
    [/Exija/g, 'Exige'],
    [/exija/g, 'exige'],
    [/Limite/g, 'Limita'],
    [/limite/g, 'limita'],
    [/Denuncie/g, 'Denuncia'],
    [/denuncie/g, 'denuncia'],
    [/Minimice/g, 'Minimiza'],
    [/minimice/g, 'minimiza'],
    [/No use/g, 'No uses'],
    [/no use/g, 'no uses'],
    [/Usted es/g, 'Eres'],
    [/usted es/g, 'eres'],
    [/Usted /g, 'Tú '],
    [/Le concedemos/g, 'Te concedemos'],
    [/le concedemos/g, 'te concedemos'],
    [/su servidor/g, 'tu servidor'],
    [/Su servidor/g, 'Tu servidor'],
    [/su cuenta/g, 'tu cuenta'],
    [/Su cuenta/g, 'Tu cuenta'],
    [/sus datos/g, 'tus datos'],
    [/Sus datos/g, 'Tus datos'],
    [/su dispositivo/g, 'tu dispositivo'],
    [/su ubicación/g, 'tu ubicación'],
    [/su audiencia/g, 'tu audiencia'],
    [/su configuración/g, 'tu configuración'],
    [/su plan/g, 'tu plan'],
    [/su jurisdicción/g, 'tu jurisdicción'],
    [/ID de su servidor/g, 'ID de tu servidor'],
    [/ID de su/g, 'ID de tu'],
    [/en su país/g, 'en tu país'],
    [/para su/g, 'para tu'],
    [/de su/g, 'de tu'],
    [/a su/g, 'a tu'],
    [/en su/g, 'en tu'],
    [/del Vendedor arriba/g, 'del Vendedor arriba'],
    [/ordenador/g, 'computadora'],
    [/móvil/g, 'celular'],
    [/NIF/g, 'NIF'],
    [/español europeo/g, 'español latinoamericano'],
  ]
  function walk(obj) {
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'string') {
        let s = obj[k]
        for (const [re, rep] of subs) s = s.replace(re, rep)
        obj[k] = s
      } else if (obj[k] && typeof obj[k] === 'object') walk(obj[k])
    }
  }
  walk(o)
  return o
}

function writeOverlay(locale, data) {
  const p = path.join(OUT, `legal-${locale}.json`)
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.info('wrote', p)
}

const esES = mergeParts('es-ES')
writeOverlay('es-ES', esES)
writeOverlay('es', esES)
writeOverlay('es-419', applyEs419(esES))

const ptBR = mergeParts('pt-BR')
writeOverlay('pt-BR', ptBR)
writeOverlay('pt', ptBR)

const zh = mergeParts('zh')
writeOverlay('zh', zh)

console.info('done')
