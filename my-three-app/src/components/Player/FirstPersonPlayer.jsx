import React, { useRef, useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import FirstPersonArms from './FirstPersonArms'
import { saveProgress } from '../../storage/ElectronAPI'
import { usePlayerStore } from '../../storage/playerStore';

export default function FirstPersonPlayer({ progress, setProgress, spawnPoint }) {
  const { camera } = useThree();
  const rigidRef = useRef();
  const playerContainer = useRef(new THREE.Object3D());
  const pitchObject = useRef(new THREE.Object3D());
  const headBone = useRef(null);

  const { scene: playerScene, animations } = useGLTF('assets/models/player/Adventurer.gltf');
  const { actions } = useAnimations(animations, playerScene);

  const [lampVisible, setLampVisible] = useState(false);
  const keysPressed = useRef({ forward: false, backward: false, left: false, right: false, sprint: false });
  const lastSavedPos = useRef(new THREE.Vector3(...(progress?.playerPosition || spawnPoint)));
  const saveThreshold = 0.5; // in meters?

  const setPlayerPosition = usePlayerStore((state) => state.setPosition);

  // Setup player model
  useEffect(() => {
    playerContainer.current.add(pitchObject.current);
    pitchObject.current.add(camera);
    playerContainer.current.add(playerScene);
    playerScene.rotation.y = Math.PI;
    playerScene.scale.set(0.1, 0.1, 0.1);

    playerScene.traverse(child => {
      if (child.isMesh || child.isGroup) {
        const hideMeshes = ['HeadMesh', 'Chest', 'Torso', 'Plane', 'Cube063', 'Plane_1', 'Plane_2'];
        if (hideMeshes.includes(child.name)) child.visible = false;
      }
      if (child.isBone && child.name === 'Head') headBone.current = child;
    });

    actions['Idle']?.play();
  }, [camera, playerScene, actions]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = e => {
      switch (e.key.toLowerCase()) {
        case 'w': keysPressed.current.forward = true; break;
        case 's': keysPressed.current.backward = true; break;
        case 'a': keysPressed.current.left = true; break;
        case 'd': keysPressed.current.right = true; break;
        case 'c': keysPressed.current.crouch = true; break;
        case 'shift': keysPressed.current.sprint = true; break;
      }
    }

    const handleKeyUp = e => {
      switch (e.key.toLowerCase()) {
        case 'w': keysPressed.current.forward = false; break;
        case 's': keysPressed.current.backward = false; break;
        case 'a': keysPressed.current.left = false; break;
        case 'd': keysPressed.current.right = false; break;
        case 'c': keysPressed.current.crouch = false; break;
        case 'shift': keysPressed.current.sprint = false; break;
      }
    }

    const handleMouseMove = e => {
      if (document.pointerLockElement !== document.body) return;
      playerContainer.current.rotation.y -= e.movementX * 0.002;
      pitchObject.current.rotation.x -= e.movementY * 0.002;
      pitchObject.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 7, pitchObject.current.rotation.x));
    }

    const handleRightClick = e => {
      if (e.button === 2) setLampVisible(prev => !prev);
    }

    const handleClick = () => document.body.requestPointerLock();
    const preventContext = e => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleRightClick);
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', preventContext);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleRightClick);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', preventContext);
    }
  }, []);

  // Movement and animation
  useFrame(() => {
    const vel = new THREE.Vector3();
    if (keysPressed.current.forward) vel.z -= 1;
    if (keysPressed.current.backward) vel.z += 1;
    if (keysPressed.current.left) vel.x -= 1;
    if (keysPressed.current.right) vel.x += 1;

    const isMoving = vel.lengthSq() > 0;

    if (isMoving) {
      const baseSpeed = 3;
      const sprintMultiplier = keysPressed.current.sprint ? 2 : 1;
      const moveSpeed = baseSpeed * sprintMultiplier;

      vel.normalize().multiplyScalar(moveSpeed);
      vel.applyEuler(new THREE.Euler(0, playerContainer.current.rotation.y, 0));
      rigidRef.current?.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);

      if (actions['Run'] && !actions['Run'].isRunning()) {
        actions['Idle']?.fadeOut(0.2);
        actions['Run'].reset().fadeIn(0.2).play();
      }
    } else {
      rigidRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (actions['Idle'] && !actions['Idle'].isRunning()) {
        actions['Run']?.fadeOut(0.2);
        actions['Idle'].reset().fadeIn(0.2).play();
      }
    }

    // Update camera to head position
    if (headBone.current) {
      playerScene.updateMatrixWorld();
      const worldPos = new THREE.Vector3();
      headBone.current.getWorldPosition(worldPos);
      const local = playerContainer.current.worldToLocal(worldPos);
      pitchObject.current.position.copy(local);
      camera.position.set(0, 0.02, -0.01);
    } else {
      // default if no bone
      pitchObject.current.position.set(0, 1, 0); 
      camera.position.set(0, 0, 0);
    }

    // Position tracking
    if (rigidRef.current) {
      const pos = rigidRef.current.translation();
      setPlayerPosition([pos.x, pos.y, pos.z]);
    }

    // Save progress if moved far enough
    if (rigidRef.current && progress) {
      const pos = rigidRef.current.translation();
      const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      if (currentPos.distanceTo(lastSavedPos.current) > saveThreshold) {
        const newProgress = { ...progress, playerPosition: [pos.x, pos.y, pos.z] };
        saveProgress(newProgress);
        setProgress(newProgress);
        lastSavedPos.current.copy(currentPos);
      }
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidRef}
        type="dynamic"
        colliders={false}
        enabledRotations={[false, false, false]}
        position={progress?.playerPosition || spawnPoint}
      >
        <CapsuleCollider args={[0.4, 1]} />
        <primitive object={playerContainer.current} />
      </RigidBody>

      <FirstPersonArms camera={camera} lampVisible={lampVisible} />
    </>
  )
}
