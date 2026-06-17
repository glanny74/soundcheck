import { motion } from 'framer-motion'
import { EASE_OUT } from '../utils/motion'

/*
  Onboarding modal — affiché AU PREMIER PASSAGE sur l'écran Game.
  ---------------------------------------------------------------------------
  Pourquoi : le flux V3 (réponse PUIS attribution joueur) est original mais
  surprenant. Sans explication, les joueurs tâtonnent les premières manches.
  Ce modal pose les règles en 3 étapes claires avant la première partie.

  Persistance : un flag localStorage (sc_game_onboarded) évite de remontrer
  le modal aux sessions suivantes. L'état est lu/écrit côté Game.jsx, ce
  composant est purement présentationnel.
*/

export default function GameOnboarding({ onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-bg-primary/95 backdrop-blur-md
                 flex items-center justify-center px-4 sm:px-8 py-8 overflow-y-auto"
      role="dialog"
      aria-labelledby="onboarding-title"
    >
      {/* Halo discret en fond pour rappeler la DA Home */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[400px] h-[400px]
                   rounded-full bg-accent-green/15 blur-[100px] animate-drift"
        aria-hidden="true"
      />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
        className="relative max-w-2xl w-full"
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
          SoundCheck —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            mode d'emploi
          </span>
        </p>

        <h2
          id="onboarding-title"
          className="font-display font-extrabold leading-[0.9] tracking-[-0.04em]
                     text-[40px] sm:text-[64px] mb-8 sm:mb-10"
        >
          <span className="block text-text-primary">Bienvenue.</span>
          <span className="block serif-italic text-accent-green ml-[4%] sm:ml-[6%] text-[28px] sm:text-[44px]">
            comment ça marche.
          </span>
        </h2>

        <ol className="space-y-5 sm:space-y-6 mb-8">
          <Step
            number="01"
            title="Écoute l'extrait"
            body="8 secondes pour reconnaître le morceau."
            accent="text-accent-green"
          />
          <Step
            number="02"
            title="Tape la bonne réponse"
            body="4 propositions à l'écran. Le premier qui tape la bonne marque la manche."
            accent="text-accent-purple"
          />
          <Step
            number="03"
            title="Sélectionne le joueur"
            body="Indique qui a trouvé : ce joueur gagne 10 points."
            accent="text-accent-pink"
          />
        </ol>

        <p className="text-sm text-text-secondary mb-10 max-w-lg leading-relaxed">
          Pas de course au buzz pendant la lecture. Entre l'étape 02 et 03, le
          temps est{' '}
          <span className="serif-italic text-text-primary">figé</span> — tu
          choisis le joueur tranquillement.
        </p>

        <button
          onClick={onDismiss}
          className="editorial-link-primary group cursor-pointer
                     font-display font-medium text-xl sm:text-2xl text-text-primary"
        >
          <span>C'est compris</span>
          <span className="arrow text-accent-green text-2xl sm:text-3xl leading-none">
            →
          </span>
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ----- Étape numérotée style article éditorial ----- */
function Step({ number, title, body, accent }) {
  return (
    <li className="flex gap-4 sm:gap-6 items-start border-t border-white/5 pt-4 sm:pt-5">
      <span
        className={`serif-italic ${accent} text-3xl sm:text-4xl shrink-0 leading-none mt-1`}
      >
        {number}
      </span>
      <div>
        <p className="font-display font-bold text-lg sm:text-2xl text-text-primary mb-1 leading-tight">
          {title}
        </p>
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
          {body}
        </p>
      </div>
    </li>
  )
}
