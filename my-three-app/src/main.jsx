import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './psx/fonts'
import './psx/psx-ui.css'
import App from './App.jsx'
import { text, LANG } from './content'

// The page in the player's language (see content/index.js)
document.documentElement.lang = LANG
document.title = text('ui').app.title

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
