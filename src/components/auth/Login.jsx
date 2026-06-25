import { useState } from 'react'
import { signInWithEmail, signInWithGoogle } from '../../supabase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran de connexion.
  ---------------------------------------------------------------------------
  Email/password OU Google. Après succès, le AuthContext détecte le user
  via onAuthStateChange et redirige automatiquement (logique dans App.jsx).
*/

export default function Login({ onSwitchToRegister, onForgotPassword, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Email et mot de passe sont requis.')
      return
    }
    setLoading(true)
    try {
      await signInWithEmail({ email: email.trim(), password })
      // pas besoin de naviguer manuellement : AuthContext mettra à jour user
    } catch (err) {
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      // Redirige vers Google — la page navigue, pas de retour ici en cas de succès
      await signInWithGoogle()
    } catch (err) {
      setError(traduireErreur(err))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      step="connexion"
      title="Se"
      italicWord="connecter."
      accent="green"
      description="Connecte-toi pour sauvegarder ton historique et grimper dans le classement."
      footer={
        <>
          Pas encore de compte ?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-accent-green hover:underline cursor-pointer font-medium"
          >
            Créer un compte
          </button>
        </>
      }
    >
      <button onClick={onBack} className="btn-back mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Retour
      </button>

      <form onSubmit={handleEmailSubmit} className="space-y-6">
        <FieldLine label="Email" name="email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            autoComplete="email"
            className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                       text-lg py-2 focus:outline-none font-medium"
          />
        </FieldLine>

        <FieldLine label="Mot de passe" name="password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                       text-lg py-2 focus:outline-none font-medium"
          />
        </FieldLine>

        {error && (
          <p className="text-danger text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-text-tertiary hover:text-text-secondary text-sm transition-colors cursor-pointer"
          >
            Mot de passe oublié ?
          </button>

          <button type="submit" disabled={loading} className="btn-primary bg-accent-green text-bg-primary">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </div>
      </form>

      {/* Séparateur OR */}
      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
          ou
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full px-5 py-3 rounded-lg
                   bg-bg-elevated hover:bg-[#2e2e2e] border border-white/10
                   text-text-primary font-medium transition-all duration-200
                   cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-3"
      >
        <GoogleIcon />
        <span>Continuer avec Google</span>
      </button>
    </AuthLayout>
  )
}

/* ----- Champ "ligne tracée" éditorial ----- */
function FieldLine({ label, name, children }) {
  return (
    <div className="border-b border-white/10 pb-2 focus-within:border-accent-green transition-colors">
      <label
        htmlFor={name}
        className="block text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

/* ----- Logo Google SVG inline (pas de dépendance image) ----- */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

/* ----- Traduction des messages d'erreur Supabase en français ----- */
function traduireErreur(err) {
  const msg = err?.message || 'Une erreur est survenue.'
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Ton adresse n\'est pas encore confirmée. Vérifie ta boîte mail (et les spams).'
  }
  if (lower.includes('too many requests') || err?.status === 429) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Problème de connexion réseau.'
  }
  return msg
}
