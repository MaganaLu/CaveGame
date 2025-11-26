import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

export default function PickUpItem({ id, modelPath, position = [0,0,0] }) {
  const ref = useRef()
  const { scene } = useGLTF(modelPath)
  const { scene: rootScene } = useThree()

  if (!id) {
    console.error("❌ PickUpItem is missing required `id` prop. FIX THIS.")
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
          console.log("📦 Registering item on retry:", id)
          retryAPI.registerItem({ id, ref, scene })
        } else {
          console.error("❌ Still no PickupController found for:", id)
        }
      }, 100)
      return () => clearTimeout(t)
    }

    console.log("📦 Registering item in world:", id)
    pickupAPI.registerItem({ id, ref, scene })

    return () => {
      console.log("🗑 Unregistering item:", id)
      pickupAPI.unregisterItem(id)
    }
  }, [])

  return (
    <group ref={ref} position={position}>
      <primitive object={scene} />
    </group>
  )
}
