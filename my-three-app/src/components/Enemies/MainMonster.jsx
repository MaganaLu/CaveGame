import React, { useRef, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  RigidBody,
  CapsuleCollider,
  CuboidCollider
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../../storage/stores/playerStore'
import * as THREE from 'three'

export default function MainMonster({onPlayerCaught, ...props}) {
  const group = useRef()
  const rigidRef = useRef()
  const [mixer, setMixer] = useState(null)
  const [actions, setActions] = useState({})
  const [currentAction, setCurrentAction] = useState(null)

  const { scene, animations } = useGLTF('./assets/models/monsters/void-spider/source/voided_spider.glb')
  const playerPosition = usePlayerStore((state) => state.position)

  // Setup AnimationMixer and actions
  useEffect(() => {
    if (!scene || animations.length === 0) return

    const _mixer = new THREE.AnimationMixer(scene)
    const _actions = {}

    animations.forEach((clip) => {
      _actions[clip.name] = _mixer.clipAction(clip)
    })

    _actions['idle']?.play()
    setMixer(_mixer)
    setActions(_actions)
    setCurrentAction('idle')

    return () => {
      _mixer.stopAllAction()
    }
  }, [scene, animations])

  // Helper: crossfade to a new action
  const playAction = (name) => {
    if (!mixer || !actions || name === currentAction) return
    const next = actions[name]
    const current = actions[currentAction]

    if (next && current !== next) {
      current?.fadeOut(0.2)
      next.reset().fadeIn(0.2).play()
      setCurrentAction(name)
    }
  }

  // Update animations
  useFrame((_, delta) => {
    mixer?.update(delta)

    if (!rigidRef.current || !playerPosition) return

    const monsterPos = rigidRef.current.translation()
    const monsterVec = new THREE.Vector3(monsterPos.x, monsterPos.y, monsterPos.z)
    const playerVec = new THREE.Vector3(...playerPosition)

    const direction = playerVec.clone().sub(monsterVec)
    const distance = direction.length()

    if (distance > 2.5) {
      direction.y = 0
      direction.normalize().multiplyScalar(2)
      rigidRef.current.setLinvel({ x: direction.x, y: 0, z: direction.z }, true)

      const lookAt = new THREE.Matrix4().lookAt(monsterVec, playerVec, new THREE.Vector3(0, 1, 0))
      const rotation = new THREE.Quaternion().setFromRotationMatrix(lookAt)
      rigidRef.current.setRotation(rotation, true)

      playAction('sprinting')
    } else {
      rigidRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      playAction('attack_L');

      onPlayerCaught?.();
    }
  })

  return (
    <RigidBody
      ref={rigidRef}
      type="dynamic"
      colliders={false}
      mass={1}
      friction={1}
      restitution={0.1}
      linearDamping={3}
      angularDamping={3}
      canSleep={false}
      enabledTranslations={[true, true, true]}
      enabledRotations={[false, true, false]}
      {...props}
    >
      {/* === Spider hitbox === */}
      <CapsuleCollider args={[0.4, 0.16]} position={[0, 0.8, 0]} />
      <CuboidCollider args={[0.6, 0.4, 0.8]} position={[0, 0.4, 0]} />

      {/* === Spider Model === */}
      <group ref={group} dispose={null}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  )
}
