import { useState } from 'react'
import { signInWithGoogle, signUpWithEmail } from '../../supabase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran d'inscription.
  ---------------------------------------------------------------------------
  Trois champs : username (unique), email, password. Validation côté client
  basique avant d'envoyer à Supabase.

  Particularité Supabase : la confirmation d'email est requise. signUp ne
  connecte donc PAS l'utilisateur — il reçoit un mail et doit cliquer le lien
  avant de pouvoir se connecter. On affiche pour ça un écran « vérifie ta
  boîte mail » (état `sent`) au lieu de rediriger vers Home.
*/

export default function Register({ onSwitchToLogin, onBack }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validation client minimale (Supabase fera le reste)
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    if (!trimmedFirstName || !trimmedLastName) {
      setError('Renseigne ton prénom et ton nom.')
      return
    }
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
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      })
      // Compte créé : un mail de confirmation est parti. On affiche l'écran
      // d'attente. (Si la confirmation était désactivée, AuthContext aurait
      // déjà redirigé via le changement de session.)
      setSent(true)
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
      <button onClick={sent ? onSwitchToLogin : onBack} className="btn-back mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        {sent ? 'Aller à la connexion' : 'Retour'}
      </button>

      {sent ? (
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-purple">
            Inscription —{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              presque fini
            </span>
          </p>
          <p className="font-display font-bold text-2xl text-text-primary">
            Vérifie ta boîte mail.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            On a envoyé un lien de confirmation à <strong>{email}</strong>.
            Clique dessus pour activer ton compte, puis reviens te connecter.
            Pense à vérifier ton dossier spam.
          </p>
        </div>
      ) : (
      <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FieldLine label="Prénom" accent="purple">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              maxLength={40}
              autoComplete="given-name"
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                         text-lg py-2 focus:outline-none font-medium"
            />
          </FieldLine>

          <FieldLine label="Nom" accent="purple">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              maxLength={40}
              autoComplete="family-name"
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                         text-lg py-2 focus:outline-none font-medium"
            />
          </FieldLine>
        </div>

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
          <p className="text-danger text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={loading} className="btn-primary bg-accent-purple text-text-primary">
            {loading ? 'Création…' : 'Créer mon compte'}
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
      </>
      )}
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
  const msg = err?.message || 'Une erreur est survenue.'
  const lower = msg.toLowerCase()
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Cet email est déjà associé à un compte.'
  }
  if (lower.includes('password should be at least')) {
    return 'Mot de passe trop faible (min 6 caractères).'
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Email invalide.'
  }
  if (lower.includes('too many requests') || err?.status === 429) {
    return 'Trop de demandes. Réessaie dans quelques minutes.'
  }
  // Erreur métier qu'on lève nous-mêmes (pseudo déjà pris)
  if (msg.includes('déjà pris')) return msg
  return msg
}
