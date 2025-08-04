import React, { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

export default function FirstPersonPlayer() {
  const { camera } = useThree()

  const playerContainer = useRef(new THREE.Object3D()) // position + yaw rotation container
  const pitchObject = useRef(new THREE.Object3D())    // vertical rotation (camera look)
  const move = useRef({ forward: false, backward: false, left: false, right: false })

  // Load player model (e.g. Adventurer)
  const { scene: playerScene, animations } = useGLTF('/adventurer/Adventurer.gltf')
  const { actions } = useAnimations(animations, playerScene)

  useEffect(() => {
    // Setup scene graph
    playerContainer.current.add(pitchObject.current) // pitchObject holds camera for vertical look
    playerContainer.current.add(playerScene)         // player model sibling to pitchObject
    pitchObject.current.add(camera)                   // camera inside pitchObject

    // Position camera *slightly forward* so it’s in front of face, not inside head
    camera.position.set(0, 1.6, 0.2)

    // Position model so feet are below camera and arms forward
    playerScene.position.set(0, -1.6, -.4)
    playerScene.rotation.y = Math.PI
    playerScene.scale.set(1, 1, 1)

    actions['Idle']?.play()
  }, [camera, playerScene, actions])

  // Pointer lock + mouse look
  useEffect(() => {
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== document.body) return
      const movementX = e.movementX || 0
      const movementY = e.movementY || 0

      // Yaw rotate playerContainer
      playerContainer.current.rotation.y -= movementX * 0.002
      // Pitch rotate pitchObject (clamped)
      pitchObject.current.rotation.x -= movementY * 0.002
      pitchObject.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 3, pitchObject.current.rotation.x)) // limit up tilt
    }

    const onClick = () => {
      document.body.requestPointerLock()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  // Keyboard movement
  useEffect(() => {
    const onKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': move.current.forward = true; break
        case 'KeyS': move.current.backward = true; break
        case 'KeyA': move.current.left = true; break
        case 'KeyD': move.current.right = true; break
      }
    }
    const onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': move.current.forward = false; break
        case 'KeyS': move.current.backward = false; break
        case 'KeyA': move.current.left = false; break
        case 'KeyD': move.current.right = false; break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame(() => {
    const speed = 0.1
    const velocity = new THREE.Vector3()

    if (move.current.forward) velocity.z -= speed
    if (move.current.backward) velocity.z += speed
    if (move.current.left) velocity.x -= speed
    if (move.current.right) velocity.x += speed

    // Move relative to playerContainer rotation (yaw)
    const direction = velocity.applyEuler(new THREE.Euler(0, playerContainer.current.rotation.y, 0))
    playerContainer.current.position.add(direction)

    // Animation toggle
    if (actions['Run'] && actions['Idle']) {
      if (velocity.length() > 0.01) {
        actions['Idle'].fadeOut(0.2)
        actions['Run'].fadeIn(0.2).play()
      } else {
        actions['Run'].fadeOut(0.2)
        actions['Idle'].fadeIn(0.2).play()
      }
    }

    // Force right arm pose to keep arm extended
    playerScene.traverse((child) => {
      if (!child.isBone) return

      if (child.name === 'UpperArmR') {
        child.rotation.x = -Math.PI / 3
        child.rotation.z = 0.1
      }

      if (child.name === 'LowerArmR') {
        child.rotation.x = -Math.PI / 6
        child.rotation.z = 0.05
      }
    })
  })

  return <primitive object={playerContainer.current} />
}
