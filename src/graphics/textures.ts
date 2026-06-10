import { Texture } from 'pixi.js'
import { mulberry32 } from '../shared/random'

type Painter = (data: Uint8ClampedArray, size: number) => void

function canvasTexture(size: number, paint: Painter): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  paint(image.data, size)
  ctx.putImageData(image, 0, 0)
  return Texture.from(canvas)
}

export function softCircle(): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(32, 32, 32, 0, Math.PI * 2)
  ctx.fill()
  return Texture.from(canvas)
}

export function flowNoiseTexture(size = 256): Texture {
  const random = mulberry32(1337)
  const g = size >> 3
  const grid = new Float32Array((g + 1) * (g + 1) * 2)
  for (let i = 0; i < grid.length; i++) grid[i] = random() * 2 - 1

  const sample = (x: number, y: number, ch: number): number => {
    const gx = x / 8
    const gy = y / 8
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const fx = gx - x0
    const fy = gy - y0
    const smooth = (t: number) => t * t * (3 - 2 * t)
    const u = smooth(fx)
    const v = smooth(fy)
    const at = (ix: number, iy: number) => grid[((iy % (g + 1)) * (g + 1) + (ix % (g + 1))) * 2 + ch]
    const a = at(x0, y0)
    const b = at(x0 + 1, y0)
    const c = at(x0, y0 + 1)
    const d = at(x0 + 1, y0 + 1)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
  }

  return canvasTexture(size, (data, s) => {
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4
        data[i] = (sample(x, y, 0) * 0.5 + 0.5) * 255
        data[i + 1] = (sample(x, y, 1) * 0.5 + 0.5) * 255
        data[i + 2] = 128
        data[i + 3] = 255
      }
    }
  })
}

export function bayerTexture(): Texture {
  const matrix = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ]
  return canvasTexture(8, (data, s) => {
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4
        const value = (matrix[y * s + x] / 64) * 255
        data[i] = data[i + 1] = data[i + 2] = value
        data[i + 3] = 255
      }
    }
  })
}
