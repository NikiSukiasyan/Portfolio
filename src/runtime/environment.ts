type Tier = 'high' | 'med' | 'low' | 'reduced'

interface Profile {
  dpr: number
  particles: number
  grain: number
  displacement: boolean
  cursor: boolean
  audioVoices: number
}

export interface Environment extends Profile {
  tier: Tier
  reducedMotion: boolean
  coarse: boolean
  dprClamp: number
  webgl: boolean
}

const matches = (query: string): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(query).matches

const reducedMotion = matches('(prefers-reduced-motion: reduce)')
const coarse = matches('(pointer: coarse)')
const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
const cores = navigator.hardwareConcurrency || 4
const small = Math.min(window.innerWidth, window.innerHeight) < 700

function resolveTier(): Tier {
  if ((coarse && small) || memory <= 2) return 'low'
  if (reducedMotion) return 'reduced'
  if (coarse || small || memory <= 3 || cores <= 4) return 'med'
  return 'high'
}

const PROFILES: Record<Tier, Profile> = {
  high: { dpr: 2, particles: 2600, grain: 1.0, displacement: true, cursor: true, audioVoices: 3 },
  med: { dpr: 1.5, particles: 1200, grain: 0.7, displacement: true, cursor: !coarse, audioVoices: 2 },
  low: { dpr: 1, particles: 400, grain: 0.5, displacement: false, cursor: false, audioVoices: 1 },
  reduced: { dpr: 1, particles: 0, grain: 0.35, displacement: false, cursor: false, audioVoices: 1 },
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const tier = resolveTier()
const profile = PROFILES[tier]

export const ENV: Environment = {
  tier,
  reducedMotion,
  coarse,
  ...profile,
  dprClamp: Math.min(window.devicePixelRatio || 1, profile.dpr),
  webgl: detectWebGL(),
}

export function makePerfGuard(onDegrade: (level: number) => void): (dtMs: number) => void {
  let ema = 16.67
  let overFor = 0
  let degraded = 0
  return (dtMs) => {
    ema = ema * 0.9 + dtMs * 0.1
    if (ema > 24) {
      overFor += dtMs
      if (overFor > 1200 && degraded < 2) {
        degraded++
        onDegrade(degraded)
        overFor = 0
      }
    } else {
      overFor = Math.max(0, overFor - dtMs)
    }
  }
}
