const mql = (q) => window.matchMedia && window.matchMedia(q).matches

const reducedMotion = mql('(prefers-reduced-motion: reduce)')
const coarse = mql('(pointer: coarse)')
const mem = navigator.deviceMemory || 4
const cores = navigator.hardwareConcurrency || 4
const small = Math.min(window.innerWidth, window.innerHeight) < 700

let tier = 'high'
if (reducedMotion) tier = 'reduced'
else if (coarse || small || mem <= 3 || cores <= 4) tier = 'med'
if ((coarse && small) || mem <= 2) tier = 'low'

const PROFILES = {
  high:    { dpr: 2,   particles: 2600, grain: 1.0,  displacement: true,  cursor: true,  audioVoices: 3 },
  med:     { dpr: 1.5, particles: 1200, grain: 0.7,  displacement: true,  cursor: !coarse, audioVoices: 2 },
  low:     { dpr: 1,   particles: 400,  grain: 0.5,  displacement: false, cursor: false, audioVoices: 1 },
  reduced: { dpr: 1,   particles: 0,    grain: 0.35, displacement: false, cursor: false, audioVoices: 1 },
}

export const ENV = {
  tier,
  reducedMotion,
  coarse,
  ...PROFILES[tier],
  dprClamp: Math.min(window.devicePixelRatio || 1, PROFILES[tier].dpr),
  webgl: detectWebGL(),
}

function detectWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch (e) {
    return false
  }
}

export function makePerfGuard(onDegrade) {
  let ema = 16.67
  let overFor = 0
  let degraded = 0
  return (dtMs) => {
    ema = ema * 0.9 + dtMs * 0.1
    if (ema > 24) {
      overFor += dtMs
      if (overFor > 1200 && degraded < 2) { degraded++; onDegrade(degraded); overFor = 0 }
    } else {
      overFor = Math.max(0, overFor - dtMs)
    }
  }
}
