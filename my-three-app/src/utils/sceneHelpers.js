/**
 * Scene Helper Utilities
 *
 * Helper functions for managing scene items in a data-driven way.
 * These utilities handle automatic ID generation and data transformation
 * for scene items that need to be saved/loaded.
 */

/**
 * Creates scene items with auto-generated IDs
 *
 * Generates unique, stable IDs based on item type and position.
 * IDs are deterministic - same type + position = same ID every time.
 * This ensures save/load systems work correctly.
 *
 * @param {Array} items - Array of item objects with { type, position }
 * @returns {Array} Items with auto-generated IDs
 *
 * @example
 * const SCENE_ITEMS = createSceneItems([
 *   { type: 'alienBlade', position: [2, 0, 6] },
 *   { type: 'oilLampCan', position: [8, 0, 3] },
 * ]);
 * // Result:
 * // [
 * //   { id: 'alienBlade_2_0_6', type: 'alienBlade', position: [2, 0, 6] },
 * //   { id: 'oilLampCan_8_0_3', type: 'oilLampCan', position: [8, 0, 3] },
 * // ]
 */
export function createSceneItems(items) {
  return items.map(item => ({
    ...item,
    id: `${item.type}_${item.position.join('_')}`
  }));
}

/**
 * Alternative: Create scene items with custom name prefix
 * Use this if you want more control over ID naming
 *
 * @param {string} scenePrefix - Prefix for all IDs (e.g., 'cave_part2')
 * @param {Array} items - Array of item objects
 * @returns {Array} Items with prefixed IDs
 *
 * @example
 * const SCENE_ITEMS = createSceneItemsWithPrefix('dungeon', [
 *   { type: 'alienBlade', position: [2, 0, 6] },
 * ]);
 * // Result: { id: 'dungeon_alienBlade_2_0_6', ... }
 */
export function createSceneItemsWithPrefix(scenePrefix, items) {
  return items.map(item => ({
    ...item,
    id: `${scenePrefix}_${item.type}_${item.position.join('_')}`
  }));
}
