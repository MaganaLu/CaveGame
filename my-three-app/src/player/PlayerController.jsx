import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameInput from '../hooks/useGameInput';
import { useGameStore, isBlocked } from '../game/GameState';

// Capsule: half-height 0.5 + radius 0.3 => 1.6m tall, origin at its center
const CAPSULE = [0.5, 0.3];
const EYE_HEIGHT = 0.8; // above capsule center => ~1.6m eye level
const SENSITIVITY = 0.00125;
const WALK_SPEED = 3;

const _vel = new THREE.Vector3();
const _euler = new THREE.Euler();

const PlayerController = forwardRef(function PlayerController({ spawnPoint, spawnYaw = 0 }, ref) {
  const { camera, gl } = useThree();
  const rigidRef = useRef();
  const playerContainer = useRef(new THREE.Object3D());
  const pitchObject = useRef(new THREE.Object3D());
  const pitch = useRef(0);
  const bobPhase = useRef(0);

  const { keys, mouse } = useGameInput();

  useImperativeHandle(ref, () => ({
    rigidBody: rigidRef.current,
    camera,
    getWorldPosition: (target = new THREE.Vector3()) => {
      const t = rigidRef.current?.translation();
      return t ? target.set(t.x, t.y, t.z) : target;
    },
  }), [camera]);

  // Camera rig: container (yaw) -> pitchObject (pitch) -> camera
  useEffect(() => {
    const container = playerContainer.current;
    const pitchObj = pitchObject.current;
    container.rotation.y = spawnYaw;
    container.add(pitchObj);
    pitchObj.position.set(0, EYE_HEIGHT, 0);
    pitchObj.add(camera);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    return () => {
      pitchObj.remove(camera);
      container.remove(pitchObj);
    };
  }, [camera, spawnYaw]);

  // Click the canvas to capture the mouse, unless a UI overlay owns it
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button === 0 && !isBlocked(useGameStore.getState())) document.body.requestPointerLock();
    };
    gl.domElement.addEventListener('mousedown', onMouseDown);
    return () => gl.domElement.removeEventListener('mousedown', onMouseDown);
  }, [gl]);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const blocked = isBlocked(state);

    // Mouse look
    if (!blocked && (mouse.dx !== 0 || mouse.dy !== 0)) {
      playerContainer.current.rotation.y -= mouse.dx * SENSITIVITY;
      pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current - mouse.dy * SENSITIVITY));
      pitchObject.current.rotation.x = pitch.current;
    }
    mouse.dx = 0;
    mouse.dy = 0;

    // Movement
    _vel.set(0, 0, 0);
    if (!blocked) {
      if (keys.forward) _vel.z -= 1;
      if (keys.backward) _vel.z += 1;
      if (keys.left) _vel.x -= 1;
      if (keys.right) _vel.x += 1;
    }

    const rb = rigidRef.current;
    const isMoving = _vel.lengthSq() > 0;
    if (rb) {
      const vy = rb.linvel().y;
      if (isMoving) {
        const speed = WALK_SPEED * (keys.sprint ? 2 : 1);
        _vel.normalize().multiplyScalar(speed).applyEuler(_euler.set(0, playerContainer.current.rotation.y, 0));
        rb.setLinvel({ x: _vel.x, y: vy, z: _vel.z }, true);
      } else {
        rb.setLinvel({ x: 0, y: vy, z: 0 }, true);
      }
    }

    // Head bob replaces the old head-bone camera motion
    if (isMoving) bobPhase.current += delta * (keys.sprint ? 14 : 9);
    const bob = isMoving ? Math.sin(bobPhase.current) * 0.035 : 0;

    // Stress: subtle camera shake above 60
    const shake = Math.max(0, state.stress - 60) / 40 * 0.012;
    camera.position.set(
      (Math.random() - 0.5) * shake,
      bob + (Math.random() - 0.5) * shake,
      0
    );
  });

  return (
    <RigidBody
      ref={rigidRef}
      type="dynamic"
      colliders={false}
      enabledRotations={[false, false, false]}
      position={spawnPoint}
    >
      {/* No friction so the capsule slides along walls instead of sticking */}
      <CapsuleCollider args={CAPSULE} friction={0} />
      <primitive object={playerContainer.current} />
    </RigidBody>
  );
});

export default PlayerController;
