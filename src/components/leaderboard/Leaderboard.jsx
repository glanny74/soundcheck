import { motion } from 'framer-motion'
import { pageTransition } from '../../utils/motion'

/*
  Placeholder pour l'écran Leaderboard. Le contenu réel sera implémenté à
  l'étape 6 (après la sauvegarde des parties en étape 4).
*/

export default function Leaderboard({ onBack }) {
  return (
    <motion.main
      key="leaderboard"
      {...pageTransition}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
        SoundCheck —{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          classement
        </span>
      </p>
      <h1 className="font-display font-extrabold text-5xl sm:text-7xl tracking-tight">
        Bientôt
        <span className="serif-italic text-accent-blue">.</span>
      </h1>
      <p className="text-text-secondary max-w-md mt-4 text-base">
        Le leaderboard arrivera à la prochaine étape.
      </p>
      <button
        onClick={onBack}
        className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm mt-10"
      >
        <span className="arrow text-accent-blue text-xl leading-none rotate-180 inline-block">
          →
        </span>
        <span>Retour à l'accueil</span>
      </button>
    </motion.main>
  )
}
