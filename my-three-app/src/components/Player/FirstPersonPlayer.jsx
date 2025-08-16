import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useKeyboardControls } from '@react-three/drei'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import LampModel from './LampModel'


function FPSArms({ camera }) {
  const group = useRef()
  const lampAnchor = useRef(new THREE.Group())
  const { scene, animations } = useGLTF('./assets/models/player/AdventurerArms.glb')
  const { actions } = useAnimations(animations, scene)
  const leftHand = useRef(null)
  const [lampVisible, setLampVisible] = React.useState(true)
  const [_, getKeys] = useKeyboardControls()

  const togglePressed = useRef(false) // track if key was already pressed

  useEffect(() => {
    scene.traverse(obj => {
      if (obj.isMesh) obj.castShadow = obj.receiveShadow = true
    })

    actions['Idle']?.play()

    camera.add(group.current)
    group.current.add(scene)

    group.current.position.set(0, 0.2, -1.37)
    group.current.rotation.set(2, 3, 0)
    group.current.scale.setScalar(1)

    leftHand.current = scene.getObjectByName('WristL') || scene.getObjectByName('HandL')
    if (leftHand.current) {
      leftHand.current.add(lampAnchor.current)
      lampAnchor.current.position.set(-0.15, 0.3, 0)
      lampAnchor.current.rotation.set(0, -3, 1)
      lampAnchor.current.scale.setScalar(2)
    }
  }, [scene, actions, camera])

  useFrame(() => {
    const keys = getKeys()
    if (keys.toggleLamp) {
      if (!togglePressed.current) {
        setLampVisible(prev => !prev) // toggle once
        togglePressed.current = true   // mark key as handled
      }
    } else {
      togglePressed.current = false   // reset when key released
    }
  })

  return (
    <group ref={group}>
      <group ref={lampAnchor}>
        {lampVisible && <LampModel intensity={5} scale={2} />}
      </group>
    </group>
  )
}


export default function FirstPersonPlayer() {
  const { camera } = useThree()
  const [_, getKeys] = useKeyboardControls()
  const rigidRef = useRef()
  const playerContainer = useRef(new THREE.Object3D())
  const pitchObject = useRef(new THREE.Object3D())
  const headBone = useRef(null)
  const bones = useRef({})

  const { scene: playerScene, animations } = useGLTF('assets/models/player/Adventurer.gltf')
  const { actions } = useAnimations(animations, playerScene)

  useEffect(() => {
    playerContainer.current.add(pitchObject.current)
    pitchObject.current.add(camera)
    playerContainer.current.add(playerScene)
    playerScene.rotation.y = Math.PI
    playerScene.scale.set(0.1, 0.1, 0.1)

    // Hide body for FPS view
    playerScene.traverse(child => {
      if (child.isMesh || child.isGroup) {
        const hideMeshes = ['HeadMesh','Chest','Torso','Plane','Cube063','Plane', 'Plane_1', 'Plane_2', 'Cube039', 'Cube0631']
        if (hideMeshes.includes(child.name)) child.visible = false
      }
      if (child.isBone && child.name==='Head') headBone.current=child
    })

    actions['Idle']?.play()
  }, [camera, playerScene, actions])

  useEffect(() => {
    const onMouseMove = e => {
      if (document.pointerLockElement!==document.body) return
      playerContainer.current.rotation.y -= e.movementX*0.002
      pitchObject.current.rotation.x -= e.movementY*0.002
      pitchObject.current.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/7, pitchObject.current.rotation.x))
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click',()=>document.body.requestPointerLock())
    return ()=> window.removeEventListener('mousemove', onMouseMove)
  }, [])

  useFrame(() => {
    const keys = getKeys()
    const vel = new THREE.Vector3()
    if(keys.forward) vel.z-=1
    if(keys.backward) vel.z+=1
    if(keys.left) vel.x-=1
    if(keys.right) vel.x+=1

    const isMoving = vel.lengthSq()>0
    if(isMoving){
      vel.normalize().multiplyScalar(3)
      vel.applyEuler(new THREE.Euler(0,playerContainer.current.rotation.y,0))
      rigidRef.current?.setLinvel({x:vel.x,y:0,z:vel.z},true)
    } else {
      rigidRef.current?.setLinvel({x:0,y:0,z:0},true)
    }

    if(actions['Run'] && actions['Idle']){
      if(isMoving && !actions['Run'].isRunning()){ actions['Idle'].fadeOut(0.2); actions['Run'].reset().fadeIn(0.2).play() }
      else if(!isMoving && !actions['Idle'].isRunning()){ actions['Run'].fadeOut(0.2); actions['Idle'].reset().fadeIn(0.2).play() }
    }

    if(headBone.current){
      playerScene.updateMatrixWorld()
      const worldPos = new THREE.Vector3()
      headBone.current.getWorldPosition(worldPos)
      const local = playerContainer.current.worldToLocal(worldPos)
      pitchObject.current.position.copy(local)
      camera.position.set(0,.02,-0.01)
    } else {
      pitchObject.current.position.set(0,1.6,0)
      camera.position.set(0,0,0)
    }
  })

  return (
    <>
      <RigidBody
        ref={rigidRef}
        type="dynamic"
        colliders={false}
        enabledRotations={[false,false,false]}
        position={[0,0,0]}
      >
        <CapsuleCollider args={[0.4,0.5]} />
        <primitive object={playerContainer.current} />
      </RigidBody>

      <FPSArms camera={camera} />
    </>
  )
}
