import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const distDir = path.resolve(process.cwd(), 'dist')
const html = await readFile(path.join(distDir, 'index.html'), 'utf8')
const worker = await readFile(path.join(distDir, '_worker.js'), 'utf8')
const fallback = await readFile(path.join(distDir, 'og-default.png'))

const requiredUniqueMarkers = [
  'property="og:title"',
  'property="og:description"',
  'property="og:type"',
  'property="og:url"',
  'property="og:image"',
  'property="og:image:secure_url"',
  'property="og:image:type"',
  'property="og:image:width"',
  'property="og:image:height"',
  'property="og:image:alt"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  'name="twitter:image:alt"',
  'rel="canonical"',
  'type="application/json+oembed"'
]

const failures = []
for (const marker of requiredUniqueMarkers) {
  const count = html.split(marker).length - 1
  if (count !== 1) failures.push(`${marker} expected once, found ${count}`)
}
if (!html.includes('content="noindex, nofollow, noarchive"')) failures.push('robots noindex policy is missing')
if (!html.includes('https://ldcstore.com/og/default/base.png?v=1')) failures.push('same-origin default OG image is missing')
if (!worker.includes("url.pathname.startsWith('/og/')")) failures.push('OG image proxy route is missing from built Worker')

const signature = [137, 80, 78, 71, 13, 10, 26, 10]
if (signature.some((value, index) => fallback[index] !== value)) failures.push('og-default.png is not a PNG')
if (fallback.length < 24 || fallback.readUInt32BE(16) !== 1200 || fallback.readUInt32BE(20) !== 630) {
  failures.push('og-default.png must be exactly 1200x630')
}
if (fallback.length > 500 * 1024) failures.push(`og-default.png exceeds 500 KB (${fallback.length} bytes)`)

if (failures.length) {
  console.error(`Open Graph validation failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Open Graph validation passed (${fallback.length} byte fallback PNG)`)
