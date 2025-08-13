import React, { useRef, useEffect } from 'react'
import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { useGLTF, useAnimations, useKeyboardControls } from '@react-three/drei'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import LampModel from './LampModel'

const ARM_BONES = [
  'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL',
  'Index1L', 'Index2L', 'Index3L', 'Index4L',
  'Middle1L', 'Middle2L', 'Middle3L', 'Middle4L',
  'Ring1L', 'Ring2L', 'Ring3L', 'Ring4L',
  'Pinky1L', 'Pinky2L', 'Pinky3L', 'Pinky4L',
  'Thumb1L', 'Thumb2L', 'Thumb3L',
  'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR',
  'Index1R', 'Index2R', 'Index3R', 'Index4R',
  'Middle1R', 'Middle2R', 'Middle3R', 'Middle4R',
  'Ring1R', 'Ring2R', 'Ring3R', 'Ring4R',
  'Pinky1R', 'Pinky2R', 'Pinky3R', 'Pinky4R',
  'Thumb1R', 'Thumb2R', 'Thumb3R'
]

function removeArmTracksFromClip(clip) {
  const newClip = THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(clip))
  newClip.tracks = newClip.tracks.filter(
    track => !ARM_BONES.some(bone => track.name.includes(bone))
  )
  return newClip
}

// ---------------- FPS Arms Component ----------------
function FPSArms({ camera }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/arms/scene.gltf')
  const { actions } = useAnimations(animations, scene)

  const lampRef = useRef(null)

  useEffect(() => {
    scene.traverse(obj => {
      if (obj.isMesh) obj.castShadow = obj.receiveShadow = true
    })
    actions['Idle']?.play()

    // Attach lamp to left wrist
    const leftWrist = scene.getObjectByName('WristL')
    if (leftWrist) {
      const lampAttachment = new THREE.Object3D()
      lampAttachment.position.set(0, -0.1, 0.1)
      lampAttachment.rotation.set(Math.PI / 2, 0, 0)
      leftWrist.add(lampAttachment)
      lampRef.current = lampAttachment
    }

    // Attach arms to the camera
    camera.add(group.current)

    // **Adjust position and rotation for FPS view**
    group.current.position.set(0, -1.5, 0) // positioned more naturally in front
    group.current.rotation.set(0, Math.PI, 0) // less extreme rotation for natural look
  }, [camera])


  return (
    <group ref={group} scale={0.3}>
      <primitive object={scene} />
      {lampRef.current && createPortal(<LampModel />, lampRef.current)}
    </group>
  )
}

// ---------------- First Person Player (Full Body) ----------------
export default function FirstPersonPlayer() {
  const { camera } = useThree()
  const [_, getKeys] = useKeyboardControls()

  const rigidRef = useRef()
  const playerContainer = useRef(new THREE.Object3D())
  const pitchObject = useRef(new THREE.Object3D())
  const headBone = useRef(null)
  const bones = useRef({})

  const { scene: playerScene, animations } = useGLTF('/adventurer/Adventurer.gltf')
  const filteredClips = animations.map(removeArmTracksFromClip)
  const { actions } = useAnimations(filteredClips, playerScene)

  useEffect(() => {
    playerContainer.current.add(pitchObject.current)
    pitchObject.current.add(camera)
    playerContainer.current.add(playerScene)
    playerScene.rotation.y = Math.PI
    playerScene.scale.set(0.1, 0.1, 0.1)

    playerScene.traverse(child => {
      if (child.isBone) {
        if (child.name === 'Head') headBone.current = child
        if (ARM_BONES.includes(child.name)) bones.current[child.name] = child
      }
      if (child.name === 'Adventurer_Head') child.visible = false
    })

    actions['Idle']?.play()
  }, [camera, playerScene, actions])

  // Mouse look
  useEffect(() => {
    const onMouseMove = e => {
      if (document.pointerLockElement !== document.body) return
      playerContainer.current.rotation.y -= e.movementX * 0.002
      pitchObject.current.rotation.x -= e.movementY * 0.002
      pitchObject.current.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 3, pitchObject.current.rotation.x)
      )
    }
    const onClick = () => document.body.requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  // Movement & animation
  useFrame(() => {
    const keys = getKeys()
    const vel = new THREE.Vector3()
    if (keys.forward) vel.z -= 1
    if (keys.backward) vel.z += 1
    if (keys.left) vel.x -= 1
    if (keys.right) vel.x += 1

    const isMoving = vel.lengthSq() > 0
    if (isMoving) {
      vel.normalize().multiplyScalar(3)
      vel.applyEuler(new THREE.Euler(0, playerContainer.current.rotation.y, 0))
      rigidRef.current?.setLinvel({ x: vel.x, y: 0, z: vel.z }, true)
    } else {
      rigidRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    if (actions['Run'] && actions['Idle']) {
      if (isMoving && !actions['Run'].isRunning()) {
        actions['Idle'].fadeOut(0.2)
        actions['Run'].reset().fadeIn(0.2).play()
      } else if (!isMoving && !actions['Idle'].isRunning()) {
        actions['Run'].fadeOut(0.2)
        actions['Idle'].reset().fadeIn(0.2).play()
      }
    }

    if (headBone.current) {
      playerScene.updateMatrixWorld()
      const worldPos = new THREE.Vector3()
      headBone.current.getWorldPosition(worldPos)
      const local = playerContainer.current.worldToLocal(worldPos)
      pitchObject.current.position.copy(local)
      camera.position.set(0, 0, 0)
    } else {
      pitchObject.current.position.set(0, 1.6, 0)
      camera.position.set(0, 0, 0)
    }

    // Optional: small arm pose for full body
    const p = bones.current
    if (p.UpperArmL && p.LowerArmL && p.UpperArmR && p.LowerArmR) {
      p.UpperArmL.rotation.set(-1.2, 0, 0)
      p.LowerArmL.rotation.set(-0.5, 0, 0)
      p.UpperArmR.rotation.set(-1.2, 0, 0)
      p.LowerArmR.rotation.set(-0.5, 0, 0)
    }
  })

  return (
    <>
      <RigidBody
        ref={rigidRef}
        type="dynamic"
        colliders={false}
        enabledRotations={[false, false, false]}
        position={[0, 0, 0]}
      >
        <CapsuleCollider args={[0.4, 0.5]} />
        <primitive object={playerContainer.current} />
      </RigidBody>

      {/* FPS Arms */}
      <FPSArms camera={camera} />
    </>
  )
}
