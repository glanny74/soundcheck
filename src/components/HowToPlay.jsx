import { motion } from 'framer-motion'
import { EASE_OUT } from '../utils/motion'

/*
  Modal "Comment jouer ?" — récap des règles globales du jeu.
  ---------------------------------------------------------------------------
  Complémentaire à GameOnboarding (qui n'explique QUE le flux à 3 étapes
  d'une manche). Ici on couvre la vue d'ensemble :
   - Concept général du blind test
   - Les 4 modes disponibles
   - Format des parties (manches, durée, scoring)
   - Multijoueur local

  Déclenché manuellement par l'utilisateur (lien sur Home, entrée dans
  UserMenu). Pas de persistance localStorage : c'est de l'aide à la demande,
  on l'affiche à chaque fois qu'il est demandé.
*/

const MODES = [
  {
    number: '01',
    name: 'Artiste solo',
    body: 'Tous les titres viennent d\'un seul artiste de ton choix.',
    accent: 'text-accent-purple',
  },
  {
    number: '02',
    name: 'Multi-artistes',
    body: 'Sélectionne plusieurs artistes, on mélange leurs catalogues.',
    accent: 'text-accent-blue',
  },
  {
    number: '03',
    name: 'Par genre',
    body: 'Choisis un genre musical et une langue.',
    accent: 'text-accent-pink',
  },
  {
    number: '04',
    name: 'Aléatoire',
    body: 'Surprise totale, large éventail de titres populaires.',
    accent: 'text-accent-green',
  },
]

export default function HowToPlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-bg-primary/90 backdrop-blur-md
                 flex items-start sm:items-center justify-center
                 px-4 sm:px-8 py-8 overflow-y-auto"
      role="dialog"
      aria-labelledby="how-to-play-title"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl w-full bg-bg-card/80 border border-white/10
                   rounded-3xl p-6 sm:p-10 my-auto"
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 sm:top-6 sm:right-6
                     w-9 h-9 rounded-full border border-white/10
                     flex items-center justify-center cursor-pointer
                     hover:border-white/30 hover:bg-white/[0.04]
                     transition-colors text-text-secondary text-lg"
        >
          ×
        </button>

        {/* En-tête */}
        <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
          SoundCheck —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            règles du jeu
          </span>
        </p>

        <h2
          id="how-to-play-title"
          className="font-display font-extrabold leading-[0.9] tracking-[-0.04em]
                     text-[36px] sm:text-[56px] mb-3"
        >
          <span className="block text-text-primary">Comment</span>
          <span className="block serif-italic text-accent-green ml-[4%]">
            ça se joue ?
          </span>
        </h2>

        {/* Concept */}
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-xl mb-10">
          SoundCheck est un blind test multijoueur local. Tu écoutes un extrait
          de musique, tu reconnais le morceau, tu marques des points.{' '}
          <span className="serif-italic text-text-primary">
            De 1 à 5 joueurs sur le même appareil.
          </span>
        </p>

        {/* Format d'une partie */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 pb-2 border-b border-white/10">
            Format{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              d'une partie
            </span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Fact label="Manches" value="5 · 10 · 15" />
            <Fact label="Extrait" value="8 sec." />
            <Fact label="Réponse" value="15 sec." />
            <Fact label="Bonne réponse" value="+10 pts" />
          </div>
        </section>

        {/* Modes */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 pb-2 border-b border-white/10">
            Quatre{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              modes de jeu
            </span>
          </p>

          <ul className="space-y-3">
            {MODES.map((m) => (
              <li key={m.number} className="flex gap-4 items-baseline">
                <span className={`serif-italic ${m.accent} text-xl shrink-0 w-8`}>
                  {m.number}
                </span>
                <div>
                  <p className="font-display font-bold text-base sm:text-lg text-text-primary leading-tight">
                    {m.name}
                  </p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {m.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Déroulé d'une manche — rappel express */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 pb-2 border-b border-white/10">
            Déroulé{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              d'une manche
            </span>
          </p>

          <ol className="space-y-2 text-sm sm:text-base text-text-secondary leading-relaxed">
            <li>
              <span className="serif-italic text-accent-green mr-2">01.</span>
              Lance l'extrait, écoute pendant 8 secondes.
            </li>
            <li>
              <span className="serif-italic text-accent-purple mr-2">02.</span>
              Tape la bonne proposition parmi les 4 affichées.
            </li>
            <li>
              <span className="serif-italic text-accent-pink mr-2">03.</span>
              Sélectionne le joueur qui a trouvé : il marque 10 points.
            </li>
          </ol>
        </section>

        {/* CTA fermer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="editorial-link-primary group cursor-pointer
                       font-display font-medium text-lg sm:text-xl text-text-primary"
          >
            <span>C'est noté</span>
            <span className="arrow text-accent-green text-2xl leading-none">
              →
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ----- Petit bloc "fact" éditorial (manches, durée, etc.) ----- */
function Fact({ label, value }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
        {label}
      </p>
      <p className="font-display font-bold text-base sm:text-lg text-text-primary tabular-nums">
        {value}
      </p>
    </div>
  )
}
