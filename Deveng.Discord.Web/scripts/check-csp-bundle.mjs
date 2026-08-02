import fs from 'node:fs'
import path from 'node:path'

const assetsDir = path.resolve('dist/assets')
const patterns = [
  { name: 'eval()', re: /\beval\s*\(/g },
  { name: 'new Function', re: /\bnew\s+Function\b/g },
  { name: 'setTimeout(string)', re: /setTimeout\s*\(\s*['"`]/g },
  { name: 'setInterval(string)', re: /setInterval\s*\(\s*['"`]/g },
]

let violations = 0

for (const file of fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(assetsDir, file), 'utf8')
  for (const { name, re } of patterns) {
    const matches = content.match(re)
    if (matches?.length) {
      console.error(`[CSP] ${file}: ${name} (${matches.length})`)
      violations += matches.length
    }
  }
}

if (violations > 0) {
  console.error(`[CSP] ${violations} unsafe pattern(s) found in dist/assets`)
  process.exit(1)
}

console.log('[CSP] dist/assets bundle check passed')
