/**
 * Lamp Fuel System Configuration
 *
 * Configurable values for the lamp fuel mechanic.
 * Adjust these values to balance gameplay difficulty and player experience.
 */

// Lamp fuel states
export const LAMP_STATES = {
  FULL: 'FULL',           // 100-80% fuel - Perfect brightness
  STABLE: 'STABLE',       // 80-50% fuel - Slight dim
  LOW: 'LOW',             // 50-30% fuel - Noticeably dimmer
  FLICKERING: 'FLICKERING', // 30-10% fuel - Flickering on/off
  CRITICAL: 'CRITICAL',   // 10-0% fuel - Rapid flickering
  OFF: 'OFF',             // 0% fuel - Lamp is out
};

// Main configuration object
export const LAMP_FUEL_CONFIG = {
  // ============================================================================
  // Fuel Capacity
  // ============================================================================
  maxFuel: 100,           // Maximum fuel capacity
  startingFuel: 100,      // Fuel amount when game starts

  // ============================================================================
  // Depletion Rates (fuel units per second)
  // ============================================================================
  runningDepletionRate: 8,    // When sprinting (shift key)
  walkingDepletionRate: 2,    // When walking normally
  idleDepletionRate: 0.5,     // When standing still (creates constant pressure)

  // ============================================================================
  // State Thresholds (percentage of max fuel)
  // ============================================================================
  thresholds: {
    full: 80,        // Above 80% = FULL state
    stable: 50,      // 80-50% = STABLE state
    low: 30,         // 50-30% = LOW state
    flickering: 10,  // 30-10% = FLICKERING state
    critical: 0.1,   // 10-0% = CRITICAL state
    off: 0,          // 0% = OFF state
  },

  // ============================================================================
  // Flickering Behavior
  // ============================================================================
  flickering: {
    // FLICKERING state (30-10% fuel)
    normalInterval: 0.4,      // Seconds between flickers
    normalIntensityMin: 0.3,  // Minimum light intensity during flicker
    normalIntensityMax: 1.0,  // Maximum light intensity during flicker

    // CRITICAL state (10-0% fuel)
    criticalInterval: 0.15,   // Faster flickering
    criticalIntensityMin: 0,  // Can go completely dark
    criticalIntensityMax: 0.6, // Dimmer max brightness
  },

  // ============================================================================
  // Light Intensity by State
  // ============================================================================
  lightIntensity: {
    FULL: 6.5,       // Brightest
    STABLE: 1.2,     // Slightly dimmer
    LOW: 0.8,        // Noticeably dim
    FLICKERING: 0.6, // Average during flickers
    CRITICAL: 0.3,   // Very dim
    OFF: 0,          // No light
  },

  // ============================================================================
  // Light Color by State (hex colors)
  // ============================================================================
  lightColor: {
    FULL: '#ffaa44',      // Warm orange-yellow
    STABLE: '#ff9933',    // Orange
    LOW: '#ff8822',       // Darker orange
    FLICKERING: '#ff6611', // Red-orange
    CRITICAL: '#ff4400',  // Red
    OFF: '#000000',       // Black
  },

  // ============================================================================
  // Refueling
  // ============================================================================
  refuel: {
    amountPerCan: 50,      // How much fuel one oil can provides
    refuelTime: 2,         // Seconds to complete refuel (animation time)
    allowPartialRefuel: true, // Can refuel even if not at 0%
    canOverfill: false,    // Refueling stops at maxFuel
  },

  // ============================================================================
  // Audio Settings
  // ============================================================================
  audio: {
    enableFlickerSound: true,
    enableRefuelSound: true,
    enableWarningSound: true,
    warningThreshold: 20, // Play warning sound below this %
  },

  // ============================================================================
  // UI Settings
  // ============================================================================
  ui: {
    showFuelGauge: true,
    showWarningText: true,
    warningTextThreshold: 30, // Show "Low Fuel" below this %
    fuelGaugePosition: 'bottom-left', // or 'bottom-right', 'top-left', etc.
  },

  // ============================================================================
  // Gameplay Settings
  // ============================================================================
  gameplay: {
    enableFuelSystem: true,  // Master toggle (for testing/debugging)
    refuelRequiresOilCan: true, // Need oil can in inventory to refuel
    consumeOilCanOnUse: true, // Remove oil can from inventory after use
  },
};

/**
 * Get current lamp state based on fuel level
 * @param {number} fuelLevel - Current fuel (0-100)
 * @returns {string} Current LAMP_STATE
 */
export function getLampState(fuelLevel) {
  const fuelPercent = fuelLevel;
  const { thresholds } = LAMP_FUEL_CONFIG;

  if (fuelPercent <= thresholds.off) return LAMP_STATES.OFF;
  if (fuelPercent <= thresholds.critical) return LAMP_STATES.CRITICAL;
  if (fuelPercent <= thresholds.flickering) return LAMP_STATES.FLICKERING;
  if (fuelPercent <= thresholds.low) return LAMP_STATES.LOW;
  if (fuelPercent <= thresholds.stable) return LAMP_STATES.STABLE;
  return LAMP_STATES.FULL;
}

/**
 * Get depletion rate based on player movement state
 * @param {boolean} isRunning - Is player sprinting
 * @param {boolean} isWalking - Is player walking
 * @returns {number} Depletion rate per second
 */
export function getDepletionRate(isRunning, isWalking) {
  if (isRunning) return LAMP_FUEL_CONFIG.runningDepletionRate;
  if (isWalking) return LAMP_FUEL_CONFIG.walkingDepletionRate;
  return LAMP_FUEL_CONFIG.idleDepletionRate;
}
