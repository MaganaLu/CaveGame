import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, isBlocked } from '../game/GameState'
import { INTERACTIONS } from './interactions'
import { pressed } from '../game/controls'

const REACH = 3
const CENTER = new THREE.Vector2(0, 0)

// Walks up from a hit mesh to the nearest Interactable group. Returns null if any
// ancestor is hidden, so hidden objects (e.g. the phone once picked up) are ignored.
function findInteractable(object) {
  let id = null
  for (let o = object; o; o = o.parent) {
    if (!o.visible) return null
    if (!id && o.userData?.interactable) id = o.userData.interactable
  }
  return id
}

// Raycasts from the screen center each frame. Walls and furniture occlude, since
// the whole scene is tested and only the first hit counts.
export default function InteractionSystem() {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster(undefined, undefined, 0, REACH))
  const target = useRef(null)

  useFrame(() => {
    const state = useGameStore.getState()
    let id = null
    if (!isBlocked(state)) {
      raycaster.current.setFromCamera(CENTER, camera)
      const hit = raycaster.current.intersectObjects(scene.children, true).find((h) => h.object.isMesh)
      id = hit ? findInteractable(hit.object) : null
    }
    const [key, arg] = id ? id.split(':') : []
    const def = key && INTERACTIONS[key]
    const enabled = def && (!def.enabled || def.enabled(state, arg))
    target.current = enabled ? { def, arg } : null
    state.setPrompt(enabled ? def.label(state, arg) : null)
  })

  // Interact with E (or whatever it's bound to), or left-click while the mouse is captured
  useEffect(() => {
    const interact = () => {
      const state = useGameStore.getState()
      if (target.current && !isBlocked(state)) target.current.def.run(state, target.current.arg)
    }
    const onKeyDown = (e) => {
      if (pressed(e, 'interact') && !e.repeat) interact()
    }
    const onMouseDown = (e) => {
      if (e.button === 0 && document.pointerLockElement === document.body) interact()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  return null
}
