import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { signOutUser } from './supabase/auth'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Welcome from './components/auth/Welcome'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import Home from './components/Home'
import PlayerSetup from './components/PlayerSetup'
import ModeSelect from './components/ModeSelect'
import Game from './components/Game'
import Results from './components/Results'
import Profile from './components/profile/Profile'
import History from './components/profile/History'

/*
  Composant racine — orchestre toute l'application.
  ===========================================================================
  Architecture :
   - <AuthProvider> wrappe l'app pour exposer l'état d'authentification
   - <AppContent> est le routeur interne qui choisit l'écran à afficher

  Deux « zones » d'écrans :
   - Zone AUTH (welcome, login, register, forgot) → si user non connecté ET pas invité
   - Zone JEU/PROFIL (home, game, profile...) → connecté OU invité

  Note migration Supabase : la confirmation d'email est native. Cliquer le lien
  du mail ramène sur l'app et le client supabase-js ouvre la session tout seul.
  Plus besoin d'écran /verify ni de bannière « vérifie ton email » (un compte
  connecté est forcément confirmé).
*/

const SCREENS = {
  WELCOME: 'welcome',
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  HOME: 'home',
  PLAYER_SETUP: 'player_setup',
  MODE_SELECT: 'mode_select',
  GAME: 'game',
  RESULTS: 'results',
  PROFILE: 'profile',
  HISTORY: 'history',
}

const AUTH_SCREENS = [SCREENS.WELCOME, SCREENS.LOGIN, SCREENS.REGISTER, SCREENS.FORGOT]

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth()

  // Mode invité : true = l'utilisateur a explicitement choisi de jouer sans compte
  const [isGuest, setIsGuest] = useState(false)

  // Écran actuellement affiché
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME)

  const [players, setPlayers] = useState([])
  const [gameConfig, setGameConfig] = useState(null)

  // Quand l'utilisateur vient de se connecter (Login/Register/Google, ou
  // retour d'un lien de confirmation email), on le pousse sur Home.
  useEffect(() => {
    if (user && AUTH_SCREENS.includes(currentScreen)) {
      setCurrentScreen(SCREENS.HOME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Quand l'utilisateur se déconnecte (et n'est pas invité), retour à Welcome.
  useEffect(() => {
    if (!user && !isGuest && !AUTH_SCREENS.includes(currentScreen)) {
      setCurrentScreen(SCREENS.WELCOME)
      setPlayers([])
      setGameConfig(null)
    }
  }, [user, isGuest, currentScreen])

  // ---------- handlers de navigation ----------

  // Welcome → Login / Register / Forgot / Guest
  const goToLogin = () => setCurrentScreen(SCREENS.LOGIN)
  const goToRegister = () => setCurrentScreen(SCREENS.REGISTER)
  const goToForgot = () => setCurrentScreen(SCREENS.FORGOT)
  const goToWelcome = () => setCurrentScreen(SCREENS.WELCOME)

  const handleGuestMode = () => {
    setIsGuest(true)
    setCurrentScreen(SCREENS.HOME)
  }

  // Déconnexion : signOut Supabase OU sortie du mode invité
  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false)
      setPlayers([])
      setGameConfig(null)
      setCurrentScreen(SCREENS.WELCOME)
    } else {
      await signOutUser()
      // Le useEffect ci-dessus bascule sur Welcome quand user passe à null
    }
  }

  // Flux jeu (inchangé)
  const goToPlayerSetup = () => setCurrentScreen(SCREENS.PLAYER_SETUP)

  const handlePlayersReady = (newPlayers) => {
    setPlayers(newPlayers.map((p, i) => ({ id: i + 1, name: p, score: 0 })))
    setCurrentScreen(SCREENS.MODE_SELECT)
  }

  const handleGameStart = (config) => {
    setGameConfig(config)
    setCurrentScreen(SCREENS.GAME)
  }

  const handleGameEnd = (finalPlayers) => {
    setPlayers(finalPlayers)
    setCurrentScreen(SCREENS.RESULTS)
  }

  const handleReplay = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })))
    setCurrentScreen(SCREENS.MODE_SELECT)
  }

  const handleNewGame = () => {
    setPlayers([])
    setGameConfig(null)
    setCurrentScreen(SCREENS.HOME)
  }

  // Navigation vers les écrans utilisateur (depuis Home → UserMenu)
  const goToProfile = () => setCurrentScreen(SCREENS.PROFILE)
  const goToHistory = () => setCurrentScreen(SCREENS.HISTORY)
  const backToHome = () => setCurrentScreen(SCREENS.HOME)

  // ---------- rendu ----------

  // Pendant la vérification initiale de la session
  if (loading) return <LoadingScreen />

  // Mode « réinitialisation du mot de passe » : l'utilisateur vient de cliquer
  // le lien du mail. Cet écran prend la priorité sur toute autre navigation.
  // Une fois terminé, on referme le mode récupération et on file sur Home
  // (l'utilisateur est déjà connecté grâce à la session de récupération).
  if (passwordRecovery) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <div className="grain-overlay" aria-hidden="true" />
        <ResetPassword
          onDone={() => {
            clearPasswordRecovery()
            setCurrentScreen(SCREENS.HOME)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="grain-overlay" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {/* === Zone AUTH === */}
        {currentScreen === SCREENS.WELCOME && !user && !isGuest && (
          <Welcome
            key="welcome"
            onLogin={goToLogin}
            onRegister={goToRegister}
            onGuest={handleGuestMode}
          />
        )}

        {currentScreen === SCREENS.LOGIN && (
          <Login
            key="login"
            onSwitchToRegister={goToRegister}
            onForgotPassword={goToForgot}
            onBack={goToWelcome}
          />
        )}

        {currentScreen === SCREENS.REGISTER && (
          <Register
            key="register"
            onSwitchToLogin={goToLogin}
            onBack={goToWelcome}
          />
        )}

        {currentScreen === SCREENS.FORGOT && (
          <ForgotPassword key="forgot" onBack={goToLogin} />
        )}

        {/* === Zone JEU === */}
        {currentScreen === SCREENS.HOME && (user || isGuest) && (
          <Home
            key="home"
            onStart={goToPlayerSetup}
            onLogout={handleLogout}
            onProfile={goToProfile}
            onHistory={goToHistory}
            isGuest={isGuest}
          />
        )}

        {/* Écrans utilisateur — réservés aux utilisateurs connectés */}
        {currentScreen === SCREENS.PROFILE && user && (
          <Profile
            key="profile"
            onBack={backToHome}
            onStart={goToPlayerSetup}
          />
        )}

        {currentScreen === SCREENS.HISTORY && user && (
          <History key="history" onBack={backToHome} />
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

/* ----- Écran de chargement pendant le check d'auth initial ----- */
function LoadingScreen() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-center px-6"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
        SoundCheck
      </p>
      <h2 className="font-display font-bold text-4xl tracking-tight">
        Initialisation
        <span className="serif-italic text-accent-green">.</span>
      </h2>
    </motion.main>
  )
}
