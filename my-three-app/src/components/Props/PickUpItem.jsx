// PickupItem.jsx
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import useGameInput from '../../hooks/useGameInput'

export default function PickupItem({ modelPath, position = [0, 0, 0], pickupRadius = 2, playerRef, onPickup }) {
  const { scene } = useGLTF(modelPath)
  const { keys } = useGameInput()
  const worldItemRef = useRef()
  const [pickedUp, setPickedUp] = useState(false)
  const [inRange, setInRange] = useState(false)
  const worldPos = new THREE.Vector3()
  const playerPos = new THREE.Vector3()

  // Frame loop: check distance to player
  useFrame(() => {
    if (!worldItemRef.current || !playerRef?.current?.rigidBody) return

    worldItemRef.current.getWorldPosition(worldPos)
    const t = playerRef.current.rigidBody.translation()
    playerPos.set(t.x, t.y, t.z)
    const distance = worldPos.distanceTo(playerPos)
    const near = distance < pickupRadius

    if (near !== inRange) setInRange(near)

    if (near && keys.interact && !pickedUp) {
      pickUpItem()
    }
  })

  const pickUpItem = () => {
    if (!playerRef?.current || !worldItemRef.current) return
    const hand = playerRef.current.handR
    if (!hand) {
      console.warn('No right-hand anchor found!')
      return
    }

    // Hide world model
    worldItemRef.current.visible = false

    // Clone original GLTF to attach to hand
    const heldItem = scene.clone(true)
    heldItem.position.set(0, 0, 0)
    heldItem.rotation.set(0, 0, 0)
    heldItem.scale.set(1, 1, 1) // adjust if needed
    hand.add(heldItem)

    // Debug cube at hand origin
    const debugCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    )
    debugCube.position.set(0, 0, 0)
    hand.add(debugCube)

    setPickedUp(true)
    console.log('✅ Pickup complete! Held item attached to right hand.')
    console.log('Hand children:', hand.children)

    if (onPickup) onPickup()
  }

  return (
    <group position={position}>
      {/* World item */}
      <primitive ref={worldItemRef} object={scene} />

      {/* Pickup radius */}
      {!pickedUp && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[pickupRadius, 16, 16]} />
          <meshBasicMaterial color="yellow" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      {/* "Press E" indicator */}
      {inRange && !pickedUp && (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshBasicMaterial color="lime" />
        </mesh>
      )}
    </group>
  )
}
