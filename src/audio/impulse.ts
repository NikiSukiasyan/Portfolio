import { mulberry32 } from '../shared/random'

export function reverbIR(ctx: BaseAudioContext, seconds = 2.5, decay = 3.2): AudioBuffer {
  const length = ctx.sampleRate * seconds
  const ir = ctx.createBuffer(2, length, ctx.sampleRate)
  const random = mulberry32(99)
  for (let ch = 0; ch < 2; ch++) {
    const channel = ir.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      channel[i] = (random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return ir
}
