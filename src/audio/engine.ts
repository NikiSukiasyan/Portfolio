import { reverbIR } from './impulse'
import type { Vec2 } from '../shared/types'

function silentWavUrl(seconds = 1): string {
  const sampleRate = 8000
  const n = Math.floor(sampleRate * seconds)
  const buffer = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeString(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); writeString(8, 'WAVE')
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeString(36, 'data'); view.setUint32(40, n * 2, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

const semi = (root: number, n: number): number => root * Math.pow(2, n / 12)

interface Chord {
  bass: number
  ch: number[]
}

const PROG: Chord[] = [
  { bass: 0, ch: [0, 4, 7] },
  { bass: 7, ch: [7, 11, 14] },
  { bass: 9, ch: [9, 12, 16] },
  { bass: 5, ch: [5, 9, 12] },
]

const PENTA = [0, 4, 7, 12, 16, 19]
const LEAD: Record<number, number> = { 0: 4, 6: 2, 12: 5, 18: 3, 24: 4, 30: 1 }

export class AudioEngine {
  muted: boolean

  private ctx: AudioContext | null = null
  private started = false
  private adapted = false
  private breath = 0
  private root = 138.59
  private readonly bpm = 100
  private step = 0
  private nextStepTime = 0

  private master!: GainNode
  private tone!: BiquadFilterNode
  private reverb!: ConvolverNode
  private wet!: GainNode
  private delay!: DelayNode
  private pump!: GainNode
  private beat!: GainNode
  private padOsc: OscillatorNode[] = []

  private silentEl: HTMLAudioElement | undefined

  constructor() {
    this.muted = localStorage.getItem('chsys.mute') === '1'
  }

  async start(): Promise<void> {
    if (this.started) return
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const ctx = (this.ctx = new AudioContextCtor())
    this.unlockMedia()
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
    const feedback = ctx.createGain(); feedback.gain.value = 0.26
    this.delay.connect(feedback); feedback.connect(this.delay)
    const echo = ctx.createGain(); echo.gain.value = 0.4
    this.delay.connect(echo); echo.connect(this.tone); echo.connect(this.reverb)

    this.pump = ctx.createGain(); this.pump.gain.value = 1
    this.pump.connect(this.tone); this.pump.connect(this.reverb)

    this.beat = ctx.createGain(); this.beat.gain.value = 0.9
    this.beat.connect(this.master)

    this.buildPad()

    const t = ctx.currentTime
    this.master.gain.setValueAtTime(0.0001, t)
    this.master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.55, t + 1.8)

    this.nextStepTime = ctx.currentTime + 0.2
    window.setInterval(() => this.scheduler(), 25)
  }

  private buildPad(): void {
    const ctx = this.ctx!
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'; padFilter.frequency.value = 1200; padFilter.Q.value = 3
    padFilter.connect(this.pump)

    const padLfo = ctx.createOscillator(); padLfo.type = 'sine'; padLfo.frequency.value = 0.06
    const padLfoGain = ctx.createGain(); padLfoGain.gain.value = 700
    padLfo.connect(padLfoGain); padLfoGain.connect(padFilter.frequency)
    padLfo.start()

    const padGain = ctx.createGain(); padGain.gain.value = 0.0
    padGain.connect(padFilter)
    this.padOsc = []
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'
      o.detune.value = (i - 1) * 8
      const g = ctx.createGain(); g.gain.value = 0.16
      o.connect(g); g.connect(padGain); o.start()
      this.padOsc.push(o)
    }
    padGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2.0)
    this.setPadChord(PROG[0])
  }

  private setPadChord(chord: Chord): void {
    const t = this.ctx!.currentTime
    this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(semi(this.root, chord.ch[i % chord.ch.length]), t, 0.3))
  }

  private scheduler(): void {
    if (!this.started) return
    const ctx = this.ctx!
    const stepDur = 60 / this.bpm / 2
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime)
      this.nextStepTime += stepDur
      this.step = (this.step + 1) % 32
    }
  }

  private playStep(step: number, when: number): void {
    if (this.muted) return
    const inBar = step % 8
    const bar = Math.floor(step / 8)
    const chord = PROG[bar % PROG.length]
    if (inBar === 0) this.setPadChord(chord)

    this.bass(semi(this.root, chord.bass) / 2, when)

    if (inBar === 0 || inBar === 4) this.kick(when)
    if (inBar === 2 || inBar === 6) this.clap(when)
    if (inBar % 2 === 1) this.hat(when, 0.6)

    if (this.adapted && LEAD[step] != null) {
      this.lead(semi(this.root * 2, chord.ch[0] + PENTA[LEAD[step] % PENTA.length]), when)
    }
  }

  private bass(freq: number, when: number): void {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = freq; o2.detune.value = 6
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 7
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.pump)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.22, when + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.26)
    o.start(when); o2.start(when); o.stop(when + 0.28); o2.stop(when + 0.28)
    o.onended = () => { try { o.disconnect(); o2.disconnect(); lp.disconnect(); g.disconnect() } catch {} }
  }

  private lead(freq: number, when: number): void {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 2
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(lp); lp.connect(g); g.connect(this.tone); g.connect(this.delay); g.connect(this.reverb)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.12, when + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7)
    o.start(when); o.stop(when + 0.75)
    o.onended = () => { try { o.disconnect(); lp.disconnect(); g.disconnect() } catch {} }
  }

  private kick(when: number): void {
    const ctx = this.ctx!
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
    o.onended = () => { try { o.disconnect(); g.disconnect() } catch {} }
  }

  private clap(when: number): void {
    const ctx = this.ctx!
    const dur = 0.16
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5)
    const src = ctx.createBufferSource(); src.buffer = buf
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.2
    const g = ctx.createGain(); g.gain.value = 0.16
    src.connect(bp); bp.connect(g); g.connect(this.beat); g.connect(this.reverb)
    src.start(when); src.stop(when + dur)
    src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect() } catch {} }
  }

  private hat(when: number, vel = 1): void {
    const ctx = this.ctx!
    const dur = 0.03
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = ctx.createBufferSource(); src.buffer = buf
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000
    const g = ctx.createGain(); g.gain.value = 0.05 * vel
    src.connect(hp); hp.connect(g); g.connect(this.beat)
    src.start(when); src.stop(when + dur)
    src.onended = () => { try { src.disconnect(); hp.disconnect(); g.disconnect() } catch {} }
  }

  setRoot(root: number): void {
    if (root) this.root = root
  }

  adapt(): void {
    if (!this.started) return
    this.adapted = true
    const ctx = this.ctx!
    const t = ctx.currentTime
    this.tone.frequency.cancelScheduledValues(t)
    this.tone.frequency.setValueAtTime(1200, t)
    this.tone.frequency.exponentialRampToValueAtTime(6500, t + 1.4)
    this.wet.gain.setTargetAtTime(0.34, t, 0.6)
    this.zap(true)
  }

  private zap(up = false): void {
    if (!this.started || this.muted) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sawtooth'
    const g = ctx.createGain(); g.gain.value = 0.0001
    o.connect(g); g.connect(this.tone); g.connect(this.reverb)
    o.frequency.setValueAtTime(up ? 200 : 1800, t)
    o.frequency.exponentialRampToValueAtTime(up ? 2400 : 120, t + 0.5)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    o.start(t); o.stop(t + 0.6)
    o.onended = () => { try { o.disconnect(); g.disconnect() } catch {} }
  }

  bell(): void {
    if (this.started && !this.muted) this.lead(semi(this.root * 2, 7), this.ctx!.currentTime)
  }

  glitch(): void {
    this.zap(false)
  }

  tickReactive(pointer: Vec2): void {
    if (!this.started || !this.ctx || !this.adapted) return
    const ctx = this.ctx
    const t = ctx.currentTime
    this.tone.frequency.setTargetAtTime(3200 + (pointer.x * 0.5 + 0.5) * 3500, t, 0.5)
    const b = this.breath * 0.5 + 0.5
    this.beat.gain.setTargetAtTime(0.8 + b * 0.15, t, 0.5)
  }

  private unlockMedia(): void {
    if (this.silentEl) return
    try {
      const audio = new Audio()
      audio.src = silentWavUrl(2)
      audio.loop = true
      audio.volume = 0.0001
      audio.setAttribute('playsinline', '')
      audio.setAttribute('webkit-playsinline', '')
      const playback = audio.play()
      if (playback) playback.catch(() => {})
      this.silentEl = audio
    } catch {}
  }

  setBreath(value: number): void {
    this.breath = value
  }

  setMute(muted: boolean): void {
    this.muted = muted
    localStorage.setItem('chsys.mute', muted ? '1' : '0')
    if (this.started) this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.55, this.ctx!.currentTime, 0.4)
  }

  toggleMute(): boolean {
    this.setMute(!this.muted)
    return this.muted
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend()
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }
}
