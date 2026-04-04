/**
 * Generates minimal valid PNG icons for the extension.
 * Uses only Node.js built-ins (zlib) — no external deps.
 *
 * Icon design: amber (#F59E0B) rounded background with white "T"
 * Sizes: 16, 32, 48, 128
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/icons')
mkdirSync(OUT_DIR, { recursive: true })

// ── PNG helpers ────────────────────────────────────────────────────────────

function u32be(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = u32be(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  return Buffer.concat([len, typeBytes, data, u32be(crc32(crcInput))])
}

function makePng(size, pixels) {
  // pixels: Uint8Array of size*size*4 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = chunk('IHDR', Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0]), // bit depth 8, color type 2 (RGB)
  ]))

  // Build raw scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0 // filter None
    for (let x = 0; x < size; x++) {
      const pi = (y * size + x) * 4
      const ri = y * (1 + size * 3) + 1 + x * 3
      raw[ri]     = pixels[pi]     // R
      raw[ri + 1] = pixels[pi + 1] // G
      raw[ri + 2] = pixels[pi + 2] // B
      // alpha blended onto dark bg (#171717) if semi-transparent
    }
  }

  const idat = chunk('IDAT', deflateSync(raw))
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

// ── Draw a simple "T" icon ─────────────────────────────────────────────────

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  const bg   = [245, 158, 11]   // amber-500
  const dark = [23, 23, 23]     // neutral-900
  const pad  = Math.round(size * 0.12)
  const radius = Math.round(size * 0.22)

  // Fill all with dark background first
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = dark[0]
    pixels[i * 4 + 1] = dark[1]
    pixels[i * 4 + 2] = dark[2]
    pixels[i * 4 + 3] = 255
  }

  // Draw rounded amber square
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inSquare = x >= pad && x < size - pad && y >= pad && y < size - pad
      if (!inSquare) continue

      // Rounded corners
      const cx = Math.min(x - pad, size - pad - 1 - x + pad, 0) <= -radius
        ? true
        : (() => {
          // check corner rounding
          const dx = Math.max(pad + radius - x, x - (size - pad - radius - 1), 0)
          const dy = Math.max(pad + radius - y, y - (size - pad - radius - 1), 0)
          return dx * dx + dy * dy <= radius * radius
        })()

      if (inSquare) {
        const dx = Math.max(pad + radius - x, x - (size - pad - 1 - radius), 0)
        const dy = Math.max(pad + radius - y, y - (size - pad - 1 - radius), 0)
        if (dx * dx + dy * dy <= radius * radius) {
          const i = (y * size + x) * 4
          pixels[i]     = bg[0]
          pixels[i + 1] = bg[1]
          pixels[i + 2] = bg[2]
          pixels[i + 3] = 255
        }
      }
    }
  }

  // Draw white "T"
  const s = size - pad * 2
  const tW = Math.round(s * 0.55)  // top bar width
  const tH = Math.round(s * 0.15)  // top bar height
  const sW = Math.round(s * 0.18)  // stem width
  const sH = Math.round(s * 0.5)   // stem height
  const cx = Math.round(size / 2)
  const ty = pad + Math.round(s * 0.2)

  // top bar
  for (let y = ty; y < ty + tH; y++) {
    for (let x = cx - Math.round(tW / 2); x < cx + Math.round(tW / 2); x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const i = (y * size + x) * 4
      pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255
    }
  }
  // stem
  for (let y = ty + tH; y < ty + tH + sH; y++) {
    for (let x = cx - Math.round(sW / 2); x < cx + Math.round(sW / 2); x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const i = (y * size + x) * 4
      pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255
    }
  }

  return makePng(size, pixels)
}

// ── Generate all sizes ─────────────────────────────────────────────────────

for (const size of [16, 32, 48, 128]) {
  const png = drawIcon(size)
  const out = join(OUT_DIR, `icon-${size}.png`)
  writeFileSync(out, png)
  console.log(`✓ ${out} (${png.length} bytes)`)
}

console.log('Icons generated successfully.')
