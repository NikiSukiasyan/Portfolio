import gsap from 'gsap'
import { IDENTITY } from '../content.js'

export class Boot {
  constructor({ ui, stage, audio, pointer, director, env }) {
    this.ui = ui; this.stage = stage; this.audio = audio
    this.pointer = pointer; this.director = director; this.env = env
    this.unlocked = false
  }

  run() {
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
    this.logEl = gate.querySelector('.gate__log')
    this.bar = gate.querySelector('.gate__bar')
    this.prompt = gate.querySelector('.gate__prompt')

    this._typeLog().then(() => {
      gsap.to(this.bar, { width: '100%', duration: 0.7, ease: 'power1.inOut' })
      gsap.to(this.prompt, { opacity: 1, duration: 0.6, delay: 0.55, ease: 'power2.out' })
    })

    const fire = (e) => {
      if (this.unlocked) return
      this.unlocked = true

      this.audio.start()
      this._enter()
    }
    gate.addEventListener('pointerdown', fire)
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter') fire(e) }, { once: false })
  }

  async _typeLog() {
    for (const line of IDENTITY.bootLog) {
      const row = document.createElement('div')
      row.className = 'gate__line'
      this.logEl.appendChild(row)
      await this._typeInto(row, line)
      this.audio && this.audio.blip && this.audio.blip(120)
      await wait(70)
    }
  }

  _typeInto(row, text) {
    return new Promise((res) => {
      let i = 0
      const tick = () => {
        row.textContent = text.slice(0, i) + (i < text.length ? '▮' : '')
        i++
        if (i <= text.length) setTimeout(tick, 11)
        else { row.textContent = text; res() }
      }
      tick()
    })
  }

  _enter() {
    document.documentElement.classList.add('booted')
    this.audio.glitch()
    const tl = gsap.timeline()
    tl.to(this.gate, { autoAlpha: 0, duration: 0.5, ease: 'power2.in' })
    tl.add(() => { this.gate.remove() })

    gsap.to(this.stage.photoFilter.uniforms, { uReveal: 0.9, duration: 1.6, ease: 'power2.out', delay: 0.1 })

    tl.add(() => this.director.enterIdentity(), 0.35)

    tl.add(() => this._armAdapt(), 0.6)
  }

  _armAdapt() {
    this.pointer.moved = false
    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      this.pointer.onFirstMove = null
      clearTimeout(this._fallback)
      this.director.adapt()
    }
    this.pointer.onFirstMove = go

    this._fallback = setTimeout(go, 2800)

    document.documentElement.classList.add('await-move')
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
