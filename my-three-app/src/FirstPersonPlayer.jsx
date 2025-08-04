import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function FirstPersonPlayer() {
  const { camera } = useThree()

  const yawObject = useRef(new THREE.Object3D())    // Player rotation (Y)
  const pitchObject = useRef(new THREE.Object3D())  // Camera rotation (X)
  const armsRef = useRef()
  const move = useRef({ forward: false, backward: false, left: false, right: false })

  const { scene: armsScene } = useGLTF('/arms/scene.gltf');

  // Setup hierarchy
  useEffect(() => {
    yawObject.current.add(pitchObject.current)
    pitchObject.current.add(camera)
    camera.position.set(0, 1.6, 0)

    // Add arms to pitchObject (so they follow camera rotation)
    pitchObject.current.add(armsScene)
    armsScene.position.set(0.0, -1.5, -.05)
    armsScene.scale.set(0.6, 0.6, 0.6)
    armsScene.rotation.set(0, Math.PI, 0) // Flip to face forward

    // Optional: tweak material
    armsScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [camera, armsScene])

  // Pointer lock and mouse look
  useEffect(() => {
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== document.body) return
      const { movementX = 0, movementY = 0 } = e

      yawObject.current.rotation.y -= movementX * 0.002
      pitchObject.current.rotation.x -= movementY * 0.002

      // Clamp pitch (look up/down)
      pitchObject.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.current.rotation.x))
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

  // Keyboard input
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

  // Movement + arm sway
  const prevPos = useRef(new THREE.Vector3())
  const sway = useRef({ x: 0, z: 0, vx: 0, vz: 0 })

  useFrame(() => {
    const speed = 0.1
    const velocity = new THREE.Vector3()

    if (move.current.forward) velocity.z -= speed
    if (move.current.backward) velocity.z += speed
    if (move.current.left) velocity.x -= speed
    if (move.current.right) velocity.x += speed

    const direction = velocity.applyEuler(new THREE.Euler(0, yawObject.current.rotation.y, 0))
    yawObject.current.position.add(direction)

    // Sway effect based on movement
    const delta = yawObject.current.position.clone().sub(prevPos.current)
    const movementSpeed = delta.length()
    prevPos.current.copy(yawObject.current.position)

    const damping = 0.9
    const stiffness = 0.05

    sway.current.vx += -sway.current.x * stiffness + movementSpeed * 0.02
    sway.current.vz += -sway.current.z * stiffness + movementSpeed * 0.015
    sway.current.vx *= damping
    sway.current.vz *= damping
    sway.current.x += sway.current.vx
    sway.current.z += sway.current.vz

    if (armsScene) {
      armsScene.rotation.x = sway.current.x
      armsScene.rotation.z = sway.current.z
    }
  })

  return (
    <primitive object={yawObject.current} />
  )
}
