import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Point d'entrée : on monte l'App dans le <div id="root"> de index.html.
// StrictMode déclenche certaines vérifications React en développement
// (double-rendu des composants, détection d'effets de bord, etc.).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
