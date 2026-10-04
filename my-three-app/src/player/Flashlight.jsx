import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/GameState'

const _pos = new THREE.Vector3()
const _dir = new THREE.Vector3()

// Handheld beam that follows your view. Always in the scene and just dimmed to 0
// when off: adding/removing lights forces every material to recompile (a hitch).
export default function Flashlight() {
  const on = useGameStore((s) => s.flashlightOn)
  const { camera, scene } = useThree()
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    scene.add(target)
    return () => scene.remove(target)
  }, [scene, target])

  useFrame(() => {
    camera.getWorldPosition(_pos)
    camera.getWorldDirection(_dir)
    // Held a little low and to the right, pointing where you look
    light.current.position.set(_pos.x, _pos.y - 0.15, _pos.z).addScaledVector(_dir, 0.2)
    target.position.copy(_pos).addScaledVector(_dir, 5)
  })

  return <spotLight ref={light} target={target} intensity={on ? 35 : 0} angle={0.45} penumbra={0.6} distance={14} decay={2} color="#fff1d0" />
}
