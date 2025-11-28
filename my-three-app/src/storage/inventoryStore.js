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
  clearInventory: () => set({ items: [] }),

  // Check if item exists
  hasItem: (id) => get().items.some(item => item.id === id),

  // Check if inventory is full
  isFull: () => get().items.length >= get().maxCapacity,

  // Get remaining capacity
  getRemainingCapacity: () => get().maxCapacity - get().items.length,
}));
