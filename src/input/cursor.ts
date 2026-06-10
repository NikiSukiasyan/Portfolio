import type { Environment } from '../runtime/environment'
import type { PointerState } from './pointer'

export class Cursor {
  private readonly enabled: boolean
  private x: number
  private y: number

  private el!: HTMLDivElement
  private coord!: HTMLElement
  private label!: HTMLElement

  constructor(env: Environment, private readonly pointer: PointerState) {
    this.x = pointer.raw.x
    this.y = pointer.raw.y
    this.enabled = env.cursor
    if (!this.enabled) return

    document.documentElement.classList.add('has-cursor')
    const el = document.createElement('div')
    el.className = 'reticle'
    el.innerHTML = `
      <div class="reticle__ring"></div>
      <div class="reticle__cross reticle__cross--h"></div>
      <div class="reticle__cross reticle__cross--v"></div>
      <div class="reticle__read"><span class="reticle__coord">00.00 · 00.00</span><span class="reticle__label"></span></div>`
    document.body.appendChild(el)
    this.el = el
    this.coord = el.querySelector('.reticle__coord') as HTMLElement
    this.label = el.querySelector('.reticle__label') as HTMLElement

    window.addEventListener('pointerover', (e) => {
      this.setTarget((e.target as Element).closest('[data-cursor]'))
    })
    window.addEventListener('pointerout', (e) => {
      if ((e.target as Element).closest('[data-cursor]')) this.setTarget(null)
    })
    window.addEventListener('pointerdown', () => el.classList.add('is-down'))
    window.addEventListener('pointerup', () => el.classList.remove('is-down'))
  }

  setTarget(target: Element | null): void {
    if (!this.enabled) return
    if (target) {
      this.el.classList.add('is-target')
      this.label.textContent = target.getAttribute('data-cursor') || ''
      const accent = target.getAttribute('data-accent')
      if (accent) this.el.style.setProperty('--reticle', accent)
    } else {
      this.el.classList.remove('is-target')
      this.label.textContent = ''
      this.el.style.removeProperty('--reticle')
    }
  }

  update(): void {
    if (!this.enabled) return
    this.x += (this.pointer.raw.x - this.x) * 0.22
    this.y += (this.pointer.raw.y - this.y) * 0.22
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`
    this.el.classList.toggle('is-fast', this.pointer.vel > 0.012)

    const nx = (this.pointer.norm.x * 0.5 + 0.5) * 100
    const ny = (this.pointer.norm.y * 0.5 + 0.5) * 100
    this.coord.textContent = `${nx.toFixed(2)} · ${ny.toFixed(2)}`
  }
}
