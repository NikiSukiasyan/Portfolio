import { Application, Assets, type Texture } from 'pixi.js'
import { ENV, makePerfGuard } from './runtime/environment'
import { PointerState } from './input/pointer'
import { Cursor } from './input/cursor'
import { Stage } from './graphics/stage'
import { AudioEngine } from './audio/engine'
import { Director } from './sequence/director'
import { Boot } from './sequence/boot'
import { renderFallback } from './fallback'

declare global {
  interface Window {
    __chsys?: {
      app: Application
      stage: Stage
      audio: AudioEngine
      director: Director
      ENV: typeof ENV
    }
  }
}

const TAU = Math.PI * 2

async function loadFonts(): Promise<void> {
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
  } catch {}
}

function fallback(ui: HTMLElement, app?: Application): void {
  try {
    app?.destroy()
  } catch {}
  renderFallback(ui)
  document.documentElement.classList.add('reduced', 'adapted')
}

async function loadPortrait(attempts = 3): Promise<Texture> {
  const url = `${import.meta.env.BASE_URL}assets/niki.png`
  for (let i = 1; ; i++) {
    try {
      return await Assets.load(url)
    } catch (err) {
      if (i >= attempts) throw err
      await Assets.unload(url).catch(() => {})
      await new Promise((r) => setTimeout(r, 400 * i))
    }
  }
}

async function main(): Promise<void> {
  const ui = document.getElementById('ui')!

  if (!ENV.webgl || (ENV.reducedMotion && !ENV.forceFilm)) {
    fallback(ui)
    return
  }

  await loadFonts()

  const app = new Application()
  try {
    await app.init({
      canvas: document.getElementById('stage') as HTMLCanvasElement,
      preference: 'webgl',
      antialias: false,
      resolution: ENV.dprClamp,
      autoDensity: true,
      powerPreference: 'high-performance',
      background: 0x0a0a0c,
      resizeTo: window,
    })
  } catch {
    fallback(ui)
    return
  }

  let portrait: Texture
  try {
    portrait = await loadPortrait()
  } catch {
    fallback(ui, app)
    return
  }

  const pointer = new PointerState()
  const stage = new Stage(app, ENV, pointer, portrait)
  stage.grainIntensity = ENV.grain * 0.075
  const audio = new AudioEngine()
  const cursor = new Cursor(ENV, pointer)
  const director = new Director({ ui, stage, audio })
  const boot = new Boot({ ui, stage, audio, pointer, director })

  boot.run()

  let t = 0
  const guard = makePerfGuard((level) => {
    if (level === 1) stage.grainIntensity = ENV.grain * 0.05
    if (level === 2) stage.particleLayer.visible = false
  })

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000
    t += dt
    const breath = Math.sin(t * 0.4 * TAU)
    pointer.sample()
    audio.setBreath(breath)
    audio.tickReactive(pointer.smooth)
    stage.update(t, breath)
    director.parallax(pointer)
    cursor.update()
    guard(ticker.deltaMS)
  })

  window.addEventListener('resize', () => stage.resize())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend()
    else audio.resume()
  })

  window.__chsys = { app, stage, audio, director, ENV }
}

main()
