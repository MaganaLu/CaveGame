import React from 'react';
import { useGameStateStore } from '../../storage/gameStateStore';
import './LoadingScreen.css';

/**
 * Loading Screen Component
 *
 * Displays while the game loads saved data and initializes.
 * Shows loading messages and progress bar.
 *
 * Only shown during INITIAL load, not during auto-saves.
 * Automatically shown/hidden based on isInitialLoading state in gameStateStore.
 */
export default function LoadingScreen() {
  const isInitialLoading = useGameStateStore((state) => state.isInitialLoading);
  const loadingMessage = useGameStateStore((state) => state.loadingMessage);
  const loadingProgress = useGameStateStore((state) => state.loadingProgress);

  if (!isInitialLoading) {
    return null; // Don't render when not doing initial load
  }

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Game Title */}
        <h1 className="loading-title">CAVE GAME</h1>

        {/* Loading Spinner */}
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>

        {/* Loading Message */}
        <p className="loading-message">{loadingMessage}</p>

        {/* Progress Bar */}
        {loadingProgress > 0 && (
          <div className="loading-progress-container">
            <div
              className="loading-progress-bar"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}

        {/* Atmospheric Tip */}
        <p className="loading-tip">
          {getRandomTip()}
        </p>
      </div>
    </div>
  );
}

/**
 * Random loading tips for atmosphere
 */
function getRandomTip() {
  const tips = [
    'Stay in the light...',
    'Listen for footsteps...',
    'The darkness is watching...',
    'Collect items to survive...',
    'Press E to pick up items...',
    'Press X to drop items...',
    'Press I to open inventory...',
    'Some caves are best left unexplored...',
  ];

  return tips[Math.floor(Math.random() * tips.length)];
}
