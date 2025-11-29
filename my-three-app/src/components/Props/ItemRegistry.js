/**
 * Item Component Registry
 * Maps item type strings to their corresponding React components
 *
 * This provides a single source of truth for all pickup items in the game.
 * Each item type has its own component with unique visuals, animations, and effects.
 *
 * To add a new item type:
 * 1. Create the component file (e.g., components/Props/Items/NewItem.jsx)
 * 2. Import it here
 * 3. Add to ITEM_COMPONENTS object
 * 4. Use in scenes by adding to SCENE_ITEMS array with the type name
 */

import AlienBlade from './Weapons/AlienBlade';
import OilLampCan from './Items/OilLampCan';
// Import more item components as you create them
// import Torch from './Items/Torch';
// import HealthPotion from './Items/HealthPotion';
// import Key from './Items/Key';

/**
 * Registry of all item components
 * Key: itemType string (must match itemType prop in component files - use camelCase)
 * Value: React component
 */
export const ITEM_COMPONENTS = {
  alienBlade: AlienBlade,
  oilLampCan: OilLampCan,
  // Add more items here as you create them (use camelCase keys)
  // torch: Torch,
  // healthPotion: HealthPotion,
  // key: Key,
};

/**
 * Helper function to get component for an item type
 * @param {string} itemType - The type of item (e.g., 'alienBlade', 'oilLampCan')
 * @returns {React.Component|null} The component or null if not found
 */
export function getItemComponent(itemType) {
  const component = ITEM_COMPONENTS[itemType];
  if (!component) {
    console.warn(`⚠️ No component registered for item type: ${itemType}`);
  }
  return component || null;
}
