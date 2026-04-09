import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(scriptDir, '../public/icons')
const source = resolve(iconsDir, 'icon.svg')

const jobs = [
  { size: 180, out: 'apple-touch-icon.png' },
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' },
  { size: 512, out: 'maskable-512.png' },
]

for (const job of jobs) {
  execFileSync(
    'sips',
    ['-s', 'format', 'png', '--resampleHeightWidth', String(job.size), String(job.size), source, '--out', resolve(iconsDir, job.out)],
    { stdio: 'ignore' },
  )
}
