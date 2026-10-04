import { useMemo } from 'react'
import * as THREE from 'three'
import { SODIUM, weatherUniforms } from './weatherState'
import { reflectionVertex, reflectionFragment, streetSplashVertex, splashFragment } from './shaders'

// The wet road under the streetlights: each lamp's reflection streaking toward you
// and rain splashing in its pool of light. Mounted by StreetLights.jsx, which knows
// where the lamps are. Positions are worked out in the shaders.

const SPLASHES_PER_LAMP = 40
const noRaycast = () => {}

function reflectionGeometry(heads) {
  const head = []
  const corner = []
  const index = []
  heads.forEach((h, i) => {
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      head.push(...h)
      corner.push(x, y)
    }
    const v = i * 4
    index.push(v, v + 1, v + 2, v + 2, v + 1, v + 3)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(head.length), 3))
  g.setAttribute('aHead', new THREE.BufferAttribute(new Float32Array(head), 3))
  g.setAttribute('aCorner', new THREE.BufferAttribute(new Float32Array(corner), 2))
  g.setIndex(index)
  return g
}

function splashGeometry(heads, streetY) {
  const lamp = []
  const seed = []
  for (const [x, , z] of heads) {
    for (let i = 0; i < SPLASHES_PER_LAMP; i++) {
      lamp.push(x, streetY, z)
      seed.push(Math.random(), 1.5 + Math.random() * 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lamp.length), 3))
  g.setAttribute('aLamp', new THREE.BufferAttribute(new Float32Array(lamp), 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 2))
  return g
}

export default function WetStreet({ heads, streetY }) {
  const reflections = useMemo(() => reflectionGeometry(heads), [heads])
  const splashes = useMemo(() => splashGeometry(heads, streetY), [heads, streetY])

  const reflectionMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: weatherUniforms.uTime, uSodium: { value: SODIUM }, uStreetY: { value: streetY } },
        vertexShader: reflectionVertex,
        fragmentShader: reflectionFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [streetY]
  )
  const splashMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: weatherUniforms.uTime,
          uFlash: weatherUniforms.uFlash,
          uPixelAngle: weatherUniforms.uPixelAngle,
          uSodium: { value: SODIUM },
        },
        vertexShader: streetSplashVertex,
        fragmentShader: splashFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  return (
    <>
      <mesh geometry={reflections} material={reflectionMaterial} frustumCulled={false} raycast={noRaycast} />
      <points geometry={splashes} material={splashMaterial} frustumCulled={false} raycast={noRaycast} />
    </>
  )
}
