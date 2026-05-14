import { motion } from 'framer-motion'
import {
  EASE_OUT,
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../../utils/motion'

/*
  Écran d'accueil pré-authentification.
  ---------------------------------------------------------------------------
  Affiché au premier lancement (ou si user déconnecté). Propose 3 voies :
   - Se connecter
   - Créer un compte
   - Jouer en invité (V1 — pas de sauvegarde, pas de leaderboard)
*/

export default function Welcome({ onLogin, onRegister, onGuest }) {
  return (
    <motion.main
      key="welcome"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
    >
      {/* Halos colorés en arrière-plan */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-accent-purple/25 blur-[120px] animate-drift"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent-green/20 blur-[120px] animate-drift"
        style={{ animationDelay: '-7s' }}
        aria-hidden="true"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 flex-1 px-4 sm:px-10 pt-8 sm:pt-12 pb-12"
      >
        <motion.p
          variants={fadeUpChild}
          className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary"
        >
          SoundCheck —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            le blind test
          </span>
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
          className="mt-10 sm:mt-14 font-display font-extrabold text-text-primary
                     leading-[0.85] tracking-[-0.04em]
                     text-[64px] sm:text-[120px] lg:text-[160px]"
        >
          <span className="block">Bienvenue</span>
          <span className="block serif-italic text-text-secondary text-[28px] sm:text-[48px] lg:text-[64px] leading-none mt-2 ml-[6%]">
            choisis ta voie.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUpChild}
          className="mt-10 max-w-[440px] text-text-secondary text-base leading-relaxed"
        >
          Crée un compte pour sauvegarder ton historique et grimper dans le
          classement.{' '}
          <span className="serif-italic text-text-primary">
            Ou joue tout de suite sans inscription.
          </span>
        </motion.p>

        {/* 3 CTAs editorial */}
        <motion.div
          variants={fadeUpChild}
          className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl"
        >
          <CTA
            number="01"
            accent="text-accent-green"
            label="Se connecter"
            description="J'ai déjà un compte."
            onClick={onLogin}
          />
          <CTA
            number="02"
            accent="text-accent-purple"
            label="Créer un compte"
            description="Sauvegarder mes parties."
            onClick={onRegister}
          />
          <CTA
            number="03"
            accent="text-accent-pink"
            label="Jouer en invité"
            description="Sans inscription."
            onClick={onGuest}
          />
        </motion.div>
      </motion.div>
    </motion.main>
  )
}

function CTA({ number, accent, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left p-6 rounded-2xl border border-white/5
                 bg-bg-card/40 backdrop-blur-sm hover:bg-bg-card/80 hover:border-white/15
                 transition-all duration-300 cursor-pointer"
    >
      <span className={`serif-italic ${accent} text-2xl block mb-3`}>
        {number}
      </span>
      <span className="font-display font-bold text-2xl text-text-primary block leading-tight mb-2">
        {label}
      </span>
      <span className="text-sm text-text-secondary block">{description}</span>
      <span
        className={`absolute bottom-4 right-4 ${accent} text-2xl group-hover:translate-x-1 transition-transform`}
      >
        →
      </span>
    </button>
  )
}
