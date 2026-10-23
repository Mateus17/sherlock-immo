// Génère les icônes PNG à partir de public/icons/icon.svg (source unique du logo).
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
  await sharp(Buffer.from(src), { density: (72 * size) / 512 * 4 })
    .resize(size, size)
    .png()
    .toFile(new URL(file, dir).pathname)
  console.log('✓', file)
}
