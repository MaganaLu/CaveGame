import { useEffect, useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function PickUpItem({ id, itemType, modelPath, position = [0,0,0] }) {
  const ref = useRef()
  const { scene } = useGLTF(modelPath)
  const { scene: rootScene } = useThree()

  // Log original scene transform
  console.log(`📍 Original scene for ${id}:`, {
    position: scene.position.toArray(),
    rotation: scene.rotation.toArray().slice(0, 3),
    scale: scene.scale.toArray()
  });

  // Clone and convert SkinnedMesh to regular Mesh
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    console.log(`🔄 Cloning and converting scene for ${id}`);

    const group = new THREE.Group();

    // Convert SkinnedMesh to regular Mesh (same as handlePickup)
    clone.traverse((child) => {
      if (child.isSkinnedMesh || child.isMesh) {
        const geometry = child.geometry.clone();

        // Apply bind matrix for SkinnedMesh
        if (child.isSkinnedMesh) {
          geometry.applyMatrix4(child.bindMatrix);
        }

        const material = child.material.clone();
        const newMesh = new THREE.Mesh(geometry, material);

        newMesh.position.copy(child.position);
        newMesh.rotation.copy(child.rotation);
        newMesh.scale.copy(child.scale);
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;

        group.add(newMesh);
      }
    });

    console.log(`✅ Converted ${group.children.length} meshes for ${id}`);
    return group;
  }, [scene, id])

  if (!id) {
    console.error("❌ PickUpItem is missing required `id` prop. FIX THIS.")
  }

  if (!itemType) {
    console.error("❌ PickUpItem is missing required `itemType` prop. FIX THIS.")
  }

  // Wait + retry search for PickupController
  function findController() {
    let api = null
    rootScene.traverse((obj) => {
      if (obj.userData?.registerItem) api = obj.userData
    })
    return api
  }

  useEffect(() => {
    let pickupAPI = findController()

    if (!pickupAPI) {
      console.warn("⏳ PickupController not ready yet — retrying:", id)
      const t = setTimeout(() => {
        const retryAPI = findController()
        if (retryAPI) {
          console.log("📦 Registering item on retry:", id, "at position:", position)
          retryAPI.registerItem({ id, itemType, ref, scene: clonedScene })
        } else {
          console.error("❌ Still no PickupController found for:", id)
        }
      }, 100)
      return () => clearTimeout(t)
    }

    console.log("📦 Registering item in world:", id, "at position:", position)
    pickupAPI.registerItem({ id, itemType, ref, scene: clonedScene })

    return () => {
      console.log("🗑 Unregistering item:", id)
      pickupAPI.unregisterItem(id)
    }
  }, [id, itemType, clonedScene, position])

  return (
    <group ref={ref} position={position}>
      <primitive object={clonedScene} />
      {/* Debug sphere to visualize item position */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={id === 'alienBlade' ? 'red' : 'blue'} wireframe />
      </mesh>
    </group>
  )
}
