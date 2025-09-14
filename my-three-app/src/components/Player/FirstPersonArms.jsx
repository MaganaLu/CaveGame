import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF, useAnimations } from '@react-three/drei'
import LampModel from './LampModel'
import { useControls } from 'leva'

const ARM_BONES = [
  'ShoulderL','UpperArmL','LowerArmL','WristL',
  'Index1L','Index2L','Index3L','Index4L',
  'Middle1L','Middle2L','Middle3L','Middle4L',
  'Ring1R','Ring2R','Ring3R','Ring4R',
  'Pinky1R','Pinky2R','Pinky3R','Pinky4R',
  'Thumb1R','Thumb2R','Thumb3R'
]

export default function FirstPersonArms({ camera, lampVisible }) {
  const group = useRef()
  const lampAnchor = useRef(new THREE.Group())
  const { scene, animations } = useGLTF('./assets/models/player/AdventurerArms.glb')
  const { actions } = useAnimations(animations, scene)
  const leftHand = useRef(null)

      const options = useMemo(() => {
    return {
      x:{value:0, min:-100, max:100, step:0.01},
      y:{value:0, min:-100, max:100, step:0.01},
      z:{value:-1.35, min:-100, max:100, step:0.01},
      rx:{value:2, min:-100, max:100, step:0.01},
      ry:{value:2.85, min:-100, max:100, step:0.01},
      rz:{value:0, min:-100, max:100, step:0.01}
    }
  }, [])

  const arms = useControls('Polyhedron A', options)


  useEffect(() => {
    scene.traverse(obj => { if(obj.isMesh) obj.castShadow = obj.receiveShadow = true })
    actions['Idle']?.play()

    camera.add(group.current)
    group.current.add(scene)

    //group.current.position.set(0, 0, -1.35)
    group.current.position.set(arms.x,arms.y,arms.z);
    //group.current.rotation.set(2, 2.85, 0)
    group.current.rotation.set(arms.rx, arms.ry, arms.rz);
    group.current.scale.setScalar(1)

    leftHand.current = scene.getObjectByName('WristL') || scene.getObjectByName('HandL')
    if(leftHand.current) {
      leftHand.current.add(lampAnchor.current)
      lampAnchor.current.position.set(-0.15, 0.3, 0)
      lampAnchor.current.rotation.set(0, -3, 1)
      lampAnchor.current.scale.setScalar(2)
    }
  }, [scene, actions, camera])

  return (
    <group ref={group} >
      <group ref={lampAnchor} visible={lampVisible}>
        <LampModel intensity={5} scale={2} />
      </group>
    </group>
  )
}
