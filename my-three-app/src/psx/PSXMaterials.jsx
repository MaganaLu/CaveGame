import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS, useGraphics } from './config'
import { applyMaterialPreset } from './textureQuality'

// PS1 vertex snapping ("wobble"): every material's clip-space position is snapped
// to the low-res pixel grid, so geometry jitters as the camera moves.
// Patches materials already in the scene and re-checks periodically for new ones;
// the same sweep applies the graphics preset's texture size and filtering.

const snapUniform = { value: new THREE.Vector2(160, 120) }

const SNAP_CHUNK = /* glsl */ `
  #include <project_vertex>
  {
    vec4 snapped = gl_Position;
    snapped.xyz /= snapped.w;
    snapped.xy = floor(snapped.xy * uPsxSnap) / uPsxSnap;
    snapped.xyz *= snapped.w;
    gl_Position = snapped;
  }
`

function patch(material) {
  if (material.userData.psx || material.isShaderMaterial) return
  material.userData.psx = true
  const previous = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer)
    shader.uniforms.uPsxSnap = snapUniform
    shader.vertexShader = 'uniform vec2 uPsxSnap;\n' + shader.vertexShader.replace('#include <project_vertex>', SNAP_CHUNK)
  }
  const previousKey = material.customProgramCacheKey?.bind(material)
  material.customProgramCacheKey = () => `psx|${previousKey ? previousKey() : ''}`
  material.needsUpdate = true
}

export default function PSXMaterials() {
  const { scene, size } = useThree()
  const preset = useGraphics((s) => s.preset)

  useEffect(() => {
    // Half the internal resolution, in NDC units (NDC spans 2)
    const { height } = PRESETS[preset]
    snapUniform.value.set((height * (size.width / size.height)) / 2, height / 2)
  }, [size, preset])

  useEffect(() => {
    const patchAll = () =>
      scene.traverse((o) => {
        if (!o.material) return
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          patch(m)
          applyMaterialPreset(m, preset)
        }
      })
    patchAll()
    const id = setInterval(patchAll, 1000)
    return () => clearInterval(id)
  }, [scene, preset])

  return null
}
