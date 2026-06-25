import { useState } from 'react'
import { resetPassword } from '../../supabase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran "mot de passe oublié" — envoi d'un email de réinitialisation.
  ---------------------------------------------------------------------------
  Flow simple : l'utilisateur entre son email, Supabase lui envoie un lien.
  Pour éviter de divulguer si un email existe ou non en BDD, on affiche
  toujours un message générique de succès après l'envoi.

  Suite du parcours : le lien reçu ouvre une session de récupération ; au
  retour sur l'app, AuthContext capte l'événement PASSWORD_RECOVERY et affiche
  l'écran ResetPassword (saisie du nouveau mot de passe via updateUser).
*/

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Email invalide.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      // Note : on affiche quand même un succès générique pour éviter
      // de révéler si un email existe ou non
      if ((err?.message || '').toLowerCase().includes('invalid email')) {
        setError('Email invalide.')
      } else {
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      step="récupération"
      title="Mot de passe"
      italicWord="oublié ?"
      accent="pink"
      description="Renseigne ton email et nous t'enverrons un lien pour le réinitialiser."
    >
      <button onClick={onBack} className="btn-back mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Retour
      </button>

      {sent ? (
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-pink">
            Email envoyé{' '}
            <span className="serif-italic normal-case tracking-normal">
              c'est parti.
            </span>
          </p>
          <p className="font-display font-bold text-2xl text-text-primary">
            Vérifie ta boîte mail.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Si un compte existe pour <strong>{email}</strong>, tu vas recevoir
            un email avec un lien pour réinitialiser ton mot de passe.
            Pense à vérifier ton dossier spam.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-white/10 pb-2 focus-within:border-accent-pink transition-colors">
            <label className="block text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
              autoComplete="email"
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary
                         text-lg py-2 focus:outline-none font-medium"
            />
          </div>

          {error && (
            <p className="text-danger text-sm">
              <span className="serif-italic">erreur —</span> {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="btn-primary bg-accent-pink text-text-primary">
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
