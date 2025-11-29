import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import useGameInput from '../../hooks/useGameInput'

export default function PickupController({ playerRef, onPickup }) {
  const items = useRef({})
  const pickedUpItems = useRef(new Set())

  const api = {
    registerItem({ id, itemType, ref, scene }) {
      console.log("📦 Registering pickup item:", id, "| Type:", itemType)
      items.current[id] = { itemType, ref, scene }
    },
    unregisterItem(id) {
      console.log("❌ Unregistering pickup item:", id)
      delete items.current[id]
      pickedUpItems.current.delete(id)
    },
    unpickItem(id) {
      console.log("🔄 Un-picking item (allow re-pickup):", id)
      pickedUpItems.current.delete(id)
    },
  }

  return (
    <group userData={api} name="PickupControllerRoot">
      <PickupUpdate 
        playerRef={playerRef} 
        onPickup={onPickup} 
        items={items}
        pickedUpItems={pickedUpItems}
      />
    </group>
  )
}

function PickupUpdate({ playerRef, onPickup, items, pickedUpItems }) {
  const v = new THREE.Vector3()
  const { keys } = useGameInput()
  const wasInteractPressed = useRef(false)

  useFrame(() => {
    if (!playerRef.current) return

    const playerPos = playerRef.current.getWorldPosition(v)
    const PICKUP_RADIUS = 2.5

    let closest = null
    let closestDist = Infinity

    for (const id in items.current) {
      if (pickedUpItems.current.has(id)) continue
      
      const item = items.current[id]
      if (!item.ref.current) continue

      const itemPos = item.ref.current.getWorldPosition(new THREE.Vector3())
      const dist = playerPos.distanceTo(itemPos)

      if (dist < closestDist) {
        closestDist = dist
        closest = { id, item }
      }
    }

    const isInteractPressed = keys.interact
    const justPressed = isInteractPressed && !wasInteractPressed.current
    wasInteractPressed.current = isInteractPressed

    if (!closest) return

    const inRange = closestDist < PICKUP_RADIUS

    if (inRange && Math.random() < 0.02) {
      console.log(`💡 Press E to pick up ${closest.id} (${closestDist.toFixed(2)}m)`)
    }

    if (justPressed && inRange) {
      console.log(`✅ E PRESSED - Picking up ${closest.id} (type: ${closest.item.itemType})`)

      // Clone the scene first (before hiding)
      const clonedScene = closest.item.scene.clone(true)
      console.log(`📋 Cloned scene for pickup attempt`)

      // Try to pickup - returns true if successful, false if inventory full
      const success = onPickup(closest.id, closest.item.itemType, { scene: clonedScene })

      if (success) {
        // Only hide and mark as picked up if pickup was successful
        pickedUpItems.current.add(closest.id)

        if (closest.item.ref.current) {
          let hiddenCount = 0
          closest.item.ref.current.traverse((child) => {
            if (child.isMesh || child.isObject3D || child.isGroup) {
              child.visible = false
              hiddenCount++
            }
          })
          closest.item.ref.current.visible = false
          console.log(`👻 Hidden world item completely (${hiddenCount} objects)`)
        }
      } else {
        console.log(`❌ Pickup failed - item remains in world`)
      }
    } else if (justPressed && !inRange) {
      console.log(`⚠️ E pressed but not in range (distance: ${closestDist.toFixed(2)}m)`)
    }
  })

  return null
}