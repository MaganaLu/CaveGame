import { create } from 'zustand';

/**
 * Inventory Store
 * Tracks items collected by the player
 */
export const useInventoryStore = create((set) => ({
  // Array of collected items: [{ id, itemType, timestamp }, ...]
  items: [],

  // Add item to inventory
  addItem: (id, itemType) => set((state) => ({
    items: [...state.items, {
      id,
      itemType,
      timestamp: Date.now(),
    }]
  })),

  // Remove item from inventory
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),

  // Clear all items
  clearInventory: () => set({ items: [] }),

  // Check if item exists
  hasItem: (id) => (state) => state.items.some(item => item.id === id),
}));
