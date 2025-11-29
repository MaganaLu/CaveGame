import React from 'react'

/**
 * Start Screen / Main Menu
 * Shows Continue button if save data exists, otherwise just New Game
 */
export default function StartScreen({ hasSaveData, onContinue, onNewGame }) {
  return (
    <div className="start-screen">
      <h1>Welcome to the Lamp Game</h1>

      <div className="menu-buttons">
        {hasSaveData && (
          <button onClick={onContinue} className="continue-button">
            Continue Game
          </button>
        )}

        <button onClick={onNewGame} className="new-game-button">
          New Game
        </button>
      </div>

      {hasSaveData && (
        <p className="save-info">Continue from your last save</p>
      )}
    </div>
  )
}
