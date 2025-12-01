import { create } from 'zustand'

export const usePlayerStore = create((set) => ({
  position: [0, 0, 0],
  setPosition: (pos) => set({ position: pos }),
}))
