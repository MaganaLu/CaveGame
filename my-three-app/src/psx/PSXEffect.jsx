import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PSX } from './config'
import { useGameStore, isAsleep } from '../game/GameState'

// PS1-style output. Takes over R3F rendering (useFrame priority 1):
//   1. render the scene into a tiny render target (e.g. 240px tall), no filtering
//   2. blit it full-screen with nearest-neighbour upscaling, tone mapping,
//      and a 4x4 Bayer ordered dither down to ~15-bit color (PS1 framebuffer).
// Vertex snapping lives in PSXMaterials.jsx.

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uLevels;
  varying vec2 vUv;

  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return float(m[i]) / 16.0 - 0.5;
  }

  void main() {
    gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Dither in output (sRGB) space, per low-res pixel
    vec2 pixel = floor(vUv * uResolution);
    vec3 c = gl_FragColor.rgb + bayer4(pixel) / uLevels;
    gl_FragColor.rgb = floor(c * uLevels + 0.5) / uLevels;
  }
`

export default function PSXEffect() {
  const { gl, scene, camera, size } = useThree()

  const target = useMemo(
    () =>
      new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.HalfFloatType, // keep HDR range for tone mapping in the blit
      }),
    []
  )

  const blit = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: target.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uLevels: { value: PSX.levels },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    const quadScene = new THREE.Scene()
    quadScene.add(quad)
    return { material, scene: quadScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }, [target])

  useEffect(() => {
    const height = PSX.height
    const width = Math.round(height * (size.width / size.height))
    target.setSize(width, height)
    blit.material.uniforms.uResolution.value.set(width, height)
  }, [size, target, blit])

  useEffect(() => () => {
    target.dispose()
    blit.material.dispose()
  }, [target, blit])

  useFrame(() => {
    // Asleep, the screen is covered by the sleep fade or a dream: keep the last
    // frame instead of rendering a world nobody can see
    if (isAsleep(useGameStore.getState())) return
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.render(blit.scene, blit.camera)
  }, 1)

  return null
}
