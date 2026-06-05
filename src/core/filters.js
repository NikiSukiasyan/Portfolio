import { Filter, GlProgram, UniformGroup } from 'pixi.js'
import { flowNoiseTexture, bayerTexture } from '../util/noise.js'

export const rgb = (n) => new Float32Array([
  ((n >> 16) & 255) / 255,
  ((n >> 8) & 255) / 255,
  (n & 255) / 255,
])

const VERT = `in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition( void ){
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord( void ){ return aPosition * (uOutputFrame.zw * uInputSize.zw); }
void main(void){ gl_Position = filterVertexPosition(); vTextureCoord = filterTextureCoord(); }
`

const GRAIN_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uVignette;
uniform float uBreath;
uniform float uAberration;
uniform float uScanline;
uniform vec2 uResolution;
uniform vec3 uAccent;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

void main(){
  vec2 uv = vTextureCoord;
  vec2 dir = uv - 0.5;
  float ab = uAberration * (0.0012 + 0.006 * dot(dir,dir));
  vec4 col;
  col.r = texture(uTexture, uv + dir*ab).r;
  col.g = texture(uTexture, uv).g;
  col.b = texture(uTexture, uv - dir*ab).b;
  col.a = texture(uTexture, uv).a;

  float br = uBreath*0.5+0.5;
  float g = hash(floor(uv*uResolution) + fract(uTime)*vec2(13.0,7.0)) - 0.5;
  col.rgb += g * uIntensity * (0.85 + 0.3*br);

  float lum = dot(col.rgb, vec3(0.299,0.587,0.114));
  col.rgb += uAccent * (1.0 - smoothstep(0.0, 0.16, lum)) * 0.03;

  float scan = 1.0 - uScanline * (0.5 + 0.5*sin(uv.y * uResolution.y * 1.4 + uTime*1.5));
  col.rgb *= scan;

  float vig = smoothstep(0.98, 0.34, length(dir) * (1.0 + 0.06*uBreath));
  col.rgb *= mix(1.0, vig, uVignette);

  finalColor = col;
}
`

export class GrainFilter {
  constructor(accent = 0x2be3b0) {
    this.u = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uIntensity: { value: 0.075, type: 'f32' },
      uVignette: { value: 0.9, type: 'f32' },
      uBreath: { value: 0, type: 'f32' },
      uAberration: { value: 1.0, type: 'f32' },
      uScanline: { value: 0.03, type: 'f32' },
      uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
      uAccent: { value: rgb(accent), type: 'vec3<f32>' },
    })
    this.filter = new Filter({
      glProgram: GlProgram.from({ vertex: VERT, fragment: GRAIN_FRAG, name: 'grain' }),
      resources: { grainUniforms: this.u },
    })
  }
  get uniforms() { return this.u.uniforms }
  resize(w, h) { this.uniforms.uResolution[0] = w; this.uniforms.uResolution[1] = h }
  setAccent(n) { const c = rgb(n); this.uniforms.uAccent.set(c) }
  update(t, breath, aberration, intensity) {
    this.uniforms.uTime = t
    this.uniforms.uBreath = breath
    if (aberration !== undefined) this.uniforms.uAberration = aberration
    if (intensity !== undefined) this.uniforms.uIntensity = intensity
  }
}

const PHOTO_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uNoiseTexture;
uniform sampler2D uDitherTexture;
uniform float uTime;
uniform float uDisplace;
uniform float uAberration;
uniform float uReveal;
uniform float uBands;
uniform float uColorMix;
uniform float uBreath;
uniform vec2 uPointer;
uniform vec3 uColorDark;
uniform vec3 uColorLight;

void main(){
  vec2 uv = vTextureCoord;
  vec2 flow = texture(uNoiseTexture, fract(uv*1.4 + uTime*vec2(0.02,-0.015))).xy * 2.0 - 1.0;
  float prox = 1.0 - clamp(distance(uv, uPointer)*1.7, 0.0, 1.0);
  float br = uBreath*0.5+0.5;
  vec2 disp = flow * (uDisplace * (0.55 + 0.9*prox)) * (0.85 + 0.3*br);
  vec2 duv = uv + disp;

  float ab = uAberration * (0.003 + prox*0.012);
  vec2 dir = normalize(flow + 0.0001);
  vec3 src;
  src.r = texture(uTexture, duv + dir*ab).r;
  src.g = texture(uTexture, duv).g;
  src.b = texture(uTexture, duv - dir*ab).b;

  float lum = dot(src, vec3(0.299,0.587,0.114));
  lum = pow(clamp(lum*1.12, 0.0, 1.0), 0.85);
  float th = texture(uDitherTexture, fract(gl_FragCoord.xy/8.0)).r - 0.5;
  float q = clamp(floor((lum + th/uBands)*uBands)/uBands, 0.0, 1.0);
  vec3 duo = mix(uColorDark, uColorLight, q);
  vec3 col = mix(duo, src, uColorMix);

  float gate = clamp(uReveal + prox*0.45, 0.0, 1.0);
  col = mix(uColorDark, col, gate);
  float a = gate;
  finalColor = vec4(col * a, a);
}
`

export class PhotoFilter {
  constructor({ dark = 0x0a0a0c, light = 0xece6d9 } = {}) {
    this.noiseTex = flowNoiseTexture(256)
    this.ditherTex = bayerTexture()
    this.noiseTex.source.style.addressMode = 'repeat'
    this.ditherTex.source.style.addressMode = 'repeat'
    this.u = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uDisplace: { value: 0.012, type: 'f32' },
      uAberration: { value: 1.0, type: 'f32' },
      uReveal: { value: 0, type: 'f32' },
      uBands: { value: 4.0, type: 'f32' },
      uColorMix: { value: 0, type: 'f32' },
      uBreath: { value: 0, type: 'f32' },
      uPointer: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
      uColorDark: { value: rgb(dark), type: 'vec3<f32>' },
      uColorLight: { value: rgb(light), type: 'vec3<f32>' },
    })
    this.filter = new Filter({
      glProgram: GlProgram.from({ vertex: VERT, fragment: PHOTO_FRAG, name: 'photo' }),
      resources: {
        photoUniforms: this.u,
        uNoiseTexture: this.noiseTex.source,
        uNoiseSampler: this.noiseTex.source.style,
        uDitherTexture: this.ditherTex.source,
        uDitherSampler: this.ditherTex.source.style,
      },
    })
  }
  get uniforms() { return this.u.uniforms }
  setLight(n) { this.uniforms.uColorLight.set(rgb(n)) }
  setPointer(x, y) { this.uniforms.uPointer[0] = x; this.uniforms.uPointer[1] = y }
  update(t, breath) { this.uniforms.uTime = t; this.uniforms.uBreath = breath }
}
