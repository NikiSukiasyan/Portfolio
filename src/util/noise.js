import { Texture, ImageSource } from 'pixi.js'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(size, paint) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  paint(img.data, size)
  ctx.putImageData(img, 0, 0)
  return Texture.from(c)
}

export function flowNoiseTexture(size = 256) {
  const rnd = mulberry32(1337)
  const g = size >> 3
  const grid = new Float32Array((g + 1) * (g + 1) * 2)
  for (let i = 0; i < grid.length; i++) grid[i] = rnd() * 2 - 1
  const sample = (x, y, ch) => {
    const gx = x / 8, gy = y / 8
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const fx = gx - x0, fy = gy - y0
    const sm = (t) => t * t * (3 - 2 * t)
    const u = sm(fx), v = sm(fy)
    const at = (ix, iy) => grid[((iy % (g + 1)) * (g + 1) + (ix % (g + 1))) * 2 + ch]
    const a = at(x0, y0), b = at(x0 + 1, y0), cc = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1)
    return (a * (1 - u) + b * u) * (1 - v) + (cc * (1 - u) + d * u) * v
  }
  return canvasTexture(size, (data, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4
      data[i]     = (sample(x, y, 0) * 0.5 + 0.5) * 255
      data[i + 1] = (sample(x, y, 1) * 0.5 + 0.5) * 255
      data[i + 2] = 128
      data[i + 3] = 255
    }
  })
}

export function bayerTexture() {
  const M = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ]
  return canvasTexture(8, (data, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4
      const v = (M[y * s + x] / 64) * 255
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  })
}

export function pinkNoiseBuffer(ctx, seconds = 2) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const out = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  const rnd = mulberry32(7)
  for (let i = 0; i < len; i++) {
    const white = rnd() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buf
}

export function reverbIR(ctx, seconds = 2.5, decay = 3.2) {
  const len = ctx.sampleRate * seconds
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  const rnd = mulberry32(99)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return ir
}
