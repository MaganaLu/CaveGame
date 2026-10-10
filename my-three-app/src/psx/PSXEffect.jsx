import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS, useGraphics } from './config'
import { useGameStore, isAsleep } from '../game/GameState'

// Low-res output. Takes over R3F rendering (useFrame priority 1):
//   1. render the scene into a small render target (240p or 480p, by preset)
//   2. glow: the bright parts (lamps, screens) are cut out at a fixed ~96p,
//      blurred, and added back, so lights bleed a soft halo
//   3. blit it full-screen: hard square pixels (retro) or sharp-bilinear
//      (smooth: crisp, without the stair-steps), tone mapping, a color grade
//      (cool shadows, warm highlights), a vignette and, in retro, a 4x4 Bayer
//      ordered dither down to ~15-bit color (the PS1 framebuffer)
// Vertex snapping and texture filtering live in PSXMaterials.jsx.

const BLOOM_HEIGHT = 96
const BLOOM_THRESHOLD = 0.85 // linear HDR brightness where glow starts

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const blitShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform vec2 uResolution;
  uniform vec2 uScreen;
  uniform float uSmooth;
  uniform float uLevels;
  uniform float uDither;
  uniform float uBloom;
  uniform float uVignette;
  varying vec2 vUv;

  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return float(m[i]) / 16.0 - 0.5;
  }

  // Where to sample the low-res image. Retro: each pixel's center (hard
  // squares). Smooth: sharp-bilinear, flat inside a pixel and blended only
  // across the one screen pixel at its edge
  vec2 pixelUv() {
    vec2 texel = vUv * uResolution;
    if (uSmooth < 0.5) return (floor(texel) + 0.5) / uResolution;
    vec2 scale = max(uScreen / uResolution, vec2(1.0));
    vec2 region = 0.5 - 0.5 / scale;
    vec2 d = fract(texel) - 0.5;
    vec2 f = (d - clamp(d, -region, region)) * scale + 0.5;
    return (floor(texel) + f) / uResolution;
  }

  void main() {
    vec3 hdr = texture2D(tDiffuse, pixelUv()).rgb + texture2D(tBloom, vUv).rgb * uBloom;
    gl_FragColor = vec4(hdr, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    vec3 c = gl_FragColor.rgb;

    // Grade: a touch more color, shadows toward night blue, highlights toward lamp amber
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.12);
    c += vec3(-0.012, 0.0, 0.03) * (1.0 - l) * (1.0 - l);
    c *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), l);

    // Vignette, round on any screen shape
    vec2 q = (vUv - 0.5) * vec2(uScreen.x / uScreen.y, 1.0);
    c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));

    // Retro: dither in output (sRGB) space, per low-res pixel, down to uLevels steps
    if (uLevels > 0.0) {
      c += bayer4(floor(vUv * uResolution)) * uDither / uLevels;
      c = floor(c * uLevels + 0.5) / uLevels;
    }
    gl_FragColor.rgb = clamp(c, 0.0, 1.0);
  }
`

// The bright parts, averaged from a 4×4 patch of the scene (one bilinear tap per
// 2×2) so small lights don't flicker in and out as you move
const brightShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uTexel;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = (texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb +
              texture2D(tDiffuse, vUv + uTexel * vec2(1.0, -1.0)).rgb +
              texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, 1.0)).rgb +
              texture2D(tDiffuse, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
    float peak = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c * max(0.0, peak - uThreshold) / max(peak, 1e-4), 1.0);
  }
`

// 9-tap Gaussian in 5 bilinear taps, along uDir
const blurShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
    s += (texture2D(tDiffuse, vUv + uDir * 1.3846).rgb + texture2D(tDiffuse, vUv - uDir * 1.3846).rgb) * 0.316216;
    s += (texture2D(tDiffuse, vUv + uDir * 3.2308).rgb + texture2D(tDiffuse, vUv - uDir * 3.2308).rgb) * 0.070270;
    gl_FragColor = vec4(s, 1.0);
  }
`

const makeTarget = () =>
  new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType, // keep HDR range for the glow and tone mapping
  })

const pass = (fragmentShader, uniforms) =>
  new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false, toneMapped: false })

export default function PSXEffect() {
  const { gl, scene, camera, size } = useThree()
  const preset = useGraphics((s) => s.preset)

  const fx = useMemo(() => {
    const target = makeTarget()
    const bloomA = makeTarget()
    const bloomB = makeTarget()
    const blit = pass(blitShader, {
      tDiffuse: { value: target.texture },
      tBloom: { value: bloomA.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uScreen: { value: new THREE.Vector2(1, 1) },
      uSmooth: { value: 0 },
      uLevels: { value: 0 },
      uDither: { value: 0 },
      uBloom: { value: 0 },
      uVignette: { value: 0 },
    })
    blit.toneMapped = true // the blit is where the scene gets tone mapped
    const bright = pass(brightShader, {
      tDiffuse: { value: target.texture },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: BLOOM_THRESHOLD },
    })
    const blur = pass(blurShader, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blit)
    const quadScene = new THREE.Scene()
    quadScene.add(quad)
    return { target, bloomA, bloomB, blit, bright, blur, quad, quadScene, quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }, [])

  useEffect(() => {
    const p = PRESETS[preset]
    const aspect = size.width / size.height
    const width = Math.round(p.height * aspect)
    fx.target.setSize(width, p.height)
    fx.bloomA.setSize(Math.round(BLOOM_HEIGHT * aspect), BLOOM_HEIGHT)
    fx.bloomB.setSize(Math.round(BLOOM_HEIGHT * aspect), BLOOM_HEIGHT)
    const u = fx.blit.uniforms
    u.uResolution.value.set(width, p.height)
    u.uScreen.value.set(size.width, size.height)
    u.uSmooth.value = p.smooth ? 1 : 0
    u.uLevels.value = p.levels
    u.uDither.value = p.dither
    u.uBloom.value = p.bloom
    u.uVignette.value = p.vignette
    fx.bright.uniforms.uTexel.value.set(1 / width, 1 / p.height)
  }, [size, preset, fx])

  useEffect(() => () => {
    for (const t of [fx.target, fx.bloomA, fx.bloomB]) t.dispose()
    for (const m of [fx.blit, fx.bright, fx.blur]) m.dispose()
    fx.quad.geometry.dispose()
  }, [fx])

  useFrame(() => {
    // Asleep, the screen is covered by the sleep fade or a dream: keep the last
    // frame instead of rendering a world nobody can see
    if (isAsleep(useGameStore.getState())) return
    const draw = (material, to) => {
      fx.quad.material = material
      gl.setRenderTarget(to)
      gl.render(fx.quadScene, fx.quadCamera)
    }
    gl.setRenderTarget(fx.target)
    gl.render(scene, camera)

    // Glow: bright parts into A, then blur A→B→A twice (wider, still cheap at 96p)
    draw(fx.bright, fx.bloomA)
    const { blur } = fx
    const tw = 1 / fx.bloomA.width
    const th = 1 / fx.bloomA.height
    for (let i = 1; i <= 2; i++) {
      blur.uniforms.tDiffuse.value = fx.bloomA.texture
      blur.uniforms.uDir.value.set(tw * i, 0)
      draw(blur, fx.bloomB)
      blur.uniforms.tDiffuse.value = fx.bloomB.texture
      blur.uniforms.uDir.value.set(0, th * i)
      draw(blur, fx.bloomA)
    }

    draw(fx.blit, null)
  }, 1)

  return null
}
