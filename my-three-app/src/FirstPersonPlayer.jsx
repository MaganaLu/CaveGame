import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
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
  const lampAnchor = useRef(new THREE.Group())
  const { scene, animations } = useGLTF('/adventurer/FPVArms.glb')
  const { actions } = useAnimations(animations, scene)
  const leftHand = useRef(null)

  // State for lamp toggle
  const [lampOn, setLampOn] = React.useState(false)

  // Access KeyboardControls context
  const [keys] = useKeyboardControls()

  useEffect(() => {
    // Enable shadows
    scene.traverse(obj => {
      if (obj.isMesh) obj.castShadow = obj.receiveShadow = true
    })

    actions['Idle']?.play()
    camera.add(group.current)

    // Attach lampAnchor to left hand bone
    leftHand.current =
      scene.getObjectByName('handL') ||
      scene.getObjectByName('HandL') ||
      scene.getObjectByName('LeftHand')

    if (leftHand.current) {
      leftHand.current.add(lampAnchor.current)
      lampAnchor.current.position.set(0.03, 0.2, -0.1)
      lampAnchor.current.rotation.set(0, 1.5, 1.5)
    }

    // Correct hand orientation
    group.current.rotation.set(2, 3.15, 0)
  }, [camera, scene, actions])

  // Listen for E key toggle
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'e' || e.key === 'E') {
        setLampOn(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useFrame(() => {
    if (!group.current) return

    // FPS arms positioning
    const distance = 0.15
    const verticalOffset = -0.10
    const scale = 0.5
    group.current.position.set(0, verticalOffset, -distance)
    group.current.scale.setScalar(scale)

    // Smooth arm rotation
    if (leftHand.current) {
      const targetRotation = lampOn
        ? new THREE.Euler(.3, 0, 0) // lift arm
        : new THREE.Euler(0, 0, 0)          // resting

      leftHand.current.rotation.x += (targetRotation.x - leftHand.current.rotation.x) * 0.2
      leftHand.current.rotation.y += (targetRotation.y - leftHand.current.rotation.y) * 0.2
      leftHand.current.rotation.z += (targetRotation.z - leftHand.current.rotation.z) * 0.2
    }

    // Lamp visibility
    if (lampAnchor.current.children[0]) {
      lampAnchor.current.children[0].visible = lampOn
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
      <group ref={lampAnchor}>
        <LampModel intensity={10} scale={0.1} visible={lampOn} />
      </group>
    </group>
  )
}


// ---------------- First Person Player ----------------
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
        if (ARM_BONES.includes(child.name)) {
          bones.current[child.name] = child
          child.visible = false
        }
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
        Math.min(Math.PI / 7, pitchObject.current.rotation.x)
      )
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', () => document.body.requestPointerLock())
    return () => window.removeEventListener('mousemove', onMouseMove)
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

    // Optional small arm pose
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

      {/* FPS Hands */}
      <FPSArms camera={camera} />
    </>
  )
}
