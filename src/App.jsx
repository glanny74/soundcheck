import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Home from './components/Home'
import PlayerSetup from './components/PlayerSetup'
import ModeSelect from './components/ModeSelect'
import Game from './components/Game'
import Results from './components/Results'

/*
  Composant racine de l'application SoundCheck.

  Plutôt que d'utiliser React Router (overkill pour 5 écrans), on gère la
  navigation avec un simple state `currentScreen`. Chaque écran reçoit en
  props :
    - une fonction pour aller au suivant
    - les données partagées dont il a besoin (joueurs, mode, scores...)

  Pour la V2 design, on enveloppe le tout dans <AnimatePresence> de
  Framer Motion afin que les transitions entre écrans soient orchestrées
  (entrée du nouveau / sortie de l'ancien en cascade).
*/

// Les différentes "pages" de l'application
const SCREENS = {
  HOME: 'home',
  PLAYER_SETUP: 'player_setup',
  MODE_SELECT: 'mode_select',
  GAME: 'game',
  RESULTS: 'results',
}

export default function App() {
  // Écran actuellement affiché
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME)

  // Liste des joueurs avec leur score
  // Format : [{ id: 1, name: 'Alice', score: 0 }, ...]
  const [players, setPlayers] = useState([])

  // Configuration de la partie (choisie dans ModeSelect)
  // Format : { mode: 'artist'|'multi'|'genre'|'random', payload: ..., totalRounds: 10 }
  const [gameConfig, setGameConfig] = useState(null)

  // ---------- handlers de navigation ----------

  // Home -> PlayerSetup
  const goToPlayerSetup = () => setCurrentScreen(SCREENS.PLAYER_SETUP)

  // PlayerSetup -> ModeSelect (avec sauvegarde des joueurs)
  const handlePlayersReady = (newPlayers) => {
    // On initialise chaque joueur avec un score de 0
    setPlayers(newPlayers.map((p, i) => ({ id: i + 1, name: p, score: 0 })))
    setCurrentScreen(SCREENS.MODE_SELECT)
  }

  // ModeSelect -> Game
  const handleGameStart = (config) => {
    setGameConfig(config)
    setCurrentScreen(SCREENS.GAME)
  }

  // Game -> Results (avec scores finaux)
  const handleGameEnd = (finalPlayers) => {
    setPlayers(finalPlayers)
    setCurrentScreen(SCREENS.RESULTS)
  }

  // Results -> PlayerSetup (rejouer en gardant les joueurs)
  const handleReplay = () => {
    // On remet les scores à zéro mais on garde les noms
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })))
    setCurrentScreen(SCREENS.MODE_SELECT)
  }

  // Results -> Home (nouvelle partie complète)
  const handleNewGame = () => {
    setPlayers([])
    setGameConfig(null)
    setCurrentScreen(SCREENS.HOME)
  }

  // ---------- rendu de l'écran courant ----------
  // mode="wait" : on attend que l'écran sortant termine son exit avant
  // d'animer l'entrée du suivant. Donne un effet plus théâtral.
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Grain overlay global : donne le côté print/magazine sur tous les écrans */}
      <div className="grain-overlay" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {currentScreen === SCREENS.HOME && (
          <Home key="home" onStart={goToPlayerSetup} />
        )}

        {currentScreen === SCREENS.PLAYER_SETUP && (
          <PlayerSetup
            key="player_setup"
            onValidate={handlePlayersReady}
            onBack={() => setCurrentScreen(SCREENS.HOME)}
          />
        )}

        {currentScreen === SCREENS.MODE_SELECT && (
          <ModeSelect
            key="mode_select"
            players={players}
            onStart={handleGameStart}
            onBack={() => setCurrentScreen(SCREENS.PLAYER_SETUP)}
          />
        )}

        {currentScreen === SCREENS.GAME && (
          <Game
            key="game"
            players={players}
            config={gameConfig}
            onFinish={handleGameEnd}
          />
        )}

        {currentScreen === SCREENS.RESULTS && (
          <Results
            key="results"
            players={players}
            onReplay={handleReplay}
            onNewGame={handleNewGame}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
