import { create } from 'zustand';
import { LAMP_FUEL_CONFIG, LAMP_STATES, getLampState } from '../../config/lampFuelConfig';

/**
 * Lamp Fuel Store
 *
 * Manages the state of the player's lamp fuel using a state machine.
 * States: FULL → STABLE → LOW → FLICKERING → CRITICAL → OFF
 */
export const useLampFuelStore = create((set, get) => ({
  // ============================================================================
  // State
  // ============================================================================
  fuelLevel: LAMP_FUEL_CONFIG.startingFuel,
  currentState: LAMP_STATES.FULL,
  isRefueling: false,
  lastFlickerTime: 0,
  flickerOn: true, // For flickering animation
  lampLightRef: null, // Reference to the Three.js PointLight

  // ============================================================================
  // Fuel Management
  // ============================================================================

  /**
   * Deplete fuel based on time delta and movement state
   * @param {number} delta - Time elapsed in seconds
   * @param {boolean} isRunning - Is player sprinting
   * @param {boolean} isWalking - Is player walking
   */
  depleteFuel: (delta, isRunning = false, isWalking = false) => {
    const state = get();

    // Don't deplete if refueling or system disabled
    if (state.isRefueling || !LAMP_FUEL_CONFIG.gameplay.enableFuelSystem) {
      return;
    }

    // Calculate depletion rate
    let depletionRate = LAMP_FUEL_CONFIG.idleDepletionRate;
    if (isRunning) {
      depletionRate = LAMP_FUEL_CONFIG.runningDepletionRate;
    } else if (isWalking) {
      depletionRate = LAMP_FUEL_CONFIG.walkingDepletionRate;
    }

    // Deplete fuel
    const newFuelLevel = Math.max(0, state.fuelLevel - depletionRate * delta);

    // Update state
    set({
      fuelLevel: newFuelLevel,
      currentState: getLampState(newFuelLevel),
    });
  },

  /**
   * Refuel the lamp
   * @param {number} amount - Amount of fuel to add (optional, uses config default)
   */
  refuel: (amount = LAMP_FUEL_CONFIG.refuel.amountPerCan) => {
    const state = get();

    // Calculate new fuel level
    let newFuelLevel = state.fuelLevel + amount;

    // Cap at max fuel if overfilling not allowed
    if (!LAMP_FUEL_CONFIG.refuel.canOverfill) {
      newFuelLevel = Math.min(LAMP_FUEL_CONFIG.maxFuel, newFuelLevel);
    }

    set({
      fuelLevel: newFuelLevel,
      currentState: getLampState(newFuelLevel),
      isRefueling: false,
    });

    console.log(`⛽ Refueled lamp: ${state.fuelLevel.toFixed(1)} → ${newFuelLevel.toFixed(1)}`);
  },

  /**
   * Start refueling process
   */
  startRefueling: () => {
    set({ isRefueling: true });
  },

  /**
   * Cancel refueling
   */
  cancelRefueling: () => {
    set({ isRefueling: false });
  },

  /**
   * Set fuel level directly (for debugging/testing)
   */
  setFuelLevel: (level) => {
    const newLevel = Math.max(0, Math.min(LAMP_FUEL_CONFIG.maxFuel, level));
    set({
      fuelLevel: newLevel,
      currentState: getLampState(newLevel),
    });
  },

  // ============================================================================
  // Lamp Light Registration
  // ============================================================================

  /**
   * Register the lamp's Three.js PointLight reference
   * Called by LampModel when it mounts
   * @param {React.RefObject} lightRef - Reference to the PointLight
   */
  registerLampLight: (lightRef) => {
    set({ lampLightRef: lightRef });
    console.log('💡 Lamp light registered with fuel store');
  },

  /**
   * Unregister the lamp light (cleanup)
   */
  unregisterLampLight: () => {
    set({ lampLightRef: null });
    console.log('💡 Lamp light unregistered');
  },

  // ============================================================================
  // Flickering Management
  // ============================================================================

  /**
   * Update flicker state based on current time
   * @param {number} currentTime - Current time in seconds
   */
  updateFlicker: (currentTime) => {
    const state = get();

    // Only flicker in FLICKERING or CRITICAL states
    if (state.currentState !== LAMP_STATES.FLICKERING && state.currentState !== LAMP_STATES.CRITICAL) {
      set({ flickerOn: true });
      return;
    }

    // Determine flicker interval based on state
    const interval =
      state.currentState === LAMP_STATES.CRITICAL
        ? LAMP_FUEL_CONFIG.flickering.criticalInterval
        : LAMP_FUEL_CONFIG.flickering.normalInterval;

    // Check if it's time to toggle flicker
    if (currentTime - state.lastFlickerTime >= interval) {
      set({
        flickerOn: !state.flickerOn,
        lastFlickerTime: currentTime,
      });
    }
  },

  /**
   * Get current light intensity based on state and flicker
   * @returns {number} Light intensity value
   */
  getLightIntensity: () => {
    const state = get();

    // If lamp is off, return 0
    if (state.currentState === LAMP_STATES.OFF) {
      return 0;
    }

    // If flickering state, return flicker intensity
    if (state.currentState === LAMP_STATES.FLICKERING || state.currentState === LAMP_STATES.CRITICAL) {
      if (!state.flickerOn) {
        return state.currentState === LAMP_STATES.CRITICAL
          ? LAMP_FUEL_CONFIG.flickering.criticalIntensityMin
          : LAMP_FUEL_CONFIG.flickering.normalIntensityMin;
      } else {
        return state.currentState === LAMP_STATES.CRITICAL
          ? LAMP_FUEL_CONFIG.flickering.criticalIntensityMax
          : LAMP_FUEL_CONFIG.flickering.normalIntensityMax;
      }
    }

    // Return base intensity for current state
    return LAMP_FUEL_CONFIG.lightIntensity[state.currentState] || 1.0;
  },

  /**
   * Get current light color based on state
   * @returns {string} Hex color code
   */
  getLightColor: () => {
    const state = get();
    return LAMP_FUEL_CONFIG.lightColor[state.currentState] || '#ffaa44';
  },

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Get fuel percentage (0-100)
   */
  getFuelPercent: () => {
    return (get().fuelLevel / LAMP_FUEL_CONFIG.maxFuel) * 100;
  },

  /**
   * Check if fuel is low (below warning threshold)
   */
  isFuelLow: () => {
    return get().getFuelPercent() < LAMP_FUEL_CONFIG.ui.warningTextThreshold;
  },

  /**
   * Reset fuel to starting value (for new game)
   */
  resetFuel: () => {
    set({
      fuelLevel: LAMP_FUEL_CONFIG.startingFuel,
      currentState: LAMP_STATES.FULL,
      isRefueling: false,
      lastFlickerTime: 0,
      flickerOn: true,
    });
  },

  // ============================================================================
  // Save/Load Integration
  // ============================================================================

  /**
   * Get save data for this store
   */
  getSaveData: () => {
    const state = get();
    return {
      fuelLevel: state.fuelLevel,
    };
  },

  /**
   * Load save data into this store
   */
  loadSaveData: (saveData) => {
    if (saveData && typeof saveData.fuelLevel === 'number') {
      set({
        fuelLevel: saveData.fuelLevel,
        currentState: getLampState(saveData.fuelLevel),
      });
    }
  },
}));
