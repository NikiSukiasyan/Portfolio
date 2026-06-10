import type { Vec2 } from '../shared/types'

export class PointerState {
  raw: Vec2
  norm: Vec2 = { x: 0, y: 0 }
  smooth: Vec2 = { x: 0, y: 0 }
  vel = 0
  moved = false
  down = false
  onFirstMove: (() => void) | null = null

  private readonly prev: Vec2

  constructor() {
    this.raw = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.prev = { ...this.raw }

    const onMove = (x: number, y: number) => {
      this.raw.x = x
      this.raw.y = y
      if (!this.moved) {
        this.moved = true
        this.onFirstMove?.()
      }
    }

    window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true })
    window.addEventListener('pointerdown', (e) => {
      this.down = true
      onMove(e.clientX, e.clientY)
    })
    window.addEventListener('pointerup', () => {
      this.down = false
    })
  }

  sample(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.norm.x = (this.raw.x / w) * 2 - 1
    this.norm.y = (this.raw.y / h) * 2 - 1
    this.smooth.x += (this.norm.x - this.smooth.x) * 0.12
    this.smooth.y += (this.norm.y - this.smooth.y) * 0.12
    const dx = this.raw.x - this.prev.x
    const dy = this.raw.y - this.prev.y
    const v = Math.sqrt(dx * dx + dy * dy) / Math.max(w, h)
    this.vel += (v - this.vel) * 0.25
    this.prev.x = this.raw.x
    this.prev.y = this.raw.y
  }
}
