import { motion } from 'framer-motion'
import UserMenu from './ui/UserMenu'
import {
  EASE_OUT,
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../utils/motion'

/*
  Home — refonte editorial magazine.
  ---------------------------------------------------------------------------
  Mise en page : grille 12 colonnes avec contenu décalé à gauche (col 1-7) et
  espace négatif à droite (col 8-12) qui accueille un label "Vol. 01 / 2026"
  pour évoquer la une d'un magazine.

  Le titre est composé en bloc empilé :
      Sound          (gradient vert→violet)
      blind test.    (italique serif, plus petit, légèrement décalé)
      Check          (blanc)

  Le CTA n'est plus un gros bouton plein — c'est un lien stylé éditorial
  avec underline tracé au hover et flèche qui glisse.

  Un marquee en bas fait défiler des termes pour évoquer un ticker magazine.
*/

const MARQUEE_ITEMS = [
  'Blind test',
  'Multijoueur',
  'Deezer',
  '4 modes de jeu',
  'Réflexes',
  'Top 100',
  '8 secondes',
  'Premier qui buzz',
  'Tous les genres',
]

export default function Home({
  onStart,
  onLogout,
  onProfile,
  onHistory,
  onLeaderboard,
  isGuest = false,
}) {
  return (
    <motion.main
      key="home"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
    >
      {/* Halos colorés qui dérivent lentement en arrière-plan */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-accent-purple/25 blur-[120px] animate-drift"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent-green/20 blur-[120px] animate-drift"
        style={{ animationDelay: '-7s' }}
        aria-hidden="true"
      />

      {/* Bandeau du haut : version + édition à droite, signature à gauche */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 px-4 sm:px-10 pt-6 sm:pt-8 flex items-start justify-between gap-4"
      >
        <motion.p
          variants={fadeUpChild}
          className="text-xs uppercase tracking-[0.3em] text-text-tertiary"
        >
          SoundCheck —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            le blind test
          </span>
        </motion.p>

        {/* Bandeau utilisateur — carte d'identité (avatar+pseudo) + menu
            d'actions juste en dessous, en style éditorial cohérent avec le
            reste de l'app (numéros italique serif + flèche au hover).

            La dropdown originale du UserMenu a été retirée (bug : les clics
            sur ses items ne déclenchaient pas leur onClick). On y reviendra. */}
        <motion.div variants={fadeUpChild} className="flex flex-col items-end gap-4">
          <UserMenu isGuest={isGuest} />
          <UserActions
            isGuest={isGuest}
            onProfile={onProfile}
            onHistory={onHistory}
            onLeaderboard={onLeaderboard}
            onLogout={onLogout}
          />
        </motion.div>
      </motion.div>

      {/* Contenu central — grille 12 colonnes asymétrique */}
      <div className="relative z-10 px-4 sm:px-10 mt-10 sm:mt-20 grid grid-cols-12 gap-6 flex-1">
        {/* Bloc gauche : titre + description + CTA */}
        <div className="col-span-12 lg:col-span-8">
          {/* Titre empilé, démesuré, mélange display + italique serif */}
          <motion.h1
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
            className="font-display font-extrabold text-text-primary
                       leading-[0.85] tracking-[-0.04em]
                       text-[72px] sm:text-[140px] lg:text-[180px] xl:text-[200px]"
          >
            <span className="block bg-gradient-to-br from-accent-green via-accent-green to-accent-purple bg-clip-text text-transparent">
              Sound
            </span>
            <span
              className="block serif-italic text-text-secondary
                         text-[28px] sm:text-[56px] lg:text-[72px]
                         leading-none mt-2 sm:mt-4 ml-[6%] sm:ml-[8%]"
            >
              le blind test.
            </span>
            <span className="block text-text-primary -mt-1">Check</span>
          </motion.h1>

          {/* Description : courte, max-width restreint pour le rythme editorial */}
          <motion.p
            variants={fadeUpChild}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.7, duration: 0.6, ease: EASE_OUT }}
            className="mt-10 max-w-[420px] text-base sm:text-lg text-text-secondary leading-relaxed"
          >
            Réunis tes amis, lance un extrait de 8 secondes et défiez-vous
            pour deviner le morceau en premier. Multijoueur local, propulsé
            par Deezer.
          </motion.p>

          {/* CTA — pas un bouton plein, un lien magazine */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6, ease: EASE_OUT }}
            className="mt-10 sm:mt-12"
          >
            <button
              onClick={onStart}
              className="editorial-link group cursor-pointer
                         font-display font-medium text-xl sm:text-3xl
                         text-text-primary"
            >
              <span>Démarrer une partie</span>
              <span className="arrow text-accent-green text-2xl sm:text-4xl leading-none">
                →
              </span>
            </button>
          </motion.div>
        </div>

        {/* Bloc droit : "fiche editoriale" — chiffres clés style magazine */}
        <motion.aside
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.8, ease: EASE_OUT }}
          className="hidden lg:flex col-span-4 flex-col gap-8 pt-4"
        >
          <Fact
            number="01"
            label="Joueurs simultanés"
            value="1 → 5"
          />
          <Fact
            number="02"
            label="Modes de jeu"
            value="Quatre"
          />
          <Fact
            number="03"
            label="Durée d'un extrait"
            value="8 sec."
          />
          <Fact
            number="04"
            label="Catalogue"
            value="Deezer"
          />
        </motion.aside>
      </div>

      {/* Marquee bas : ticker magazine */}
      {/* Note : passé de absolute à relative pour ne plus chevaucher le contenu
         sur petits écrans. Avec flex flex-col + flex-1 sur le contenu, il vient
         naturellement coller en bas du viewport. */}
      <div className="relative z-10 mt-10 sm:mt-0 border-t border-white/5 bg-bg-primary/60 backdrop-blur-sm py-4 overflow-hidden">
        <div className="flex w-max animate-marquee">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(
            (item, i) => (
              <span
                key={i}
                className="px-4 sm:px-6 text-xs sm:text-sm uppercase tracking-[0.25em] text-text-tertiary whitespace-nowrap"
              >
                {item}{' '}
                <span className="serif-italic normal-case tracking-normal text-text-muted">
                  ·
                </span>
              </span>
            )
          )}
        </div>
      </div>
    </motion.main>
  )
}

/* ----- Sous-composant : menu utilisateur en liens éditoriaux -----
   Quatre actions stylées comme des liens magazine (numéro serif italique,
   label en small caps, flèche qui glisse au hover). Couleur d'accent
   différente par action pour rester cohérent avec le reste de l'app. */
function UserActions({ isGuest, onProfile, onHistory, onLeaderboard, onLogout }) {
  if (isGuest) {
    return (
      <ActionLink
        number="01"
        accent="pink"
        label="Quitter le mode invité"
        onClick={onLogout}
      />
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 sm:gap-x-6 gap-y-2">
      <ActionLink number="01" accent="green" label="Profil" onClick={onProfile} />
      <ActionLink number="02" accent="purple" label="Historique" onClick={onHistory} />
      <ActionLink number="03" accent="blue" label="Classement" onClick={onLeaderboard} />
      <ActionLink number="04" accent="pink" label="Déconnexion" onClick={onLogout} />
    </div>
  )
}

/* ----- Lien d'action éditorial : numéro serif + label + flèche ----- */
function ActionLink({ number, accent, label, onClick }) {
  // Map accent → classes Tailwind (Tailwind ne supporte pas les classes dynamiques
  // construites par concaténation, donc on les déclare en entier ici)
  const accentClasses = {
    green: 'text-accent-green',
    purple: 'text-accent-purple',
    blue: 'text-accent-blue',
    pink: 'text-accent-pink',
  }
  const accentText = accentClasses[accent] || 'text-accent-green'

  return (
    <button
      type="button"
      onClick={onClick}
      className="editorial-link group cursor-pointer text-text-secondary
                 hover:text-text-primary transition-colors"
    >
      <span className={`serif-italic ${accentText} text-sm leading-none`}>
        {number}
      </span>
      <span className="font-display font-medium text-xs uppercase tracking-[0.2em]">
        {label}
      </span>
      <span className={`arrow ${accentText} text-base leading-none`}>→</span>
    </button>
  )
}

/* ----- Sous-composant : "fait" éditorial avec numéro italique ----- */
function Fact({ number, label, value }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-white/10 pt-4">
      <span className="serif-italic text-accent-purple text-2xl">
        {number}
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
          {label}
        </p>
        <p className="font-display font-semibold text-2xl text-text-primary">
          {value}
        </p>
      </div>
    </div>
  )
}
