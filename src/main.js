import { Application, Assets } from 'pixi.js'
import gsap from 'gsap'
import { ENV, makePerfGuard } from './core/env.js'
import { PointerState } from './core/pointer.js'
import { Stage } from './core/stage.js'
import { AudioEngine } from './core/audio.js'
import { Cursor } from './core/cursor.js'
import { Director } from './core/director.js'
import { Boot } from './core/boot.js'
import { renderFallback } from './core/fallback.js'

const TAU = Math.PI * 2

async function loadFonts() {
  if (!document.fonts) return
  const needed = [
    "700 64px 'Clash Display'",
    "500 64px 'Clash Display'",
    "400 18px 'Supreme'",
    "400 18px 'Martian Mono'",
    "italic 400 18px 'Gambetta'",
  ]
  try {
    await Promise.all(needed.map((f) => document.fonts.load(f)))
    await document.fonts.ready
  } catch (e) {  }
}

async function main() {
  const ui = document.getElementById('ui')

  if (!ENV.webgl || ENV.reducedMotion) {
    renderFallback(ui)
    document.documentElement.classList.add('reduced', 'adapted')
    return
  }

  await loadFonts()

  const app = new Application()
  await app.init({
    canvas: document.getElementById('stage'),
    preference: 'webgl',
    antialias: false,
    resolution: ENV.dprClamp,
    autoDensity: true,
    powerPreference: 'high-performance',
    background: 0x0a0a0c,
    resizeTo: window,
  })

  let portrait
  try {
    portrait = await Assets.load(`${import.meta.env.BASE_URL}assets/niki.png`)
  } catch (e) {
    renderFallback(ui); document.documentElement.classList.add('reduced', 'adapted'); return
  }

  const pointer = new PointerState(ENV)
  const stage = new Stage(app, ENV, pointer, portrait)
  stage.grainIntensity = ENV.grain * 0.075
  const audio = new AudioEngine(ENV)
  const cursor = new Cursor(ENV, pointer)
  const director = new Director({ ui, stage, audio, pointer, cursor, env: ENV })
  const boot = new Boot({ ui, stage, audio, pointer, director, env: ENV })

  boot.run()

  let t = 0
  const guard = makePerfGuard((level) => {
    if (level === 1) stage.grainIntensity = ENV.grain * 0.05
    if (level === 2 && stage.particleLayer) stage.particleLayer.visible = false
  })

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000
    t += dt
    const breath = Math.sin(t * 0.4 * TAU)
    pointer.sample()
    audio.setBreath(breath)
    audio.tickReactive(pointer.smooth, pointer.vel, director.busy)
    stage.update(t, breath)
    director.parallax(pointer)
    cursor.update()
    guard(ticker.deltaMS)
  })

  window.addEventListener('resize', () => stage.resize())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend(); else audio.resume()
  })

  window.__chsys = { app, stage, audio, director, ENV }
}

main()
