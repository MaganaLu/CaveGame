import React, { useRef, useEffect } from 'react'
import { useFBX, useAnimations } from '@react-three/drei'
import {
  RigidBody,
  CapsuleCollider,
  CuboidCollider,
  BallCollider
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../../storage/playerStore'
import * as THREE from 'three'

export default function MainMonster(props) {
  const group = useRef()
  const rigidRef = useRef()

  // Load model
  const fbx = useFBX('./assets/models/monsters/ragno-monster2/source/Ragno-monster.fbx')
  const { animations } = fbx
  const { actions } = useAnimations(animations, group)

  // Get player position from store
  const playerPosition = usePlayerStore((state) => state.position)

  // Play idle animation
  useEffect(() => {
    if (animations.length > 0) {
      actions[animations[0].name]?.play()
    }
  }, [animations, actions])

  // Follow player logic
  useFrame(() => {
    if (!rigidRef.current || !playerPosition) return

    const monsterPos = rigidRef.current.translation()
    const monsterVec = new THREE.Vector3(monsterPos.x, monsterPos.y, monsterPos.z)
    const playerVec = new THREE.Vector3(...playerPosition)

    const direction = playerVec.clone().sub(monsterVec)
    const distance = direction.length()

    if (distance > 1.5) {
      direction.y = 0 // stay grounded
      direction.normalize().multiplyScalar(2)
      rigidRef.current.setLinvel({ x: direction.x, y: 0, z: direction.z }, true)

      // Face the player
      const lookAt = new THREE.Matrix4().lookAt(monsterVec, playerVec, new THREE.Vector3(0, 1, 0))
      const rotation = new THREE.Quaternion().setFromRotationMatrix(lookAt)
      rigidRef.current.setRotation(rotation, true)
    } else {
      // Stop movement
      rigidRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  return (
    <RigidBody
      ref={rigidRef}
      type="dynamic"
      colliders={false} // using compound colliders below
      mass={2}
      friction={1}
      restitution={0.1}
      linearDamping={3}
      angularDamping={3}
      enabledTranslations={[true, true, true]} // locked Y axis
      enabledRotations={[false, true, false]} // allow Y rotation only
      {...props}
    >
      {/* === Compound Colliders === */}

      {/* Abdomen */}
      <CapsuleCollider position={[1, 170, 0]} args={[40, 1.6, 8, 16]} />

      {/* Legs spread */}
        <CuboidCollider position={[-55, 140, 150]} args={[30, 280, 40]} />
        <CuboidCollider position={[55, 140, 150]} args={[30, 280, 40]} />
        <CuboidCollider position={[160, 140, 0]} args={[30, 280, 40]} />
        <CuboidCollider position={[-160, 140, 0]} args={[30, 280, 40]} />

      {/* Optional: Foot contact points */}
      {/* <BallCollider args={[0.1]} position={[1, 0, 1]} /> */}

      {/* === Visual Debug Colliders (DEV only) === */}
      {import.meta.env.DEV && (
        <group>
          <mesh position={[1, 170, 0]}>
            <capsuleGeometry args={[40, 1.6, 8, 16]} />
            <meshBasicMaterial wireframe color="lime" />
          </mesh>

          <mesh position={[-55, 140, 150]}>
            <boxGeometry args={[30, 280, 40]} />
            <meshBasicMaterial wireframe color="cyan" />
          </mesh>
          <mesh position={[55, 140, 150]}>
            <boxGeometry args={[30, 280, 40]} />
            <meshBasicMaterial wireframe color="cyan" />
          </mesh>
          <mesh position={[160, 140, 0]}>
            <boxGeometry args={[30, 280, 40]} />
            <meshBasicMaterial wireframe color="cyan" />
          </mesh>
          <mesh position={[-160, 140, 0]}>
            <boxGeometry args={[30, 280, 40]} />
            <meshBasicMaterial wireframe color="cyan" />
          </mesh>
        </group>
      )}

      {/* === Spider FBX Model === */}
      <group ref={group} dispose={null}>
        <group rotation={[0, Math.PI, 0]}>
          <primitive object={fbx} />
        </group>
      </group>
    </RigidBody>
  )
}
