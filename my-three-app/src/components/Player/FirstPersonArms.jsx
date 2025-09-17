import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import LampModel from './LampModel'

export default function FirstPersonArms({ camera, lampVisible }) {
  const group = useRef()
  const lampAnchor = useRef(new THREE.Group())
  const upperArmL = useRef()
  const lowerArmL = useRef()
  const wristL = useRef()
  const [rotationApplied, setRotationApplied] = useState(false)

  const { scene, animations } = useGLTF('./assets/models/player/AdventurerArms.glb')
  const { actions } = useAnimations(animations, scene)

  // Hardcoded arm rotation values
  const armRotation = {
    upperArmRx: 0.0,
    upperArmRy: 1.47,
    upperArmRz: -0.2,
  }

  // Hardcoded group transform values
  const groupTransform = {
    posX: 0,
    posY: 0.2,
    posZ: -1.4,
    rotX: 2,
    rotY: 2.85,
    rotZ: 0,
  }

  // Assign bones once model loads
  useEffect(() => {
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = obj.receiveShadow = true
      }

      if (obj.name === 'handL') upperArmL.current = obj
      if (obj.name === 'LowerArmL') lowerArmL.current = obj
      if (obj.name === 'WristL') wristL.current = obj
    })

    // Add scene to camera so it's first-person
    camera.add(group.current)
    group.current.add(scene)

    // Set group transform immediately
    if (group.current) {
      group.current.position.set(
        groupTransform.posX,
        groupTransform.posY,
        groupTransform.posZ
      )
      group.current.rotation.set(
        groupTransform.rotX,
        groupTransform.rotY,
        groupTransform.rotZ
      )
    }

    // Play idle animation
    actions['Idle']?.play()
  }, [scene, actions, camera])

  // Attach lamp once wristL is ready
  useEffect(() => {
    if (wristL.current) {
      wristL.current.add(lampAnchor.current)
      lampAnchor.current.position.set(-0.19, 0.6, -0.38)
      lampAnchor.current.rotation.set(0, -4.5, 1)
      lampAnchor.current.scale.setScalar(2.2)
    }
  }, [wristL.current]) // runs when wristL.current is assigned

  // useFrame to check and apply rotation once wristL is ready
  useFrame(() => {
    if (wristL.current && !rotationApplied) {
      wristL.current.rotation.set(
        armRotation.upperArmRx,
        armRotation.upperArmRy,
        armRotation.upperArmRz
      )
      setRotationApplied(true)
    }
  })

  return (
    <group ref={group}>
      <group ref={lampAnchor} visible={lampVisible}>
        <LampModel intensity={10} scale={2} />
      </group>
    </group>
  )
}
