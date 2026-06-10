export interface ChannelTriplet {
  r: number
  g: number
  b: number
}

export const rgb = (value: number): Float32Array =>
  new Float32Array([
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ])

export const hex = (value: number): string => '#' + value.toString(16).padStart(6, '0')

export const unpack = (value: number): ChannelTriplet => ({
  r: (value >> 16) & 255,
  g: (value >> 8) & 255,
  b: value & 255,
})
