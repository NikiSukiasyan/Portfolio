import { Container, Sprite, Text, Texture, Graphics } from 'pixi.js'
import gsap from 'gsap'
import { GrainFilter, PhotoFilter, rgb } from './filters.js'
import { PALETTE } from '../content.js'

function softCircle() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill()
  return Texture.from(c)
}

export class Stage {
  constructor(app, env, pointer, portraitTexture) {
    this.app = app
    this.env = env
    this.pointer = pointer
    this.tex = portraitTexture
    this.accent = PALETTE.chameleon
    this.titleGroup = null

    const stage = app.stage
    this.world = new Container()
    stage.addChild(this.world)

    this.bg = new Container(); this.world.addChild(this.bg)
    this.particleLayer = new Container(); this.world.addChild(this.particleLayer)
    this.titleLayer = new Container(); this.world.addChild(this.titleLayer)
    this.sigilLayer = new Container(); this.world.addChild(this.sigilLayer)

    this._buildBackground()
    this._buildParticles()
    this._buildTitle()
    this._buildSigil()

    this.grain = new GrainFilter(this.accent)
    stage.filters = [this.grain.filter]

    this.resize()
  }

  _buildBackground() {

    this.void = new Graphics()
    this.bg.addChild(this.void)
  }

  _drawVoid(w, h) {
    const g = this.void
    g.clear()
    g.rect(0, 0, w, h).fill(PALETTE.pitch)

    const cx = w / 2, cy = h * 0.46
    for (let i = 6; i >= 0; i--) {
      const r = (Math.min(w, h) * 0.5) * (i / 6)
      g.circle(cx, cy, r).fill({ color: PALETTE.concrete, alpha: 0.06 })
    }
  }

  _buildParticles() {
    const n = Math.min(this.env.particles, 1100)
    this.particleTex = softCircle()
    this.particles = []
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.particleTex)
      s.anchor.set(0.5)
      s.tint = i % 9 === 0 ? this.accent : PALETTE.bone
      this.particleLayer.addChild(s)
      this.particles.push({
        s,
        depth: 0.2 + Math.random() * 0.8,
        bx: Math.random(), by: Math.random(),
        size: 0.4 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        sp: 0.1 + Math.random() * 0.4,
      })
    }
  }

  _buildTitle() {
    this.titleGroup = new Container()
    this.titleLayer.addChild(this.titleGroup)

    const fontSize = 300
    const base = { fontFamily: 'Clash Display, sans-serif', fontWeight: '700', fontSize, letterSpacing: -6 }

    this.titleBack = new Text({ text: 'SUKIASYAN', style: { ...base, fill: this.accent } })
    this.titleBack.anchor.set(0.5)
    this.titleBack.alpha = 0.0
    this.titleGroup.addChild(this.titleBack)

    this.titleMask = new Text({ text: 'SUKIASYAN', style: { ...base, fill: 0xffffff } })
    this.titleMask.anchor.set(0.5)
    this.titleGroup.addChild(this.titleMask)

    this.photo = new Sprite(this.tex)
    this.photo.anchor.set(0.5)
    this.photoFilter = new PhotoFilter({ dark: PALETTE.pitch, light: PALETTE.bone })
    this.photo.filters = [this.photoFilter.filter]
    this.photo.mask = this.titleMask
    this.titleGroup.addChild(this.photo)

    this.titleEdge = new Text({
      text: 'SUKIASYAN',
      style: { ...base, fill: 0x000000, stroke: { color: PALETTE.hazard, width: 2 } },
    })
    this.titleEdge.anchor.set(0.5)
    this.titleEdge.alpha = 0
    this.titleGroup.addChild(this.titleEdge)
  }

  _buildSigil() {

    this.sigil = new Container()
    this.sigilLayer.addChild(this.sigil)
    this.eye = new Graphics(); this.sigil.addChild(this.eye)
    this.pupil = new Graphics(); this.sigil.addChild(this.pupil)
    this._drawSigil()
    this.sigil.alpha = 0.0
    this._sigilTarget = 0
  }

  setSigil(v) { this._sigilTarget = v }

  _drawSigil() {
    const a = this.accent
    const e = this.eye; e.clear()

    e.moveTo(-34, 0)
    e.bezierCurveTo(-16, -20, 16, -20, 34, 0)
    e.bezierCurveTo(16, 20, -16, 20, -34, 0)
    e.stroke({ color: a, width: 2, alpha: 0.9 })
    e.circle(0, 0, 14).stroke({ color: a, width: 2, alpha: 0.8 })

    e.moveTo(34, 0)
    e.bezierCurveTo(50, 2, 54, 12, 46, 18)
    e.bezierCurveTo(42, 21, 38, 18, 40, 14)
    e.stroke({ color: a, width: 1.5, alpha: 0.7 })
    const p = this.pupil; p.clear()
    p.circle(0, 0, 5).fill({ color: a, alpha: 1 })
    p.circle(0, 0, 9).stroke({ color: a, width: 1, alpha: 0.5 })
  }

  setAccent(n) {
    this.accent = n
    this.grain.setAccent(n)
    if (this.adapted) {
      this.photoFilter.setLight(n)
      this.titleBack.style.fill = n
      this._drawSigil()
      for (const p of this.particles) if (p.s.tint !== PALETTE.bone) p.s.tint = n
    }
  }

  adapt(accent) {
    this.adapted = true
    this.accent = accent
    this.setAccent(accent)
    const u = this.photoFilter.uniforms
    gsap.fromTo(u, { uReveal: u.uReveal }, { uReveal: 1, duration: 1.4, ease: 'power2.out' })
    gsap.fromTo(u, { uColorMix: 0 }, { uColorMix: 0.45, duration: 1.6, ease: 'power2.out' })

    const from = rgb(PALETTE.bone), to = rgb(accent)
    const o = { t: 0 }
    gsap.to(o, {
      t: 1, duration: 1.4, ease: 'power2.out',
      onUpdate: () => {
        u.uColorLight[0] = from[0] + (to[0] - from[0]) * o.t
        u.uColorLight[1] = from[1] + (to[1] - from[1]) * o.t
        u.uColorLight[2] = from[2] + (to[2] - from[2]) * o.t
      },
    })
    gsap.to(this.titleEdge, { alpha: 0.5, duration: 1.2, ease: 'power2.out' })
    this._sigilTarget = 1

    const spike = { v: 5 }
    gsap.to(spike, { v: 1, duration: 0.7, ease: 'power3.out', onUpdate: () => { this._abSpike = spike.v } })
  }

  resize() {
    const w = this.app.screen.width, h = this.app.screen.height
    this._drawVoid(w, h)
    this.grain.resize(w, h)

    if (this.titleGroup) {
      const cx = w / 2, cy = h * 0.47
      this.titleGroup.position.set(cx, cy)
      const target = w * 0.94
      const natural = this.titleMask.width
      const sc = Math.min(target / natural, h * 0.5 / this.titleMask.height)
      this.titleGroup.scale.set(sc)

      const bw = this.titleMask.width, bh = this.titleMask.height
      const tw = this.tex.width, th = this.tex.height
      const cover = Math.max(bw / tw, bh / th) * 1.08
      this.photo.scale.set(cover)
      this.photo.position.set(0, 0)
    }

    this.sigilHome = { x: w * 0.63, y: h * 0.32 }
    this.sigil.position.set(this.sigilHome.x, this.sigilHome.y)
    this.sigil.scale.set(Math.min(1.4, w / 1100))
  }

  setReveal(v) { this.photoFilter.uniforms.uReveal = v }
  setColorMix(v) { this.photoFilter.uniforms.uColorMix = v }
  showSigil(v) { this.sigil.alpha = v }

  update(t, breath) {
    const p = this.pointer

    const px = p.smooth.x, py = p.smooth.y
    this.titleGroup && this.titleGroup.position.set(
      this.app.screen.width / 2 - px * 26,
      this.app.screen.height * 0.47 - py * 18,
    )

    this.photoFilter.setPointer(0.5 + px * 0.25, 0.5 + py * 0.25)
    this.photoFilter.update(t, breath)
    const ab = 1.0 + p.vel * 60 + (this._abSpike || 0)
    this.grain.update(t, breath, ab, this._grainIntensity)

    this.sigil.alpha += (this._sigilTarget - this.sigil.alpha) * 0.08
    if (this.sigilHome) {
      this.sigil.position.set(this.sigilHome.x - px * 30, this.sigilHome.y - py * 22)
    }
    const ex = this.sigil.x, ey = this.sigil.y
    const a = Math.atan2(p.raw.y - ey, p.raw.x - ex)
    const r = Math.min(6, Math.hypot(p.raw.x - ex, p.raw.y - ey) * 0.02)
    this.pupil.position.set(Math.cos(a) * r, Math.sin(a) * r)

    const w = this.app.screen.width, h = this.app.screen.height
    for (const pt of this.particles) {
      pt.ph += pt.sp * 0.02
      const driftx = Math.sin(pt.ph) * 8 * pt.depth
      const drifty = Math.cos(pt.ph * 0.8) * 6 * pt.depth
      pt.s.x = pt.bx * w + driftx - px * 40 * pt.depth
      pt.s.y = pt.by * h + drifty - py * 30 * pt.depth
      const sc = pt.size * pt.depth * (0.04 + (breath * 0.5 + 0.5) * 0.02)
      pt.s.scale.set(sc)
      pt.s.alpha = (0.05 + pt.depth * 0.18) * (0.7 + (breath * 0.5 + 0.5) * 0.5)
    }
  }

  set grainIntensity(v) { this._grainIntensity = v }
}
