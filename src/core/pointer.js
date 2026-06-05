export class PointerState {
  constructor(env) {
    this.env = env
    this.raw = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.norm = { x: 0, y: 0 }
    this.smooth = { x: 0, y: 0 }
    this.vel = 0
    this.moved = false
    this.down = false
    this._prev = { ...this.raw }

    const onMove = (cx, cy) => {
      this.raw.x = cx; this.raw.y = cy
      if (!this.moved) { this.moved = true; this.onFirstMove && this.onFirstMove() }
    }
    window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true })
    window.addEventListener('pointerdown', (e) => { this.down = true; onMove(e.clientX, e.clientY) })
    window.addEventListener('pointerup', () => { this.down = false })
  }

  local(rect) {
    return {
      x: (this.raw.x - rect.x) / rect.w,
      y: (this.raw.y - rect.y) / rect.h,
    }
  }

  sample() {
    const w = window.innerWidth, h = window.innerHeight
    this.norm.x = (this.raw.x / w) * 2 - 1
    this.norm.y = (this.raw.y / h) * 2 - 1
    this.smooth.x += (this.norm.x - this.smooth.x) * 0.12
    this.smooth.y += (this.norm.y - this.smooth.y) * 0.12
    const dx = this.raw.x - this._prev.x, dy = this.raw.y - this._prev.y
    const v = Math.sqrt(dx * dx + dy * dy) / Math.max(w, h)
    this.vel += (v - this.vel) * 0.25
    this._prev.x = this.raw.x; this._prev.y = this.raw.y
  }
}
