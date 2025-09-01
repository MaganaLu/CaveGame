import React from 'react'

export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      <h1>Welcome the Lamp Game</h1>
      <button onClick={onStart}>Start Game</button>
    </div>
  )
}
