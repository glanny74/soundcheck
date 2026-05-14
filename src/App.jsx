import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { signOutUser } from './firebase/auth'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Welcome from './components/auth/Welcome'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import EmailVerificationBanner from './components/auth/EmailVerificationBanner'
import VerifyEmail from './components/auth/VerifyEmail'
import Home from './components/Home'
import PlayerSetup from './components/PlayerSetup'
import ModeSelect from './components/ModeSelect'
import Game from './components/Game'
import Results from './components/Results'
import Profile from './components/profile/Profile'
import History from './components/profile/History'
import Leaderboard from './components/leaderboard/Leaderboard'

/*
  Composant racine — orchestre toute l'application.
  ===========================================================================
  Architecture :
   - <AuthProvider> wrappe l'app pour exposer l'état d'authentification
   - <AppContent> est le routeur interne qui choisit l'écran à afficher
     selon l'état d'auth et la navigation

  Trois "zones" d'écrans :
   - Zone AUTH (welcome, login, register, forgot) → si user non connecté ET pas invité
   - Zone JEU  (home, player_setup, mode_select, game, results) → connecté OU invité
   - Plus tard : zone PROFIL (profile, history, leaderboard) — étape 3+
*/

const SCREENS = {
  WELCOME: 'welcome',
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  VERIFY: 'verify',
  HOME: 'home',
  PLAYER_SETUP: 'player_setup',
  MODE_SELECT: 'mode_select',
  GAME: 'game',
  RESULTS: 'results',
  PROFILE: 'profile',
  HISTORY: 'history',
  LEADERBOARD: 'leaderboard',
}

const AUTH_SCREENS = [SCREENS.WELCOME, SCREENS.LOGIN, SCREENS.REGISTER, SCREENS.FORGOT]

/*
  Lit l'URL au démarrage de l'app pour détecter un atterrissage depuis un lien
  Firebase (verifyEmail, resetPassword, etc.). Si le mode est `verifyEmail`,
  on extrait le oobCode pour le passer à l'écran VerifyEmail.

  On nettoie ensuite l'URL via history.replaceState pour éviter que rafraîchir
  la page relance la vérification (qui échouerait car le code est usage-unique).
*/
function detectFirebaseAction() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  const oobCode = params.get('oobCode')
  if (mode === 'verifyEmail' && oobCode) {
    return { type: 'verifyEmail', oobCode }
  }
  return null
}

function clearActionParamsFromUrl() {
  if (typeof window === 'undefined') return
  window.history.replaceState({}, '', window.location.pathname)
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  // Détection synchrone de l'URL au tout premier render — comme ça si on
  // arrive depuis le lien du mail, on commence direct sur l'écran VERIFY au
  // lieu de flasher WELCOME une fraction de seconde.
  const initialAction = detectFirebaseAction()

  // Mode invité : true = l'utilisateur a explicitement choisi de jouer sans compte
  const [isGuest, setIsGuest] = useState(false)

  // Écran actuellement affiché
  const [currentScreen, setCurrentScreen] = useState(
    initialAction?.type === 'verifyEmail' ? SCREENS.VERIFY : SCREENS.WELCOME
  )

  // Code de vérification stocké au premier render, puis nettoyé de l'URL.
  // Si on rafraîchit la page, on n'aura plus le code (cleanup volontaire).
  const [verifyOobCode, setVerifyOobCode] = useState(
    initialAction?.type === 'verifyEmail' ? initialAction.oobCode : null
  )

  // Nettoyage de l'URL au montage si on a détecté une action Firebase
  useEffect(() => {
    if (initialAction) {
      clearActionParamsFromUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [players, setPlayers] = useState([])
  const [gameConfig, setGameConfig] = useState(null)

  // Quand l'utilisateur vient de se connecter (depuis Login ou Register),
  // on le pousse automatiquement sur Home. On NE pousse PAS s'il est sur
  // l'écran VERIFY (la redirection est gérée par VerifyEmail lui-même).
  useEffect(() => {
    if (
      user &&
      AUTH_SCREENS.includes(currentScreen) &&
      currentScreen !== SCREENS.VERIFY
    ) {
      setCurrentScreen(SCREENS.HOME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Quand l'utilisateur se déconnecte (et n'est pas invité), retour à Welcome.
  // Sauf sur l'écran VERIFY où on laisse l'utilisateur finir sa vérif.
  useEffect(() => {
    if (
      !user &&
      !isGuest &&
      !AUTH_SCREENS.includes(currentScreen) &&
      currentScreen !== SCREENS.VERIFY
    ) {
      setCurrentScreen(SCREENS.WELCOME)
      setPlayers([])
      setGameConfig(null)
    }
  }, [user, isGuest, currentScreen])

  // ---------- handlers de l'écran VERIFY ----------

  // Vérification réussie : on redirige vers Home si l'utilisateur est connecté
  // dans ce navigateur, sinon vers Login (il faudra qu'il se reconnecte).
  function handleVerifySuccess() {
    setVerifyOobCode(null)
    setCurrentScreen(user ? SCREENS.HOME : SCREENS.LOGIN)
  }

  // Erreur de vérification : on l'envoie à un endroit sensé selon l'état d'auth.
  function handleVerifyError() {
    setVerifyOobCode(null)
    setCurrentScreen(user ? SCREENS.HOME : SCREENS.WELCOME)
  }

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

  // Déconnexion : signOut Firebase OU sortie du mode invité
  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false)
      setPlayers([])
      setGameConfig(null)
      setCurrentScreen(SCREENS.WELCOME)
    } else {
      await signOutUser()
      // Le useEffect ci-dessus se chargera de bascule sur Welcome
    }
  }

  // Flux jeu (inchangé V2)
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
  const goToLeaderboard = () => setCurrentScreen(SCREENS.LEADERBOARD)
  const backToHome = () => setCurrentScreen(SCREENS.HOME)

  // ---------- rendu ----------

  // Pendant la vérification initiale de la session
  if (loading) return <LoadingScreen />

  // Bannière de vérification d'email : visible si l'utilisateur est inscrit
  // par email/password (pas Google) ET que son adresse n'est pas encore
  // confirmée. On la cache sur les écrans d'auth et sur l'écran VERIFY pour
  // éviter l'overlap visuel.
  const isPasswordProvider =
    user?.providerData?.[0]?.providerId === 'password'
  const showVerificationBanner =
    user && !user.emailVerified && isPasswordProvider &&
    !AUTH_SCREENS.includes(currentScreen) &&
    currentScreen !== SCREENS.VERIFY

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="grain-overlay" aria-hidden="true" />

      {showVerificationBanner && <EmailVerificationBanner />}

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

        {/* === Zone VERIFY === */}
        {currentScreen === SCREENS.VERIFY && (
          <VerifyEmail
            key="verify"
            oobCode={verifyOobCode}
            onSuccess={handleVerifySuccess}
            onError={handleVerifyError}
          />
        )}

        {/* === Zone JEU === */}
        {currentScreen === SCREENS.HOME && (user || isGuest) && (
          <Home
            key="home"
            onStart={goToPlayerSetup}
            onLogout={handleLogout}
            onProfile={goToProfile}
            onHistory={goToHistory}
            onLeaderboard={goToLeaderboard}
            isGuest={isGuest}
          />
        )}

        {/* Écrans utilisateur — réservés aux utilisateurs connectés */}
        {currentScreen === SCREENS.PROFILE && user && (
          <Profile key="profile" onBack={backToHome} />
        )}

        {currentScreen === SCREENS.HISTORY && user && (
          <History key="history" onBack={backToHome} />
        )}

        {currentScreen === SCREENS.LEADERBOARD && user && (
          <Leaderboard key="leaderboard" onBack={backToHome} />
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
