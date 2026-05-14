import { useState } from 'react'
import { motion } from 'framer-motion'
import { resendEmailVerification } from '../../firebase/auth'
import { useAuth } from '../../hooks/useAuth'

/*
  Bannière "vérifie ton email".
  ---------------------------------------------------------------------------
  Affichée en haut de l'app pour les utilisateurs inscrits par email dont
  l'adresse n'a pas encore été vérifiée. Deux actions :
   - "Renvoyer le lien" → re-déclenche sendEmailVerification
   - "J'ai vérifié" → recharge l'objet user Firebase (refreshUser dans le
     AuthContext) pour récupérer la valeur à jour de emailVerified

  Note : Firebase ne notifie PAS automatiquement le client quand l'utilisateur
  clique sur le lien dans son mail. Il faut explicitement appeler user.reload()
  pour récupérer le nouveau emailVerified — d'où le bouton "J'ai vérifié".

  La bannière disparait dès que emailVerified passe à true (logique de rendu
  dans App.jsx).
*/

export default function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'checking' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  async function handleResend() {
    setStatus('sending')
    setErrorMsg('')
    try {
      await resendEmailVerification()
      setStatus('sent')
      // Retour à idle au bout de 5s pour permettre de renvoyer à nouveau si besoin
      setTimeout(() => setStatus('idle'), 5000)
    } catch (err) {
      setStatus('error')
      // Firebase rate-limit : auth/too-many-requests
      if (err?.code === 'auth/too-many-requests') {
        setErrorMsg('Trop de demandes. Réessaie dans quelques minutes.')
      } else {
        setErrorMsg('Envoi impossible. Réessaie plus tard.')
      }
    }
  }

  async function handleCheck() {
    setStatus('checking')
    setErrorMsg('')
    try {
      await refreshUser()
      // Si emailVerified est passé à true, App.jsx démontera la bannière.
      // Sinon, on remet idle et l'utilisateur peut réessayer.
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg('Erreur de rafraîchissement.')
    }
  }

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-50 bg-accent-pink/10 border-b border-accent-pink/30 backdrop-blur-sm"
    >
      <div className="px-4 sm:px-10 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-pink">
            Vérification —{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              en attente
            </span>
          </p>
          <p className="text-sm text-text-primary mt-1 truncate">
            Confirme ton adresse <strong>{user?.email}</strong> en cliquant sur
            le lien envoyé par mail.
          </p>
          {status === 'sent' && (
            <p className="text-xs text-accent-green mt-1">
              Nouveau lien envoyé. Pense à vérifier tes spams.
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-accent-pink mt-1">{errorMsg}</p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={handleResend}
            disabled={status === 'sending' || status === 'sent'}
            className="text-sm text-text-secondary hover:text-text-primary
                       transition-colors cursor-pointer disabled:opacity-40
                       disabled:cursor-not-allowed underline-offset-4 hover:underline"
          >
            {status === 'sending' ? 'Envoi…' : 'Renvoyer le lien'}
          </button>

          <button
            type="button"
            onClick={handleCheck}
            disabled={status === 'checking'}
            className="text-sm font-medium text-text-primary
                       transition-colors cursor-pointer disabled:opacity-40
                       disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>{status === 'checking' ? 'Vérification…' : "J'ai vérifié"}</span>
            <span className="text-accent-pink text-lg leading-none">→</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
