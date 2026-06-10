import gsap from 'gsap'
import { IDENTITY } from '../data/content'
import type { Stage } from '../graphics/stage'
import type { AudioEngine } from '../audio/engine'
import type { PointerState } from '../input/pointer'
import type { Director } from './director'

interface BootContext {
  ui: HTMLElement
  stage: Stage
  audio: AudioEngine
  pointer: PointerState
  director: Director
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export class Boot {
  private readonly ui: HTMLElement
  private readonly stage: Stage
  private readonly audio: AudioEngine
  private readonly pointer: PointerState
  private readonly director: Director

  private unlocked = false
  private gate!: HTMLDivElement
  private logEl!: HTMLElement
  private bar!: HTMLElement
  private prompt!: HTMLElement
  private fallbackTimer = 0

  constructor({ ui, stage, audio, pointer, director }: BootContext) {
    this.ui = ui
    this.stage = stage
    this.audio = audio
    this.pointer = pointer
    this.director = director
  }

  run(): void {
    const gate = document.createElement('div')
    gate.className = 'gate'
    gate.innerHTML = `
      <div class="gate__log mono"></div>
      <div class="gate__loader"><div class="gate__bar"></div></div>
      <div class="gate__prompt" style="opacity:0">
        <div class="gate__hold mono">[ HOLD TO ADAPT ]</div>
        <div class="gate__enter supreme">${IDENTITY.enterPrompt}</div>
        <div class="gate__ka">${IDENTITY.enterKa}</div>
        <div class="gate__ring"><svg viewBox="0 0 80 80"><circle class="ring-bg" cx="40" cy="40" r="36"/><circle class="ring-fg" cx="40" cy="40" r="36"/></svg></div>
      </div>`
    this.ui.appendChild(gate)
    this.gate = gate
    this.logEl = gate.querySelector('.gate__log') as HTMLElement
    this.bar = gate.querySelector('.gate__bar') as HTMLElement
    this.prompt = gate.querySelector('.gate__prompt') as HTMLElement

    this.typeLog().then(() => {
      gsap.to(this.bar, { width: '100%', duration: 0.7, ease: 'power1.inOut' })
      gsap.to(this.prompt, { opacity: 1, duration: 0.6, delay: 0.55, ease: 'power2.out' })
    })

    const fire = () => {
      if (this.unlocked) return
      this.unlocked = true
      this.audio.start()
      this.enter()
    }
    gate.addEventListener('pointerdown', fire)
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter') fire() })
  }

  private async typeLog(): Promise<void> {
    for (const line of IDENTITY.bootLog) {
      const row = document.createElement('div')
      row.className = 'gate__line'
      this.logEl.appendChild(row)
      await this.typeInto(row, line)
      await wait(70)
    }
  }

  private typeInto(row: HTMLElement, text: string): Promise<void> {
    return new Promise((resolve) => {
      let i = 0
      const tick = () => {
        row.textContent = text.slice(0, i) + (i < text.length ? '▮' : '')
        i++
        if (i <= text.length) setTimeout(tick, 11)
        else { row.textContent = text; resolve() }
      }
      tick()
    })
  }

  private enter(): void {
    document.documentElement.classList.add('booted')
    this.audio.glitch()
    const tl = gsap.timeline()
    tl.to(this.gate, { autoAlpha: 0, duration: 0.5, ease: 'power2.in' })
    tl.add(() => { this.gate.remove() })

    gsap.to(this.stage.photoFilter.uniforms, { uReveal: 0.9, duration: 1.6, ease: 'power2.out', delay: 0.1 })

    tl.add(() => this.director.enterIdentity(), 0.35)
    tl.add(() => this.armAdapt(), 0.6)
  }

  private armAdapt(): void {
    this.pointer.moved = false
    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      this.pointer.onFirstMove = null
      clearTimeout(this.fallbackTimer)
      this.director.adapt()
    }
    this.pointer.onFirstMove = go
    this.fallbackTimer = window.setTimeout(go, 2800)
    document.documentElement.classList.add('await-move')
  }
}
