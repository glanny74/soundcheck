import { useState } from 'react'
import { signInWithEmail, signInWithGoogle } from '../../firebase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran de connexion.
  ---------------------------------------------------------------------------
  Email/password OU Google. Après succès, le AuthContext détecte le user
  via onAuthStateChanged et redirige automatiquement (logique dans App.jsx).
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
      setError(traduireErreurFirebase(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(traduireErreurFirebase(err))
    } finally {
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
      <button
        onClick={onBack}
        className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm mb-6"
      >
        <span className="arrow text-accent-green text-xl leading-none rotate-180 inline-block">
          →
        </span>
        <span>Retour</span>
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
          <p className="text-accent-pink text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-text-tertiary hover:text-text-secondary text-sm transition-colors cursor-pointer"
          >
            Mot de passe oublié ?
          </button>

          <button
            type="submit"
            disabled={loading}
            className="editorial-link group cursor-pointer font-display font-medium text-xl text-text-primary disabled:opacity-40"
          >
            <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
            <span className="arrow text-accent-green text-2xl leading-none">→</span>
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

/* ----- Traduction des codes d'erreur Firebase en français ----- */
function traduireErreurFirebase(err) {
  const code = err?.code || ''
  const msg = err?.message || 'Une erreur est survenue.'
  if (code.includes('user-not-found') || code.includes('invalid-credential')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (code.includes('wrong-password')) return 'Mot de passe incorrect.'
  if (code.includes('invalid-email')) return 'Email invalide.'
  if (code.includes('too-many-requests')) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.'
  }
  if (code.includes('popup-closed-by-user')) {
    return 'Connexion Google annulée.'
  }
  if (code.includes('network-request-failed')) {
    return 'Problème de connexion réseau.'
  }
  return msg
}
