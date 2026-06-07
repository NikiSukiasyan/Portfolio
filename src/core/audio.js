import { reverbIR } from '../util/noise.js'

function silentWavUrl(seconds = 1) {
  const sr = 8000
  const n = Math.floor(sr * seconds)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const ws = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, n * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

const semi = (root, n) => root * Math.pow(2, n / 12)

const PROG = [
  { bass: 0, ch: [0, 4, 7] },
  { bass: 7, ch: [7, 11, 14] },
  { bass: 9, ch: [9, 12, 16] },
  { bass: 5, ch: [5, 9, 12] },
]

const PENTA = [0, 4, 7, 12, 16, 19]
const LEAD = { 0: 4, 6: 2, 12: 5, 18: 3, 24: 4, 30: 1 }

export class AudioEngine {
  constructor(env) {
    this.env = env
    this.ctx = null
    this.started = false
    this.muted = localStorage.getItem('chsys.mute') === '1'
    this.breath = 0
    this.root = 138.59
    this.bpm = 100
    this.step = 0
  }

  async start() {
    if (this.started) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = (this.ctx = new AC())
    this._unlockMedia()
    if (ctx.state === 'suspended') await ctx.resume()
    this.started = true

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -8; limiter.knee.value = 14; limiter.ratio.value = 6
    limiter.attack.value = 0.005; limiter.release.value = 0.25
    limiter.connect(ctx.destination)

    this.master = ctx.createGain(); this.master.gain.value = 0.0001
    this.master.connect(limiter)

    this.tone = ctx.createBiquadFilter()
    this.tone.type = 'lowpass'; this.tone.frequency.value = 5200; this.tone.Q.value = 0.3
    this.tone.connect(this.master)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = reverbIR(ctx, 2.6, 2.2)
    this.wet = ctx.createGain(); this.wet.gain.value = 0.3
    this.reverb.connect(this.wet); this.wet.connect(this.master)

    const beat = 60 / this.bpm
    this.delay = ctx.createDelay(1.5); this.delay.delayTime.value = beat
    this.fb = ctx.createGain(); this.fb.gain.value = 0.26
    this.delay.connect(this.fb); this.fb.connect(this.delay)
    this.echo = ctx.createGain(); this.echo.gain.value = 0.4
    this.delay.connect(this.echo); this.echo.connect(this.tone); this.echo.connect(this.reverb)

    this.pump = ctx.createGain(); this.pump.gain.value = 1
    this.pump.connect(this.tone); this.pump.connect(this.reverb)

    this.beat = ctx.createGain(); this.beat.gain.value = 0.9
    this.beat.connect(this.master)

    this._buildPad()

    const t = ctx.currentTime
    this.master.gain.setValueAtTime(0.0001, t)
    this.master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.55, t + 1.8)

    this.nextStepTime = ctx.currentTime + 0.2
    this._timer = setInterval(() => this._scheduler(), 25)
  }

  _buildPad() {
    const ctx = this.ctx
    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 1200; this.padFilter.Q.value = 3
    this.padFilter.connect(this.pump)

    this.padLfo = ctx.createOscillator(); this.padLfo.type = 'sine'; this.padLfo.frequency.value = 0.06
    this.padLfoGain = ctx.createGain(); this.padLfoGain.gain.value = 700
    this.padLfo.connect(this.padLfoGain); this.padLfoGain.connect(this.padFilter.frequency)
    this.padLfo.start()
    this.padGain = ctx.createGain(); this.padGain.gain.value = 0.0
    this.padGain.connect(this.padFilter)
    this.padOsc = []
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'
      o.detune.value = (i - 1) * 8
      const g = ctx.createGain(); g.gain.value = 0.16
      o.connect(g); g.connect(this.padGain); o.start()
      this.padOsc.push(o)
    }
    this.padGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2.0)
    this._setPadChord(PROG[0])
  }

  _setPadChord(c) {
    const t = this.ctx.currentTime
    this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(semi(this.root, c.ch[i % c.ch.length]), t, 0.3))
  }

  _scheduler() {
    if (!this.started) return
    const ctx = this.ctx
    const stepDur = (60 / this.bpm) / 2
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      this._playStep(this.step, this.nextStepTime)
      this.nextStepTime += stepDur
      this.step = (this.step + 1) % 32
    }
  }

  _playStep(step, when) {
    if (this.muted) return
    const inBar = step % 8
    const bar = Math.floor(step / 8)
    const c = PROG[bar % PROG.length]
    if (inBar === 0) this._setPadChord(c)

    this._bass(semi(this.root, c.bass) / 2, when)

    if (inBar === 0 || inBar === 4) this._kick(when)
    if (inBar === 2 || inBar === 6) this._clap(when)
    if (inBar % 2 === 1) this._hat(when, 0.6)

    if (this._adapted && LEAD[step] != null) {
      this._lead(semi(this.root * 2, c.ch[0] + PENTA[LEAD[step] % PENTA.length]), when)
    }
  }

  _bass(freq, when) {
    const ctx = this.ctx
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = freq; o2.detune.value = 6
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 7
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.pump)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.22, when + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.26)
    o.start(when); o2.start(when); o.stop(when + 0.28); o2.stop(when + 0.28)
    o.onended = () => { try { o.disconnect(); o2.disconnect(); lp.disconnect(); g.disconnect() } catch (e) {} }
  }

  _lead(freq, when) {
    const ctx = this.ctx
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 2
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(lp); lp.connect(g); g.connect(this.tone); g.connect(this.delay); g.connect(this.reverb)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.12, when + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7)
    o.start(when); o.stop(when + 0.75)
    o.onended = () => { try { o.disconnect(); lp.disconnect(); g.disconnect() } catch (e) {} }
  }

  _kick(when) {
    const ctx = this.ctx

    this.pump.gain.cancelScheduledValues(when)
    this.pump.gain.setValueAtTime(0.35, when)
    this.pump.gain.linearRampToValueAtTime(1.0, when + 0.22)
    const o = ctx.createOscillator(); o.type = 'sine'
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(g); g.connect(this.beat)
    o.frequency.setValueAtTime(140, when)
    o.frequency.exponentialRampToValueAtTime(46, when + 0.1)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.5, when + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.34)
    o.start(when); o.stop(when + 0.36)
    o.onended = () => { try { o.disconnect(); g.disconnect() } catch (e) {} }
  }

  _clap(when) {
    const ctx = this.ctx
    const dur = 0.16
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5)
    const src = ctx.createBufferSource(); src.buffer = buf
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.2
    const g = ctx.createGain(); g.gain.value = 0.16
    src.connect(bp); bp.connect(g); g.connect(this.beat); g.connect(this.reverb)
    src.start(when); src.stop(when + dur)
    src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect() } catch (e) {} }
  }

  _hat(when, vel = 1) {
    const ctx = this.ctx
    const dur = 0.03
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = ctx.createBufferSource(); src.buffer = buf
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000
    const g = ctx.createGain(); g.gain.value = 0.05 * vel
    src.connect(hp); hp.connect(g); g.connect(this.beat)
    src.start(when); src.stop(when + dur)
    src.onended = () => { try { src.disconnect(); hp.disconnect(); g.disconnect() } catch (e) {} }
  }

  setChapter(ch) { if (ch && ch.root) this.root = ch.root }

  adapt() {
    if (!this.started) return
    this._adapted = true
    const ctx = this.ctx, t = ctx.currentTime
    this.tone.frequency.cancelScheduledValues(t)
    this.tone.frequency.setValueAtTime(1200, t)
    this.tone.frequency.exponentialRampToValueAtTime(6500, t + 1.4)
    this.wet.gain.setTargetAtTime(0.34, t, 0.6)
    this._zap(true)
  }

  _zap(up = false) {
    if (!this.started || this.muted) return
    const ctx = this.ctx, t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sawtooth'
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(g); g.connect(this.tone); g.connect(this.reverb)
    o.frequency.setValueAtTime(up ? 200 : 1800, t)
    o.frequency.exponentialRampToValueAtTime(up ? 2400 : 120, t + 0.5)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    o.start(t); o.stop(t + 0.6)
    o.onended = () => { try { o.disconnect(); g.disconnect() } catch (e) {} }
  }

  bell() { if (this.started && !this.muted) this._lead(semi(this.root * 2, 7), this.ctx.currentTime) }
  pluck() { this.bell() }
  blip() {}
  glitch() { this._zap(false) }

  tickReactive(pointer) {
    if (!this.started || !this.ctx || !this._adapted) return
    const ctx = this.ctx, t = ctx.currentTime
    this.tone.frequency.setTargetAtTime(3200 + (pointer.x * 0.5 + 0.5) * 3500, t, 0.5)
    const b = this.breath * 0.5 + 0.5
    this.beat.gain.setTargetAtTime(0.8 + b * 0.15, t, 0.5)
  }

  _unlockMedia() {
    if (this._silentEl) return
    try {
      const a = new Audio()
      a.src = silentWavUrl(2)
      a.loop = true
      a.volume = 0.0001
      a.setAttribute('playsinline', '')
      a.setAttribute('webkit-playsinline', '')
      const pr = a.play()
      if (pr && pr.catch) pr.catch(() => {})
      this._silentEl = a
    } catch (e) {}
  }

  setBreath(v) { this.breath = v }

  setMute(m) {
    this.muted = m
    localStorage.setItem('chsys.mute', m ? '1' : '0')
    if (this.started) this.master.gain.setTargetAtTime(m ? 0.0001 : 0.55, this.ctx.currentTime, 0.4)
  }
  toggleMute() { this.setMute(!this.muted); return this.muted }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend() }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume() }
}
