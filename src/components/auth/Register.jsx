import { useState } from 'react'
import { signInWithGoogle, signUpWithEmail } from '../../firebase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran d'inscription.
  ---------------------------------------------------------------------------
  Trois champs : username (unique), email, password. Validation côté client
  basique avant d'envoyer à Firebase. Les vraies vérifications (unicité du
  username, force du password ≥ 6 caractères) sont déléguées à
  signUpWithEmail() qui throw en cas de problème.
*/

export default function Register({ onSwitchToLogin, onBack }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validation client minimale (Firebase fera le reste)
    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 3) {
      setError('Le pseudo doit faire au moins 3 caractères.')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('Pseudo : lettres, chiffres, tirets et underscores uniquement.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Email invalide.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail({
        email: email.trim(),
        password,
        username: trimmedUsername,
      })
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
      await signInWithGoogle()
    } catch (err) {
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      step="inscription"
      title="Créer un"
      italicWord="compte."
      accent="purple"
      description="Quelques secondes pour rejoindre la communauté SoundCheck."
      footer={
        <>
          Déjà inscrit ?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-accent-purple hover:underline cursor-pointer font-medium"
          >
            Se connecter
          </button>
        </>
      }
    >
      <button
        onClick={onBack}
        className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm mb-6"
      >
        <span className="arrow text-accent-purple text-xl leading-none rotate-180 inline-block">
          →
        </span>
        <span>Retour</span>
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FieldLine label="Pseudo" accent="purple">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ton_pseudo"
            maxLength={20}
            autoComplete="username"
            className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                       text-lg py-2 focus:outline-none font-medium"
          />
        </FieldLine>

        <FieldLine label="Email" accent="purple">
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

        <FieldLine label="Mot de passe (min 6)" accent="purple">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                       text-lg py-2 focus:outline-none font-medium"
          />
        </FieldLine>

        {error && (
          <p className="text-accent-pink text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="editorial-link group cursor-pointer font-display font-medium text-xl text-text-primary disabled:opacity-40"
          >
            <span>{loading ? 'Création…' : 'Créer mon compte'}</span>
            <span className="arrow text-accent-purple text-2xl leading-none">→</span>
          </button>
        </div>
      </form>

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
        <span>S'inscrire avec Google</span>
      </button>
    </AuthLayout>
  )
}

function FieldLine({ label, accent = 'purple', children }) {
  const focusBorder =
    accent === 'green'
      ? 'focus-within:border-accent-green'
      : 'focus-within:border-accent-purple'
  return (
    <div className={`border-b border-white/10 pb-2 ${focusBorder} transition-colors`}>
      <label className="block text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function traduireErreur(err) {
  const code = err?.code || ''
  const msg = err?.message || 'Une erreur est survenue.'
  if (code.includes('email-already-in-use')) return 'Cet email est déjà associé à un compte.'
  if (code.includes('invalid-email')) return 'Email invalide.'
  if (code.includes('weak-password')) return 'Mot de passe trop faible (min 6 caractères).'
  if (code.includes('popup-closed-by-user')) return 'Connexion Google annulée.'
  if (msg.includes('déjà pris')) return msg
  return msg
}
