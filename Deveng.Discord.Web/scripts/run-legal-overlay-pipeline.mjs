/**
 * End-to-end legal overlay pipeline (when translation API quota is available).
 *
 * 1. Generate overlays: node scripts/generate-legal-overlays.mjs --all
 *    (or: node scripts/translate-legal-bodies.mjs --all --overlay-out)
 * 2. Apply: node scripts/apply-legal-overlays-batch.mjs --sync-aliases
 * 3. Verify: node scripts/verify-legal-overlays.mjs
 *
 * Hand maps (UTF-8 safe \\u escapes): scripts/raw-maps/{locale}.mjs
 *   -> node scripts/generate-maps-from-raw.mjs <locale>
 *   -> node scripts/build-overlay-from-map.mjs <locale>
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const node = process.execPath

function run(script, args = []) {
  const r = spawnSync(node, [path.join(__dirname, script), ...args], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const mode = process.argv[2] ?? 'help'
if (mode === 'generate') {
  run('generate-legal-overlays.mjs', ['--all'])
} else if (mode === 'apply') {
  run('apply-legal-overlays-batch.mjs', ['--sync-aliases'])
} else if (mode === 'verify') {
  run('verify-legal-overlays.mjs')
} else if (mode === 'all') {
  run('generate-legal-overlays.mjs', ['--all'])
  run('apply-legal-overlays-batch.mjs', ['--sync-aliases'])
  run('verify-legal-overlays.mjs')
} else {
  console.info(`Usage:
  node scripts/run-legal-overlay-pipeline.mjs generate
  node scripts/run-legal-overlay-pipeline.mjs apply
  node scripts/run-legal-overlay-pipeline.mjs verify
  node scripts/run-legal-overlay-pipeline.mjs all`)
}
