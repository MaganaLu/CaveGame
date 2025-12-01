import React, { forwardRef, useRef, useEffect, useImperativeHandle, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import FirstPersonArms from './FirstPersonArms';
import { saveProgress } from '../../storage/ElectronAPI';
import { usePlayerStore } from '../../storage/stores/playerStore';
import useGameInput from '../../hooks/useGameInput';
// ❌ Remove: import PickupController from './PickupController';

const FirstPersonPlayer = forwardRef(function FirstPersonPlayer({ progress, setProgress, spawnPoint }, ref) {
  const { camera } = useThree();
  const rigidRef = useRef();
  const playerContainer = useRef(new THREE.Object3D());
  const pitchObject = useRef(new THREE.Object3D());
  const headBone = useRef(null);
  const pitch = useRef(0);

  const { scene: playerScene, animations } = useGLTF('assets/models/player/Adventurer.gltf');
  const { actions } = useAnimations(animations, playerScene);

  const [lampVisible, setLampVisible] = useState(false);
  const handAnchorL = useRef(null);
  const handAnchorR = useRef(null);
  const [heldItem, setHeldItem] = useState(null);

  const setPlayerPosition = usePlayerStore((state) => state.setPosition);
  const { keys, mouse } = useGameInput();

  useEffect(() => console.log("🎮 FirstPersonPlayer mounted"), []);

  // Callback from FirstPersonArms
  const handleHandAnchorsReady = (left, right) => {
    console.log("📥 handleHandAnchorsReady called!");
    handAnchorL.current = left;
    handAnchorR.current = right;
    console.log("✅ Hand anchors stored in refs");
  };

  // Expose API
  useImperativeHandle(ref, () => ({
    playerContainer: playerContainer.current,
    rigidBody: rigidRef.current,
    camera,
    get handL() { return handAnchorL.current; },
    get handR() { return handAnchorR.current; },
    getWorldPosition: (target = new THREE.Vector3()) => {
      if (rigidRef.current) {
        const t = rigidRef.current.translation();
        return target.set(t.x, t.y, t.z);
      }
      playerContainer.current.getWorldPosition(target);
      return target;
    }
  }), [camera]);

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
        child.castShadow = child.receiveShadow = true;
      }
      if (child.isBone && child.name === 'Head') headBone.current = child;
    });

    actions['Idle']?.play();
  }, [camera, playerScene, actions]);

  useEffect(() => {
    const onMouseDown = e => {
      if (e.button === 2) setLampVisible(v => !v);
      if (e.button === 0) document.body.requestPointerLock();
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  useFrame(() => {
    // Mouse look
    if (mouse.dx !== 0 || mouse.dy !== 0) {
      const sensitivity = 0.00125;
      playerContainer.current.rotation.y -= mouse.dx * sensitivity;
      pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current - mouse.dy * sensitivity));
      pitchObject.current.rotation.x = pitch.current;
      mouse.dx = 0;
      mouse.dy = 0;
    }

    // Movement
    const vel = new THREE.Vector3();
    if (keys.forward) vel.z -= 1;
    if (keys.backward) vel.z += 1;
    if (keys.left) vel.x -= 1;
    if (keys.right) vel.x += 1;

    const isMoving = vel.lengthSq() > 0;
    if (isMoving && rigidRef.current) {
      const speed = 3 * (keys.sprint ? 2 : 1);
      vel.normalize().multiplyScalar(speed).applyEuler(new THREE.Euler(0, playerContainer.current.rotation.y, 0));
      const vy = rigidRef.current.linvel?.().y ?? 0;
      rigidRef.current.setLinvel({ x: vel.x, y: vy, z: vel.z }, true);
      if (actions['Run'] && !actions['Run'].isRunning()) {
        actions['Idle']?.fadeOut(0.2);
        actions['Run'].reset().fadeIn(0.2).play();
      }
    } else if (rigidRef.current) {
      const vy = rigidRef.current.linvel?.().y ?? 0;
      rigidRef.current.setLinvel({ x: 0, y: vy, z: 0 }, true);
      if (actions['Idle'] && !actions['Idle'].isRunning()) {
        actions['Run']?.fadeOut(0.2);
        actions['Idle'].reset().fadeIn(0.2).play();
      }
    }

    // Head offset
    if (headBone.current) {
      playerScene.updateMatrixWorld();
      const worldPos = new THREE.Vector3();
      headBone.current.getWorldPosition(worldPos);
      const local = playerContainer.current.worldToLocal(worldPos);
      pitchObject.current.position.copy(local);
      camera.position.set(0, 0.02, -0.01);
    } else {
      pitchObject.current.position.set(0, 1, 0);
      camera.position.set(0, 0, 0);
    }

    // Update player store
    if (rigidRef.current) {
      const t = rigidRef.current.translation();
      setPlayerPosition([t.x, t.y, t.z]);
    }

    // Note: Position saves removed from useFrame to prevent stuttering
    // Position is now saved periodically (30s timer) and on events (pickup/drop/death)
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

      <FirstPersonArms
        camera={camera}
        lampVisible={lampVisible}
        onHandAnchorsReady={handleHandAnchorsReady}
      />
      
      {/* ❌ Remove: <PickupController playerRef={ref} onPickup={handlePickup} /> */}
    </>
  );
});

export default FirstPersonPlayer;