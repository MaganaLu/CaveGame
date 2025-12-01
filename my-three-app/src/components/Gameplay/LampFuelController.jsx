import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameInput from '../../hooks/useGameInput';
import { useLampFuelStore } from '../../storage/stores/lampFuelStore';
import { useInventoryStore } from '../../storage/stores/inventoryStore';
import { LAMP_FUEL_CONFIG } from '../../config/lampFuelConfig';

/**
 * Lamp Fuel Controller
 *
 * Manages the lamp fuel system:
 * - Depletes fuel when player runs (shift key)
 * - Handles refueling with C key + oil can
 * - Updates lamp light based on fuel state
 * - Triggers flickering effects
 *
 * @param {Object} props
 * @param {React.RefObject} props.playerRef - Reference to player object
 */
export default function LampFuelController({ playerRef }) {
  const { keys } = useGameInput();
  const wasRefuelPressed = useRef(false);
  const refuelTimeoutRef = useRef(null);

  // Lamp fuel store
  const lampLightRef = useLampFuelStore((state) => state.lampLightRef);
  const depleteFuel = useLampFuelStore((state) => state.depleteFuel);
  const updateFlicker = useLampFuelStore((state) => state.updateFlicker);
  const getLightIntensity = useLampFuelStore((state) => state.getLightIntensity);
  const getLightColor = useLampFuelStore((state) => state.getLightColor);
  const refuel = useLampFuelStore((state) => state.refuel);
  const startRefueling = useLampFuelStore((state) => state.startRefueling);
  const isRefueling = useLampFuelStore((state) => state.isRefueling);
  const fuelLevel = useLampFuelStore((state) => state.fuelLevel);
  const currentState = useLampFuelStore((state) => state.currentState);

  // Inventory
  const items = useInventoryStore((state) => state.items);
  const removeItem = useInventoryStore((state) => state.removeItem);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refuelTimeoutRef.current) {
        clearTimeout(refuelTimeoutRef.current);
      }
    };
  }, []);

  // Run every frame
  useFrame((state, delta) => {
    if (!LAMP_FUEL_CONFIG.gameplay.enableFuelSystem) {
      return; // System disabled
    }

    // Update flicker state
    updateFlicker(state.clock.elapsedTime);

    // Detect player movement state
    const isRunning = keys.sprint; // Shift key
    const isWalking = keys.forward || keys.backward || keys.left || keys.right;

    // Deplete fuel based on movement
    depleteFuel(delta, isRunning, isWalking);

    // Update lamp light if reference exists
    if (lampLightRef?.current) {
      // Update intensity based on fuel state and flicker
      lampLightRef.current.intensity = getLightIntensity();

      // Update color based on fuel state
      lampLightRef.current.color.set(getLightColor());
    }

    // Handle refuel key press (C key)
    const isRefuelPressed = keys.refuel; // Assuming 'refuel' key is mapped to C
    const justPressed = isRefuelPressed && !wasRefuelPressed.current;
    wasRefuelPressed.current = isRefuelPressed;

    if (justPressed && !isRefueling) {
      handleRefuel();
    }
  });

  /**
   * Handle refuel action
   */
  const handleRefuel = () => {
    // Check if refuel requires oil can
    if (LAMP_FUEL_CONFIG.gameplay.refuelRequiresOilCan) {
      // Find oil can in inventory
      const oilCan = items.find((item) => item.itemType === 'oilLampCan');

      if (!oilCan) {
        console.log('⚠️ No oil can in inventory!');
        // TODO: Show UI message "Need oil can to refuel"
        return;
      }

      console.log('⛽ Starting refuel with oil can...');

      // Start refueling
      startRefueling();

      // Simulate refuel time (animation)
      refuelTimeoutRef.current = setTimeout(() => {
        // Complete refuel
        refuel();

        // Consume oil can if configured
        if (LAMP_FUEL_CONFIG.gameplay.consumeOilCanOnUse) {
          removeItem(oilCan.id);
          console.log('🗑️ Consumed oil can');

          // Remove oil can model from player's hand
          if (playerRef.current?.handR) {
            const handChildren = [...playerRef.current.handR.children];
            handChildren.forEach(child => {
              playerRef.current.handR.remove(child);
              // Dispose of geometry and material to free memory
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });
            console.log('✋ Removed oil can from hand');
          }
        }
      }, LAMP_FUEL_CONFIG.refuel.refuelTime * 1000);
    } else {
      // Instant refuel (no oil can required - for testing)
      refuel();
    }
  };

  // This component doesn't render anything
  return null;
}
