import * as THREE from 'three'
import { glassVertex, glassFragment } from './shaders'

// Shared weather state, kept outside React so Weather.jsx can animate it every
// frame without re-rendering anything: the colors lightning flashes between, the
// city materials it flashes, the streetlights rain is lit by, and one set of
// uniforms (time, wind, lightning) shared by every rain shader.

export const NIGHT = {
  sky: new THREE.Color('#04060c'),
  fog: new THREE.Color('#0a0f1a'),
  city: new THREE.Color('#3c4660'), // unlit city tint on a rainy night
}
export const FLASH = {
  sky: new THREE.Color('#5a6680'),
  fog: new THREE.Color('#3a4560'),
  city: new THREE.Color('#c8d0e8'),
}

// Sodium-vapor orange: streetlights, and the rain and puddles they light
export const SODIUM = new THREE.Color('#ffb35c')

// City.jsx registers its materials here so lightning can light them up
export const cityMaterials = []

// StreetLights.jsx registers each lamp head ([x, y, z], world meters) here so
// the rain near them can glow
export const MAX_LAMPS = 48
export const lampHeads = []

// Wind, in m/s sideways. Weather.jsx blows gusts and integrates `windOffset`
// (how far the wind has carried the rain so far) so drops drift with it.
export const weatherUniforms = {
  uTime: { value: 0 },
  uFlash: { value: 0 }, // 0..1 lightning
  uWind: { value: new THREE.Vector2() },
  uWindOffset: { value: new THREE.Vector2() },
  uPixelAngle: { value: 0.006 }, // meters per PSX pixel at 1 m distance
}

// The window glass: drops sliding down with trails, and beads that come and go
// (procedural, see shaders.js). One material for every pane.
export const rainGlassMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: weatherUniforms.uTime,
    uFlash: weatherUniforms.uFlash,
  },
  vertexShader: glassVertex,
  fragmentShader: glassFragment,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
