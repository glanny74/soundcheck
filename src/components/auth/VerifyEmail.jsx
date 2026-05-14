import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { applyVerificationCode } from '../../firebase/auth'
import { useAuth } from '../../hooks/useAuth'
import { EASE_OUT, pageTransition } from '../../utils/motion'

/*
  Écran de vérification d'email — atterrissage du lien envoyé par Firebase.
  ---------------------------------------------------------------------------
  Flow :
   1) L'utilisateur clique sur le lien dans son mail.
   2) Il arrive sur l'app avec ?mode=verifyEmail&oobCode=... dans l'URL.
   3) App.jsx détecte ces params, monte ce composant, et nous passe oobCode.
   4) Ce composant appelle applyVerificationCode(oobCode) au montage.
   5) Si succès : on rafraîchit l'objet user (pour mettre emailVerified à true
      côté client) puis on appelle onSuccess() qui décide de la redirection
      (Home si connecté, Welcome sinon).
   6) Si erreur : on affiche le message en français avec un retour possible.

  Cas d'erreur possibles (codes Firebase) :
   - auth/expired-action-code     : lien expiré (Firebase garde le code ~1h)
   - auth/invalid-action-code     : lien déjà utilisé ou corrompu
   - auth/user-disabled           : compte désactivé entre-temps
   - auth/user-not-found          : compte supprimé entre-temps
*/

export default function VerifyEmail({ oobCode, onSuccess, onError }) {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // On encapsule dans une closure async pour gérer await proprement dans useEffect
    async function verify() {
      if (!oobCode) {
        setStatus('error')
        setErrorMsg('Lien de vérification manquant.')
        return
      }

      try {
        await applyVerificationCode(oobCode)
        // L'email est maintenant vérifié côté serveur. Si l'utilisateur est
        // déjà connecté dans ce navigateur, on rafraîchit son state pour que
        // la bannière disparaisse immédiatement.
        if (user) {
          await refreshUser()
        }
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setErrorMsg(traduireErreur(err))
      }
    }
    verify()
    // On veut que ça se déclenche une seule fois au montage avec le oobCode
    // initial. Les dépendances user/refreshUser changent à chaque render mais
    // on ne veut pas relancer la vérif.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oobCode])

  // Auto-redirection après succès — laisse 2.5s pour que l'utilisateur lise
  // le message "c'est validé" avant qu'on l'envoie ailleurs.
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => onSuccess?.(), 2500)
    return () => clearTimeout(timer)
  }, [status, onSuccess])

  return (
    <motion.main
      key="verify"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6"
    >
      {/* Halos de fond — couleur selon le statut */}
      <div
        className={`pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-[120px] animate-drift transition-colors duration-1000 ${
          status === 'success'
            ? 'bg-accent-green/30'
            : status === 'error'
              ? 'bg-accent-pink/25'
              : 'bg-accent-purple/25'
        }`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-[120px] animate-drift transition-colors duration-1000 ${
          status === 'success'
            ? 'bg-accent-purple/20'
            : status === 'error'
              ? 'bg-accent-purple/20'
              : 'bg-accent-green/20'
        }`}
        style={{ animationDelay: '-7s' }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="relative z-10 max-w-xl text-center"
      >
        {status === 'verifying' && <VerifyingView />}
        {status === 'success' && <SuccessView isLoggedIn={!!user} />}
        {status === 'error' && (
          <ErrorView
            message={errorMsg}
            isLoggedIn={!!user}
            onContinue={onError}
          />
        )}
      </motion.div>
    </motion.main>
  )
}

/* ----- État "vérification en cours" ----- */
function VerifyingView() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">
        SoundCheck —{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          vérification
        </span>
      </p>

      <h1 className="mt-8 font-display font-extrabold text-text-primary leading-[0.9] tracking-[-0.03em] text-[44px] sm:text-[72px]">
        On vérifie
        <span className="block serif-italic text-text-secondary text-[24px] sm:text-[40px] mt-2">
          ton adresse<span className="text-accent-purple">.</span>
        </span>
      </h1>

      <p className="mt-8 text-text-secondary text-base">Un instant.</p>

      <div className="mt-8 flex items-center justify-center gap-1">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
    </>
  )
}

/* ----- État "succès" ----- */
function SuccessView({ isLoggedIn }) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.3em] text-accent-green">
        Vérifié{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          c'est bon
        </span>
      </p>

      <h1 className="mt-8 font-display font-extrabold text-text-primary leading-[0.9] tracking-[-0.03em] text-[44px] sm:text-[72px]">
        Adresse
        <span className="block serif-italic text-accent-green text-[36px] sm:text-[64px] mt-2">
          confirmée.
        </span>
      </h1>

      <p className="mt-8 text-text-secondary text-base leading-relaxed max-w-md mx-auto">
        {isLoggedIn ? (
          <>
            Tu peux maintenant sauvegarder ton historique et apparaître dans le
            classement.{' '}
            <span className="serif-italic text-text-primary">
              Redirection en cours.
            </span>
          </>
        ) : (
          <>
            Ton compte est prêt.{' '}
            <span className="serif-italic text-text-primary">
              Connecte-toi pour jouer.
            </span>
          </>
        )}
      </p>
    </>
  )
}

/* ----- État "erreur" ----- */
function ErrorView({ message, isLoggedIn, onContinue }) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.3em] text-accent-pink">
        Erreur{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          dommage
        </span>
      </p>

      <h1 className="mt-8 font-display font-extrabold text-text-primary leading-[0.9] tracking-[-0.03em] text-[44px] sm:text-[72px]">
        Lien
        <span className="block serif-italic text-accent-pink text-[36px] sm:text-[64px] mt-2">
          invalide.
        </span>
      </h1>

      <p className="mt-8 text-text-secondary text-base leading-relaxed max-w-md mx-auto">
        {message}
      </p>

      <button
        onClick={onContinue}
        className="editorial-link group cursor-pointer mt-10 font-display font-medium text-xl text-text-primary"
      >
        <span>{isLoggedIn ? 'Retour à l\'accueil' : 'Retour'}</span>
        <span className="arrow text-accent-pink text-2xl leading-none">→</span>
      </button>
    </>
  )
}

/* ----- Petit dot animé pour le loader ----- */
function Dot({ delay }) {
  return (
    <motion.span
      className="block h-2 w-2 rounded-full bg-accent-purple"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 1.2, repeat: Infinity, delay }}
    />
  )
}

function traduireErreur(err) {
  const code = err?.code || ''
  if (code === 'auth/expired-action-code') {
    return 'Ce lien a expiré. Renvoie-toi un nouveau lien depuis la bannière en haut de l\'app.'
  }
  if (code === 'auth/invalid-action-code') {
    return 'Ce lien est invalide ou a déjà été utilisé.'
  }
  if (code === 'auth/user-disabled') {
    return 'Ce compte est désactivé.'
  }
  if (code === 'auth/user-not-found') {
    return 'Ce compte n\'existe plus.'
  }
  return 'Une erreur est survenue. Réessaie depuis la bannière en haut de l\'app.'
}
