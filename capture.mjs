import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://localhost:5173/'
const OUT = '/tmp/chsys'
import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl', '--ignore-gpu-blocklist',
    '--window-size=1600,1000', '--no-sandbox', '--autoplay-policy=no-user-gesture-required',
  ],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
await sleep(2500)
await page.screenshot({ path: `${OUT}/1-gate.png` })

// enter (audio unlock) — click center
await page.mouse.click(800, 500)
await sleep(2200)
await page.screenshot({ path: `${OUT}/2-identity-mono.png` })

// move mouse → ADAPT
await page.mouse.move(700, 460, { steps: 12 })
await page.mouse.move(920, 540, { steps: 12 })
await sleep(2200)
await page.screenshot({ path: `${OUT}/3-adapt.png` })

// advance through frames
for (let i = 0; i < 9; i++) {
  await page.keyboard.press('ArrowRight')
  await sleep(1400)
  await page.screenshot({ path: `${OUT}/4-frame-${i}.png` })
}

// dossier
await page.keyboard.press('r')
await sleep(800)
await page.screenshot({ path: `${OUT}/5-dossier.png` })

console.log('=== CONSOLE / ERRORS ===')
console.log(logs.join('\n') || '(none)')
await browser.close()
