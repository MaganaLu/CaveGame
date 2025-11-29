/**
 * Configuration for pickup items
 * Each item defines how it should be positioned/scaled when held in the player's hand
 */

export const PICKUP_ITEM_CONFIGS = {
  alienBlade: {
    modelPath: 'assets/models/weapons/AlienBlade.glb',
    scale: 0.3,
    position: [0.1, 0.1, 0.1],
    rotation: [0, Math.PI / 2, 0], // [x, y, z] in radians
  },

  healthPotion: {
    modelPath: 'assets/models/items/HealthPotion.glb',
    scale: 0.15,
    position: [0.05, 0.15, 0.05],
    rotation: [0, 0, 0],
  },

  torch: {
    modelPath: 'assets/models/items/Torch.glb',
    scale: 0.25,
    position: [0.08, 0.2, 0.1],
    rotation: [Math.PI / 4, 0, 0],
  },

  oilLampCan: {
    modelPath: 'assets/models/lamps/vintage_oil_can.glb',
    scale: 0.15,
    position: [0.1, 0.1, 0.1],
    rotation: [0, 0, 0],
  },

  // Add more items here as needed
};

/**
 * Default configuration for items not in the config
 */
export const DEFAULT_ITEM_CONFIG = {
  modelPath: 'assets/models/items/default.glb',
  scale: 0.2,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
};

/**
 * Get configuration for a specific item
 * @param {string} itemId - The ID of the item
 * @returns {Object} The item configuration
 */
export function getItemConfig(itemId) {
  return PICKUP_ITEM_CONFIGS[itemId] || DEFAULT_ITEM_CONFIG;
}
