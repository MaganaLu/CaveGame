import React, { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { AnimationClip } from 'three'

// bones for arms
const ARM_BONES = [
  'ShoulderL','UpperArmL','LowerArmL','WristL',
  'Index1L','Index2L','Index3L','Index4L',
  'Middle1L','Middle2L','Middle3L','Middle4L',
  'Ring1L','Ring2L','Ring3L','Ring4L',
  'Pinky1L','Pinky2L','Pinky3L','Pinky4L',
  'Thumb1L','Thumb2L','Thumb3L',
  'ShoulderR','UpperArmR','LowerArmR','WristR',
  'Index1R','Index2R','Index3R','Index4R',
  'Middle1R','Middle2R','Middle3R','Middle4R',
  'Ring1R','Ring2R','Ring3R','Ring4R',
  'Pinky1R','Pinky2R','Pinky3R','Pinky4R',
  'Thumb1R','Thumb2R','Thumb3R'
]

function removeArmTracksFromClip(clip) {
  const newClip = AnimationClip.parse(AnimationClip.toJSON(clip))
  newClip.tracks = newClip.tracks.filter(track =>
    !ARM_BONES.some(bone => track.name.includes(bone))
  )
  return newClip
}

export default function FirstPersonPlayer() {
  const { camera } = useThree()
  const playerContainer = useRef(new THREE.Object3D())
  const pitchObject     = useRef(new THREE.Object3D())
  const move = useRef({ forward: false, backward: false, left: false, right: false })
  const headBone = useRef(null)
  const bones = useRef({})

  const { scene: playerScene, animations } = useGLTF('/adventurer/Adventurer.gltf')
  const filteredClips = animations.map(removeArmTracksFromClip)
  const { actions } = useAnimations(filteredClips, playerScene)

  // init scene, head, bones, animation
  useEffect(() => {
    playerContainer.current.add(pitchObject.current)
    pitchObject.current.add(camera)
    playerContainer.current.add(playerScene)
    playerScene.rotation.y = Math.PI
  
    playerScene.traverse(child => {
      // Store head bone and arm bones
      if (child.isBone) {
        if (child.name === 'Head') headBone.current = child
        if (ARM_BONES.includes(child.name)) {
          bones.current[child.name] = child
        }
      }
  
      // hide the head 
      if (child.name === 'Adventurer_Head') {
        console.log('Hiding head:', child.name)
        child.visible = false
      }
    })
  
    actions['Idle']?.play()
  }, [camera, playerScene, actions])
  
  
  // Mouse look
  useEffect(() => {
    const onMouseMove = e => {
      if (document.pointerLockElement !== document.body) return
      playerContainer.current.rotation.y -= e.movementX * 0.002
      pitchObject.current.rotation.x -= e.movementY * 0.002
      pitchObject.current.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/3, pitchObject.current.rotation.x))
    }
    const onClick = () => document.body.requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  // Keyboard movement
  useEffect(() => {
    const onKeyDown = e => {
      if (e.code === 'KeyW') move.current.forward = true
      if (e.code === 'KeyS') move.current.backward = true
      if (e.code === 'KeyA') move.current.left = true
      if (e.code === 'KeyD') move.current.right = true
    }
    const onKeyUp = e => {
      if (e.code === 'KeyW') move.current.forward = false
      if (e.code === 'KeyS') move.current.backward = false
      if (e.code === 'KeyA') move.current.left = false
      if (e.code === 'KeyD') move.current.right = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Frame update
  useFrame(() => {
    const speed = 0.1
    const vel = new THREE.Vector3()
    if (move.current.forward) vel.z -= 1
    if (move.current.backward) vel.z += 1
    if (move.current.left) vel.x -= 1
    if (move.current.right) vel.x += 1

    if (vel.lengthSq() > 0) {
      vel.normalize().multiplyScalar(speed)
      const dir = vel.applyEuler(new THREE.Euler(0, playerContainer.current.rotation.y, 0))
      playerContainer.current.position.add(dir)
    }

    // Animations switching
    if (actions['Run'] && actions['Idle']) {
      const isMoving = vel.lengthSq() > 0.0001
    
      if (isMoving) {
        // If not already playing run, fade in run, fade out idle
        if (!actions['Run'].isRunning()) {
          actions['Idle'].fadeOut(0.2)
          actions['Run'].reset().fadeIn(0.2).play()
        }
      } else {
        // If not already playing idle, fade in idle, fade out run
        if (!actions['Idle'].isRunning()) {
          actions['Run'].fadeOut(0.2)
          actions['Idle'].reset().fadeIn(0.2).play()
        }
      }
    }
    

    // Update camera to head position
    if (headBone.current) {
      playerScene.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      headBone.current.getWorldPosition(worldPos);
      const local = playerContainer.current.worldToLocal(worldPos.clone());
      pitchObject.current.position.copy(local);
      camera.position.set(0, 0, 0);
    } else {
      pitchObject.current.position.set(0, 1.6, 0);
      camera.position.set(0, 0, 0);
    }
    

    // Static arm posing for holding lamp 
    const p = bones.current
    if (p.UpperArmL && p.LowerArmL && p.UpperArmR && p.LowerArmR) {
      p.UpperArmL.rotation.set(-1.2, 0, 0); 
      p.LowerArmL.rotation.set(-0.5, 0, 0);
    
      p.UpperArmR.rotation.set(-1.2, 0, 0);
      p.LowerArmR.rotation.set(-0.5, 0, 0);
    }
    

  })

  return <primitive object={playerContainer.current} />
}
