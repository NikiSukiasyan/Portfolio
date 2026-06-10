import gsap from 'gsap'
import {
  IDENTITY, PROJECTS, EMPLOYMENT, STACK, STACK_FRAME, LOCALES, CERTS, EDUCATION, CONTACT, EGG, PALETTE,
} from '../data/content'
import type { AudioMode, Project } from '../data/content'
import { hex, unpack } from '../shared/color'
import type { ChannelTriplet } from '../shared/color'
import type { Stage } from '../graphics/stage'
import type { AudioEngine } from '../audio/engine'
import type { PointerState } from '../input/pointer'

interface DirectorContext {
  ui: HTMLElement
  stage: Stage
  audio: AudioEngine
}

interface Frame {
  id: string
  label: string
  accent: number
  mode: AudioMode
  root: number
  proj?: Project
}

const el = (tag: string, className?: string, html?: string): HTMLElement => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (html != null) node.innerHTML = html
  return node
}

const typeTimers = new WeakMap<Element, number>()
const scrambleTimers = new WeakMap<Element, number>()

export class Director {
  private readonly ui: HTMLElement
  private readonly stage: Stage
  private readonly audio: AudioEngine

  private readonly frames: Frame[]
  private index = 0
  private busy = false
  private adapted = false
  private activeEl: HTMLElement | null = null

  private scenesRoot!: HTMLElement
  private sections: Record<string, HTMLElement> = {}
  private muteBtn!: HTMLButtonElement
  private dossier!: HTMLElement
  private railIdx!: HTMLElement
  private railName!: HTMLElement
  private railFill!: HTMLElement
  private nodes: HTMLElement[] = []
  private idle: gsap.core.Tween | null = null
  private acc: ChannelTriplet | null = null

  constructor({ ui, stage, audio }: DirectorContext) {
    this.ui = ui
    this.stage = stage
    this.audio = audio

    this.frames = this.defineFrames()
    this.buildScenes()
    this.buildHud()
    this.buildDossier()
    this.bindInput()
  }

  private defineFrames(): Frame[] {
    const frames: Frame[] = [
      { id: 'identity', label: 'IDENTITY', accent: PALETTE.chameleon, mode: 'aeolian', root: 196.0 },
      { id: 'index', label: 'PROJECT INDEX', accent: PALETTE.chameleon, mode: 'aeolian', root: 196.0 },
    ]
    PROJECTS.forEach((p) =>
      frames.push({ id: 'proj:' + p.key, label: p.name, accent: p.accent, mode: p.mode, root: p.root, proj: p }))
    frames.push({ id: 'stack', label: 'STACK + LOCALES', accent: PALETTE.chameleon, mode: 'major', root: 261.63 })
    frames.push({ id: 'status', label: 'STATUS', accent: PALETTE.chameleon, mode: 'major', root: 261.63 })
    return frames
  }

  private buildScenes(): void {
    this.scenesRoot = el('div', 'scenes')
    this.ui.appendChild(this.scenesRoot)
    this.sections = {}
    this.sections.identity = this.identityScene()
    this.sections.index = this.indexScene()
    PROJECTS.forEach((p, i) => { this.sections['proj:' + p.key] = this.projectScene(p, i) })
    this.sections.stack = this.stackScene()
    this.sections.status = this.statusScene()
    for (const k in this.sections) {
      this.sections[k].classList.add('scene')
      this.scenesRoot.appendChild(this.sections[k])
    }
    gsap.set(Object.values(this.sections), { autoAlpha: 0, y: 24 })
  }

  private identityScene(): HTMLElement {
    const s = el('section', 'scene--identity')
    s.innerHTML = `
      <div class="id-top">
        <span class="mono tag">SUKIASYAN.SYS</span>
        <span class="mono tag dim">v5.2 · ONLINE</span>
      </div>
      <div class="id-center">
        <div class="id-name display">NIKI</div>
        <div class="id-ka">${IDENTITY.nameKa}</div>
        <div class="id-hint mono">▸ move to adapt</div>
      </div>
      <div class="id-bottom">
        <p class="id-sub supreme">${IDENTITY.subtitle}</p>
        <p class="mono dim id-line">FULL-STACK DEVELOPER · TBILISI ${IDENTITY.coords} · ${IDENTITY.years}</p>
        <p class="mono egg">${EGG}</p>
      </div>`
    return s
  }

  private indexScene(): HTMLElement {
    const rows = PROJECTS.map((p) => `
      <button class="pidx" data-cursor="OPEN" data-accent="${hex(p.accent)}" data-jump="proj:${p.key}">
        <span class="pidx__n mono">${p.n}</span>
        <span class="pidx__name">${p.name}</span>
        <span class="pidx__co mono dim">${p.company}</span>
        <span class="pidx__pd mono dim">${p.period}</span>
        <span class="pidx__go mono">↳ open</span>
      </button>`).join('')
    const s = el('section', 'scene--index')
    s.innerHTML = `
      <div class="ghost display">WORK</div>
      <div class="idx-head mono dim">┌ ls /projects · ${PROJECTS.length} repositories · STATUS <span class="hz">AVAILABLE</span></div>
      <div class="idx-list">${rows}</div>
      <div class="idx-hint mono dim">open a project · or advance →</div>`
    return s
  }

  private projectScene(p: Project, i: number): HTMLElement {
    const side = i % 2 === 0 ? 'pj-left' : 'pj-right'
    const chips = p.skills.map((c) => `<span class="chip mono" data-cursor="${c}">${c}</span>`).join('')
    const points = p.points.map((l) => `<li class="supreme">${l}</li>`).join('')
    const ka = p.ka ? `<span class="pj-ka">${p.ka}</span>` : ''
    const s = el('section', `scene--project ${side}`)
    s.dataset.kind = 'project'
    s.innerHTML = `
      <div class="pj-num-wrap"><div class="pj-num display">${p.n}</div></div>
      <div class="pj-body">
        <div class="pj-meta mono dim"><span>${p.company}</span><span>${p.role}</span><span>${p.period}</span></div>
        <div class="pj-deploy mono"><span class="pj-deploy__cmd"></span><span class="pj-deploy__status"></span></div>
        <div class="pj-bar"><div class="pj-bar__fill"></div></div>
        <h2 class="pj-name display">${p.name}</h2>
        <div class="pj-uline"></div>
        <div class="pj-cine"><span class="mono dim">// project</span> <span class="gambetta">${p.title}</span> ${ka}</div>
        <p class="pj-desc supreme">${p.desc}</p>
        <ul class="pj-points">${points}</ul>
        <div class="pj-skills">${chips}</div>
      </div>`
    return s
  }

  private stackScene(): HTMLElement {
    const cluster = (name: string, items: string[]) => `
      <div class="cluster">
        <div class="cluster__h mono dim">${name}</div>
        <div class="cluster__items">${items.map((i) => `<span class="token" data-cursor="${i}">${i}</span>`).join('')}</div>
      </div>`
    const locales = LOCALES.map((l) => `<div class="locale"><span class="locale__n">${l.native}</span><span class="locale__e mono dim">${l.en}</span></div>`).join('')
    const certs = CERTS.map((c) => `<div class="cert"><span class="cert__v mono">VERIFIED ✓</span><span class="cert__n">${c.name}</span><span class="cert__m mono dim">${c.issuer} · ${c.date}</span></div>`).join('')
    const s = el('section', 'scene--stack')
    s.innerHTML = `
      <div class="ghost display">STACK</div>
      <p class="stack-frame supreme">${STACK_FRAME}</p>
      <div class="clusters">
        ${cluster('FOUNDATION', STACK.FOUNDATION)}
        ${cluster('SURFACE', STACK.SURFACE)}
        ${cluster('MEMORY', STACK.MEMORY)}
        ${cluster('SHIP', STACK.SHIP)}
      </div>
      <div class="stack-side">
        <div class="locales"><div class="side-h mono dim">LOCALES LOADED · 5</div>${locales}</div>
        <div class="modules"><div class="side-h mono dim">MODULES · VERIFIED</div>${certs}
          <div class="edu mono dim">${EDUCATION.degree} · ${EDUCATION.school} · ${EDUCATION.period}</div>
        </div>
      </div>`
    return s
  }

  private statusScene(): HTMLElement {
    const s = el('section', 'scene--status')
    s.innerHTML = `
      <div class="avail"><span class="avail__dot"></span><span class="avail__txt display">${CONTACT.headline}</span></div>
      <p class="status-close supreme">${CONTACT.closing}</p>
      <div class="contact">
        <button class="copy" data-cursor="COPY" data-copy="${CONTACT.email}"><span class="mono">${CONTACT.email}</span><span class="copy__hint mono dim">⌘ copy</span></button>
        <button class="copy" data-cursor="COPY" data-copy="${CONTACT.phone}"><span class="mono">${CONTACT.phone}</span><span class="copy__hint mono dim">⌘ copy</span></button>
        <div class="contact__row mono dim">${CONTACT.city}</div>
        <a class="contact__row mono link" href="${CONTACT.linkedinUrl}" target="_blank" rel="noopener" data-cursor="OPEN">${CONTACT.linkedin}</a>
        <a class="contact__row mono link" href="https://${CONTACT.github}" target="_blank" rel="noopener" data-cursor="OPEN">${CONTACT.github}</a>
      </div>
      <p class="status-live mono hz">${CONTACT.live}</p>
      <p class="status-bio supreme">${CONTACT.bio}</p>
      <div class="status-foot">
        <span class="signoff">${CONTACT.signoff}</span>
        <button class="restart mono" data-cursor="REBOOT">↺ RESTART SYSTEM</button>
      </div>`
    return s
  }

  private buildHud(): void {
    const hud = el('div', 'hud')
    this.ui.appendChild(hud)
    const ctr = el('div', 'hud-top')
    ctr.innerHTML = `
      <button class="hud-btn mono" data-cursor="TOGGLE" id="muteBtn">◼ AUDIO</button>
      <button class="hud-btn mono" data-cursor="DOSSIER" id="dossierBtn">[ R ] DOSSIER</button>`
    hud.appendChild(ctr)
    this.muteBtn = ctr.querySelector('#muteBtn') as HTMLButtonElement
    ;(ctr.querySelector('#dossierBtn') as HTMLElement).addEventListener('click', () => this.toggleDossier())
    this.muteBtn.addEventListener('click', () => this.toggleMute())
    this.reflectMute()

    const rail = el('div', 'hud-rail')
    const nodes = this.frames.map((f, i) =>
      `<button class="node" data-i="${i}" data-cursor="${f.label}"><span class="node__dot"></span></button>`).join('')
    rail.innerHTML = `
      <div class="rail-label mono"><span id="railIdx">00</span> · <span id="railName">IDENTITY</span></div>
      <div class="rail-graph">${nodes}<div class="rail-line"><div class="rail-fill" id="railFill"></div></div></div>
      <div class="rail-hint mono dim">scroll · drag · ← →</div>`
    hud.appendChild(rail)
    this.railIdx = rail.querySelector('#railIdx') as HTMLElement
    this.railName = rail.querySelector('#railName') as HTMLElement
    this.railFill = rail.querySelector('#railFill') as HTMLElement
    this.nodes = [...rail.querySelectorAll('.node')] as HTMLElement[]
    this.nodes.forEach((n) => n.addEventListener('click', () => this.goTo(Number(n.dataset.i))))
  }

  private reflectMute(): void {
    const m = this.audio.muted
    this.muteBtn.classList.toggle('is-off', m)
    this.muteBtn.textContent = m ? '◻ MUTED' : '◼ AUDIO'
  }

  private toggleMute(): void {
    this.audio.toggleMute()
    this.reflectMute()
  }

  private buildDossier(): void {
    const d = el('div', 'dossier')
    const emp = EMPLOYMENT.map((e) => `<div class="d-emp"><strong>${e.company}</strong><span>${e.role}</span><em>${e.period}</em></div>`).join('')
    const projs = PROJECTS.map((p) => `
      <div class="d-job">
        <div class="d-job__h"><strong>${p.name}</strong><span>${p.company} · ${p.role}</span><em>${p.period}</em></div>
        <ul>${p.points.map((l) => `<li>${l}</li>`).join('')}</ul>
        <div class="d-stack">${p.skills.join(' · ')}</div>
      </div>`).join('')
    const stackAll = Object.entries(STACK).map(([k, v]) => `<div><b>${k}</b> ${v.join(' · ')}</div>`).join('')
    d.innerHTML = `
      <div class="d-inner">
        <button class="d-close mono" data-cursor="CLOSE">✕ CLOSE · RETURN TO FILM</button>
        <h1>NIKI SUKIASYAN</h1>
        <p class="d-role">Full-Stack Developer · Tbilisi, Georgia · 5+ years</p>
        <p class="d-contact">${CONTACT.email} · ${CONTACT.phone} · ${CONTACT.linkedin} · ${CONTACT.github}</p>
        <p class="d-bio">${CONTACT.bio}</p>
        <h2>Employment</h2><div class="d-emps">${emp}</div>
        <h2>Selected Projects</h2>${projs}
        <h2>Stack</h2><div class="d-stackgrid">${stackAll}</div>
        <h2>Languages</h2><p>${LOCALES.map((l) => `${l.en} (${l.native})`).join(' · ')}</p>
        <h2>Certifications</h2><p>${CERTS.map((c) => `${c.name} — ${c.issuer}, ${c.date}`).join('<br>')}</p>
        <h2>Education</h2><p>${EDUCATION.degree} — ${EDUCATION.school}, ${EDUCATION.period}</p>
      </div>`
    this.ui.appendChild(d)
    this.dossier = d
    ;(d.querySelector('.d-close') as HTMLElement).addEventListener('click', () => this.toggleDossier(false))
  }

  toggleDossier(force?: boolean): void {
    const open = force != null ? force : !this.dossier.classList.contains('is-open')
    this.dossier.classList.toggle('is-open', open)
    document.documentElement.classList.toggle('dossier-open', open)
  }

  private bindInput(): void {
    let wheelLock = 0
    window.addEventListener('wheel', (e) => {
      if (this.dossier.classList.contains('is-open')) return
      const now = performance.now()
      if (now < wheelLock) return
      if (Math.abs(e.deltaY) < 14 && Math.abs(e.deltaX) < 14) return
      wheelLock = now + 760
      this.goTo(this.index + (e.deltaY + e.deltaX > 0 ? 1 : -1))
    }, { passive: true })

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') { this.toggleDossier(); return }
      if (e.key === 'm' || e.key === 'M') { this.toggleMute(); return }
      if (this.dossier.classList.contains('is-open')) { if (e.key === 'Escape') this.toggleDossier(false); return }
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); this.goTo(this.index + 1) }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); this.goTo(this.index - 1) }
    })

    let sx = 0
    let sy = 0
    let dragging = false
    window.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('.hud, .dossier, button, a')) return
      dragging = true
      sx = e.clientX
      sy = e.clientY
    })
    window.addEventListener('pointerup', (e) => {
      if (!dragging) return
      dragging = false
      if (this.dossier.classList.contains('is-open')) return
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy
      if (Math.abs(d) > 70) this.goTo(this.index + (d < 0 ? 1 : -1))
    })

    this.scenesRoot.addEventListener('click', (e) => {
      const target = e.target as Element
      const jump = target.closest('[data-jump]') as HTMLElement | null
      if (jump) {
        const idx = this.frames.findIndex((f) => f.id === jump.dataset.jump)
        if (idx >= 0) this.goTo(idx)
      }
      const copy = target.closest('[data-copy]') as HTMLElement | null
      if (copy) this.copyField(copy)
      if (target.closest('.restart')) this.goTo(0)
    })
  }

  private copyField(btn: HTMLElement): void {
    navigator.clipboard?.writeText(btn.dataset.copy ?? '')
    btn.classList.add('copied')
    this.audio.bell()
    const hint = btn.querySelector('.copy__hint') as HTMLElement
    const old = hint.textContent
    hint.textContent = '→ copied to buffer'
    setTimeout(() => { btn.classList.remove('copied'); hint.textContent = old }, 1400)
  }

  enterIdentity(): void {
    this.index = 0
    const s = this.sections.identity
    this.activeEl = s
    gsap.to(s, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out' })
    this.syncHud()
    this.applyFrame(this.frames[0], true)
  }

  goTo(target: number): void {
    const i = Math.max(0, Math.min(this.frames.length - 1, target))
    if (i === this.index || this.busy) return
    const dir = i > this.index ? 1 : -1
    const from = this.frames[this.index]
    const to = this.frames[i]
    const fromEl = this.sections[from.id]
    const toEl = this.sections[to.id]
    const kinetic = Boolean(from.proj || to.proj)
    this.busy = true
    this.idle?.kill()
    this.audio.glitch()
    document.documentElement.classList.add('is-glitch')

    const tl = gsap.timeline({
      onComplete: () => { this.busy = false; document.documentElement.classList.remove('is-glitch') },
    })
    const outX = kinetic ? -120 * dir : 0
    const outRot = kinetic ? -3 * dir : 0
    tl.to(fromEl, { autoAlpha: 0, x: outX, y: -22 * dir, rotation: outRot, duration: 0.4, ease: 'power2.in' }, 0)
    gsap.set(toEl, { x: kinetic ? 120 * dir : 0, y: 26 * dir, rotation: kinetic ? 3 * dir : 0 })
    tl.to(toEl, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'power3.out' }, 0.32)
    tl.add(() => this.enterScene(to), 0.34)

    this.index = i
    this.activeEl = toEl
    this.applyFrame(to)
    this.syncHud()
  }

  private enterScene(f: Frame): void {
    const sec = this.sections[f.id]
    if (sec.dataset.kind !== 'project') return
    const p = f.proj!
    const i = this.frames.indexOf(f)
    const d = i % 2 === 0 ? 1 : -1
    const q = (sel: string) => sec.querySelector(sel) as HTMLElement
    const body = q('.pj-body'); if (body) body.style.transform = ''
    const numWrap = q('.pj-num-wrap'); if (numWrap) numWrap.style.transform = ''
    const num = q('.pj-num')
    const name = q('.pj-name')
    const meta = q('.pj-meta')
    const cine = q('.pj-cine .gambetta')
    const cmd = q('.pj-deploy__cmd')
    const status = q('.pj-deploy__status')
    const bar = q('.pj-bar__fill')
    const uline = q('.pj-uline')
    const desc = q('.pj-desc')
    const pts = sec.querySelectorAll('.pj-points li')
    const chips = sec.querySelectorAll('.chip')

    this.idle?.kill()
    gsap.killTweensOf([num, name, meta, desc, uline, ...pts, ...chips])

    const live = /Present/.test(p.period)
    status.textContent = ''
    status.classList.toggle('is-live', live)
    gsap.set(bar, { width: '0%' })
    gsap.set(uline, { scaleX: 0 })

    const tl = gsap.timeline()
    tl.fromTo(num, { x: -200 * d, rotation: -16 * d, autoAlpha: 0, scale: 1.5 },
      { x: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, 0)
    tl.fromTo(meta, { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 }, 0.05)
    tl.fromTo(name, { x: 200 * d, skewX: 7 * d, autoAlpha: 0 },
      { x: 0, skewX: 0, autoAlpha: 1, duration: 0.6, ease: 'power4.out' }, 0.1)
    tl.to(uline, { scaleX: 1, duration: 0.6, ease: 'power3.inOut' }, 0.42)
    tl.fromTo(desc, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 0.36)
    tl.fromTo(pts, { x: 40 * d, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07 }, 0.42)
    tl.fromTo(chips, { y: 18, autoAlpha: 0, scale: 0.8 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(2)' }, 0.52)

    this.scramble(name, p.name, 0.7)
    if (cine) this.scramble(cine, p.title, 0.6)
    this.typewriter(cmd, `$ deploy ${p.key} --prod`, 0.55)
    gsap.to(bar, {
      width: '100%', duration: 0.9, delay: 0.4, ease: 'power1.inOut',
      onComplete: () => { status.textContent = live ? '● RUNNING' : '✓ DEPLOYED' },
    })

    this.idle = gsap.to(num, { rotation: d * 1.5, y: 16, scale: 1.03, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.9 })
  }

  private typewriter(elm: HTMLElement, text: string, dur = 0.5): void {
    const previous = typeTimers.get(elm)
    if (previous) clearInterval(previous)
    const total = Math.max(1, Math.round(dur * 60))
    let f = 0
    const id = window.setInterval(() => {
      f++
      const n = Math.ceil((f / total) * text.length)
      elm.textContent = text.slice(0, n) + (f < total ? '▮' : '')
      if (f >= total) { clearInterval(id); elm.textContent = text }
    }, 1000 / 60)
    typeTimers.set(elm, id)
  }

  private scramble(elm: HTMLElement, text: string, dur = 0.7): void {
    const previous = scrambleTimers.get(elm)
    if (previous) clearInterval(previous)
    const glyphs = '!<>-_\\/[]{}=+*^?#01'
    const total = Math.max(1, Math.round(dur * 60))
    let f = 0
    const id = window.setInterval(() => {
      f++
      const prog = f / total
      let out = ''
      for (let k = 0; k < text.length; k++) {
        const ch = text[k]
        if (ch === ' ') { out += ' '; continue }
        out += k / text.length < prog ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]
      }
      elm.textContent = out
      if (f >= total) { clearInterval(id); elm.textContent = text }
    }, 1000 / 60)
    scrambleTimers.set(elm, id)
  }

  adapt(): void {
    if (this.adapted) return
    this.adapted = true
    document.documentElement.classList.add('adapted')
    document.documentElement.classList.remove('await-move')
    const f = this.frames[this.index]
    this.stage.adapt(f.accent)
    this.audio.adapt()
    this.applyFrame(f)
  }

  private applyFrame(f: Frame, instant?: boolean): void {
    const accentN = this.adapted ? f.accent : 0x9a958c
    if (!this.acc) this.acc = unpack(accentN)
    const tgt = unpack(accentN)
    gsap.to(this.acc, {
      r: tgt.r, g: tgt.g, b: tgt.b, duration: instant ? 0 : 1.0, ease: 'power2.out',
      onUpdate: () => {
        const acc = this.acc!
        const r = Math.round(acc.r)
        const g = Math.round(acc.g)
        const b = Math.round(acc.b)
        document.documentElement.style.setProperty('--accent', `rgb(${r},${g},${b})`)
        this.stage.setAccent((r << 16) | (g << 8) | b)
      },
    })
    this.audio.setRoot(f.root)

    gsap.to(this.stage.titleGroup, { alpha: f.id === 'identity' ? 1 : 0.05, duration: instant ? 0 : 0.8, ease: 'power2.out' })
    if (this.adapted) this.stage.setSigil(f.id === 'identity' ? 1 : 0.14)
  }

  private syncHud(): void {
    this.railIdx.textContent = String(this.index).padStart(2, '0')
    this.railName.textContent = this.frames[this.index].label
    this.railFill.style.width = (this.index / (this.frames.length - 1)) * 100 + '%'
    this.nodes.forEach((n, i) => {
      n.classList.toggle('is-active', i <= this.index)
      n.classList.toggle('is-here', i === this.index)
    })
  }

  parallax(p: PointerState): void {
    if (!this.activeEl || this.busy) return
    const body = this.activeEl.querySelector('.pj-body') as HTMLElement | null
    const numWrap = this.activeEl.querySelector('.pj-num-wrap') as HTMLElement | null
    if (body) body.style.transform = `translate3d(${p.smooth.x * 10}px, ${p.smooth.y * 8}px, 0)`
    if (numWrap) numWrap.style.transform = `translate3d(${p.smooth.x * -34}px, ${p.smooth.y * -24}px, 0)`
  }
}
