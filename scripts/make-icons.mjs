// Génère les icônes PNG et l'image d'aperçu des liens partagés (public/og.png)
// à partir de public/icons/icon.svg, source unique du logo.
// Usage : npm run icons
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const dir = new URL('../public/icons/', import.meta.url)
const svg = await readFile(new URL('icon.svg', dir), 'utf8')

// Variantes du SVG : fond carré plein (iOS et Android appliquent leur propre masque),
// et motif réduit à 80 % pour rester dans la zone sûre des icônes « maskable »
const square = svg.replace('rx="112"', 'rx="0"')
const maskable = square.replace('<g id="motif">', '<g id="motif" transform="translate(51.2 51.2) scale(0.8)">')

const outputs = [
  { file: 'icon-192.png', src: svg, size: 192 },
  { file: 'icon-512.png', src: svg, size: 512 },
  { file: 'maskable-512.png', src: maskable, size: 512 },
  { file: 'apple-touch-icon.png', src: square, size: 180 },
  { file: 'favicon-32.png', src: svg, size: 32 },
]

for (const { file, src, size } of outputs) {
  await sharp(Buffer.from(src), { density: ((72 * size) / 512) * 4 })
    .resize(size, size)
    .png()
    .toFile(new URL(file, dir).pathname)
  console.log('✓', file)
}

// Image d'aperçu (Open Graph) : 1200×630, logo + nom + accroche + bande A → G
const logo = svg.replace(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
  '<svg x="110" y="155" width="320" height="320" viewBox="0 0 512 512">',
)
const colors = ['#009c6d', '#52b153', '#a5cc74', '#f4e70f', '#f0b40f', '#eb8235', '#d7221f']
const bande = colors
  .map((c, i) => `<rect x="${(i * 1200) / 7}" y="0" width="${1200 / 7 + 1}" height="14" fill="${c}" />`)
  .join('')
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#25305a" /><stop offset="1" stop-color="#0e1226" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)" />
  ${bande}
  ${logo.replace(/<\?xml[^>]*>/, '')}
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#ffffff">
    <text x="480" y="300" font-size="92" font-weight="800">Sherlock <tspan fill="#f0a95a">Immo</tspan></text>
    <text x="482" y="370" font-size="34" fill="#c9cde3">Retrouvez la maison d'une annonce,</text>
    <text x="482" y="415" font-size="34" fill="#c9cde3">puis vérifiez ce qu'elle ne dit pas.</text>
    <text x="482" y="490" font-size="24" fill="#8f98c8">Gratuit · open source · données publiques</text>
  </g>
</svg>`
await sharp(Buffer.from(og)).png().toFile(new URL('../og.png', dir).pathname)
console.log('✓ og.png')
