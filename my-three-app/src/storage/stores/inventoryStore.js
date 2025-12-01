import { create } from 'zustand';

/**
 * Inventory Store
 * Tracks items collected by the player
 */
export const useInventoryStore = create((set, get) => ({
  // Array of collected items: [{ id, itemType, timestamp }, ...]
  items: [],

  // Maximum inventory capacity
  maxCapacity: 4,

  // Currently held/equipped item: { id, itemType, meshGroup } or null
  currentlyHeldItem: null,

  // Item ID requested to be equipped (set by RadialMenu, consumed by scene)
  requestedEquipItemId: null,

  // Add item to inventory (returns true if successful, false if full)
  addItem: (id, itemType) => {
    const state = get();
    if (state.items.length >= state.maxCapacity) {
      console.warn(`⚠️ Inventory full! Cannot add ${itemType}`);
      return false;
    }

    set({
      items: [...state.items, {
        id,
        itemType,
        timestamp: Date.now(),
      }]
    });
    return true;
  },

  // Remove item from inventory
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),

  // Clear all items
  clearInventory: () => set({ items: [], currentlyHeldItem: null }),

  // Set all items (used when loading saved game)
  setItems: (items) => set({ items: items || [] }),

  // Check if item exists
  hasItem: (id) => get().items.some(item => item.id === id),

  // Check if inventory is full
  isFull: () => get().items.length >= get().maxCapacity,

  // Get remaining capacity
  getRemainingCapacity: () => get().maxCapacity - get().items.length,

  // Set currently held item (when equipped to hand)
  setHeldItem: (id, itemType, meshGroup) => set({
    currentlyHeldItem: { id, itemType, meshGroup }
  }),

  // Clear currently held item (when dropped or unequipped)
  clearHeldItem: () => set({ currentlyHeldItem: null }),

  // Request to equip an item (called by RadialMenu)
  requestEquip: (itemId) => set({ requestedEquipItemId: itemId }),

  // Clear equip request (called after processing)
  clearEquipRequest: () => set({ requestedEquipItemId: null }),
}));
