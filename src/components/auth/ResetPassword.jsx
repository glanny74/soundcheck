import { useState } from 'react'
import { updatePassword } from '../../supabase/auth'
import AuthLayout from './AuthLayout'

/*
  Écran « définir un nouveau mot de passe ».
  ---------------------------------------------------------------------------
  Affiché quand l'utilisateur arrive depuis le lien du mail « mot de passe
  oublié ». À ce moment-là, Supabase lui a ouvert une session de récupération
  (détectée dans AuthContext via l'événement PASSWORD_RECOVERY), ce qui autorise
  updateUser({ password }).

  Flux : saisie + confirmation du nouveau mot de passe → updatePassword →
  écran de succès → onDone() (qui referme le mode récupération et renvoie
  l'utilisateur, déjà connecté, vers l'accueil).
*/

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      step="réinitialisation"
      title="Nouveau"
      italicWord="mot de passe."
      accent="blue"
      description="Choisis un nouveau mot de passe pour ton compte SoundCheck."
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-blue">
            Mot de passe modifié{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              c'est fait
            </span>
          </p>
          <p className="font-display font-bold text-2xl text-text-primary">
            Tout est à jour.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Ton mot de passe a bien été changé. Tu es déjà connecté, tu peux
            retourner jouer.
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={onDone}
              className="editorial-link group cursor-pointer font-display font-medium text-xl text-text-primary"
            >
              <span>Continuer</span>
              <span className="arrow text-accent-blue text-2xl leading-none">→</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldLine label="Nouveau mot de passe (min 6)">
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

          <FieldLine label="Confirme le mot de passe">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              <span>{loading ? 'Enregistrement…' : 'Enregistrer'}</span>
              <span className="arrow text-accent-blue text-2xl leading-none">→</span>
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

/* ----- Champ « ligne tracée » éditorial (accent bleu) ----- */
function FieldLine({ label, children }) {
  return (
    <div className="border-b border-white/10 pb-2 focus-within:border-accent-blue transition-colors">
      <label className="block text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

/* ----- Traduction des messages d'erreur Supabase ----- */
function traduireErreur(err) {
  const msg = err?.message || 'Une erreur est survenue.'
  const lower = msg.toLowerCase()
  if (lower.includes('password should be at least')) {
    return 'Mot de passe trop faible (min 6 caractères).'
  }
  if (lower.includes('different from the old password')) {
    return 'Choisis un mot de passe différent de l\'ancien.'
  }
  if (lower.includes('session') || lower.includes('jwt') || lower.includes('expired')) {
    return 'Lien expiré. Refais une demande de réinitialisation depuis « Mot de passe oublié ».'
  }
  return msg
}
