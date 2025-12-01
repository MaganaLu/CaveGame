import { useEffect } from 'react';

/**
 * Custom hook for periodic auto-saving
 *
 * @param {Function} getSaveData - Function that returns the current game state to save
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Save interval in milliseconds (default: 30000 = 30s)
 * @param {Function} options.onSave - Callback function to perform the save
 * @param {boolean} options.enabled - Whether periodic saves are enabled (default: true)
 * @param {boolean} options.logSaves - Whether to log saves to console (default: true)
 *
 * @example
 * usePeriodicSave(getCurrentGameState, {
 *   interval: 30000,
 *   onSave: saveNow,
 *   logSaves: true
 * });
 */
export function usePeriodicSave(getSaveData, options = {}) {
  const {
    interval = 30000, // 30 seconds default
    onSave,
    enabled = true,
    logSaves = true,
  } = options;

  useEffect(() => {
    // Skip if disabled or missing required functions
    if (!enabled || !getSaveData || !onSave) {
      return;
    }

    // Setup interval timer
    const intervalId = setInterval(() => {
      const saveData = getSaveData();
      onSave(saveData);

      if (logSaves) {
        console.log(`⏱️ Auto-save (${interval / 1000}s interval)`);
      }
    }, interval);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [getSaveData, onSave, interval, enabled, logSaves]);
}
