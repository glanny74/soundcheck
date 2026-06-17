import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  EASE_OUT,
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../utils/motion'

/*
  Écran PlayerSetup V2 — editorial magazine.
  ===========================================================================
  - Layout asymétrique : à gauche un grand titre numéroté "01 / Les joueurs."
    avec "joueurs" en italique serif. À droite le formulaire compact.
  - Indicateur d'étape en haut : 01 — 02 — 03 (progression vers la partie)
  - Sélecteur nombre de joueurs : pas 5 boutons en grille mais un stepper
    horizontal avec graduations cliquables et poignée violette qui glisse.
  - Inputs : apparaissent un par un en stagger, chacun préfixé "P.01", "P.02"
    en Instrument Serif italique.
  - CTA : lien minimaliste en bas à droite avec flèche animée.
*/

const MAX_PLAYERS = 5

export default function PlayerSetup({ onValidate, onBack }) {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(['', '', '', '', ''])
  const [error, setError] = useState('')

  const handleNameChange = (index, value) => {
    setNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    if (error) setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const activeNames = names.slice(0, playerCount).map((n) => n.trim())

    if (activeNames.some((n) => n.length === 0)) {
      setError('Merci de renseigner le nom de chaque joueur.')
      return
    }
    const unique = new Set(activeNames.map((n) => n.toLowerCase()))
    if (unique.size !== activeNames.length) {
      setError('Deux joueurs ne peuvent pas avoir le même nom.')
      return
    }

    onValidate(activeNames)
  }

  return (
    <motion.main
      key="player_setup"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-8"
    >
      {/* Halos */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent-purple/20 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      {/* === Bandeau du haut : retour + indicateur d'étape === */}
      <header className="relative z-10 flex items-start justify-between gap-6">
        <button
          onClick={onBack}
          className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm"
        >
          <span className="arrow text-accent-purple text-xl leading-none rotate-180 inline-block">
            →
          </span>
          <span>Retour</span>
        </button>

        <StepIndicator current={1} total={3} />
      </header>

      {/* === Contenu central : grille asymétrique === */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 mt-12 sm:mt-20 grid grid-cols-12 gap-8 lg:gap-16"
      >
        {/* Bloc gauche : titre énorme + description */}
        <div className="col-span-12 lg:col-span-6">
          <motion.p
            variants={fadeUpChild}
            className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-6"
          >
            Étape{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              01
            </span>{' '}
            sur 03
          </motion.p>

          <motion.h1
            variants={fadeUpChild}
            className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                       text-[56px] sm:text-[96px] lg:text-[140px]"
          >
            <span className="block text-text-primary">Les</span>
            <span className="block serif-italic text-accent-purple ml-[8%] sm:ml-[10%]">
              joueurs.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUpChild}
            className="mt-10 max-w-[380px] text-text-secondary text-base leading-relaxed"
          >
            De{' '}
            <span className="serif-italic text-text-primary">un</span> à{' '}
            <span className="serif-italic text-text-primary">cinq</span>{' '}
            participants. Chaque joueur disposera d'une touche dédiée pour
            buzzer pendant la partie.
          </motion.p>
        </div>

        {/* Bloc droit : formulaire compact */}
        <div className="col-span-12 lg:col-span-6">
          <motion.form
            variants={staggerContainer}
            onSubmit={handleSubmit}
            className="space-y-10"
          >
            {/* Stepper nombre de joueurs */}
            <motion.div variants={fadeUpChild}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-5">
                Nombre de joueurs
              </p>
              <PlayerCountStepper
                value={playerCount}
                onChange={setPlayerCount}
                max={MAX_PLAYERS}
              />
            </motion.div>

            {/* Inputs joueurs — apparaissent en cascade */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-5">
                Noms des participants
              </p>

              <AnimatePresence mode="popLayout">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: i * 0.08, duration: 0.5, ease: EASE_OUT },
                    }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                    className="mb-3 flex items-baseline gap-4 border-b border-white/10 pb-3 focus-within:border-accent-purple transition-colors"
                  >
                    <span className="serif-italic text-accent-purple text-xl shrink-0 w-12">
                      P.{String(i + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      placeholder={`Joueur ${i + 1}`}
                      value={names[i]}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                      maxLength={20}
                      className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary
                                 text-xl py-2 focus:outline-none font-medium"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Erreur */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-accent-pink text-sm"
              >
                <span className="serif-italic">erreur —</span> {error}
              </motion.p>
            )}

            {/* CTA en bas à droite, style lien primary (underline persistant) */}
            <motion.div variants={fadeUpChild} className="flex justify-end pt-4">
              <button
                type="submit"
                className="editorial-link-primary group cursor-pointer font-display font-medium text-2xl text-text-primary"
              >
                <span>Continuer</span>
                <span className="arrow text-accent-purple text-3xl leading-none">→</span>
              </button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </motion.main>
  )
}

/* ============================================================ */
/* SOUS-COMPOSANTS                                               */
/* ============================================================ */

/* ----- Indicateur d'étape : 01 — 02 — 03 ----- */
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em]">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1
        const active = n === current
        const passed = n < current
        return (
          <span
            key={n}
            className={`
              transition-colors
              ${active ? 'text-text-primary' : passed ? 'text-text-secondary' : 'text-text-tertiary'}
            `}
          >
            <span className={active ? 'serif-italic normal-case tracking-normal text-accent-purple' : ''}>
              {String(n).padStart(2, '0')}
            </span>
            {n < total && (
              <span className="ml-3 text-text-tertiary">—</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/* ----- Stepper horizontal : 1 — 2 — 3 — 4 — 5 -----
   Refonte tactile : chaque point est un cercle de 48-56px avec le chiffre au
   centre (au lieu d'en-dessous). On gagne en lisibilité ET en zone de clic
   (norme tactile Apple/Material : >= 44x44px). La ligne de fond passe DERRIÈRE
   les cercles via un translateY au lieu d'être centrée sur eux. */
function PlayerCountStepper({ value, onChange, max }) {
  return (
    <div className="relative py-2">
      {/* Ligne horizontale de fond — positionnée au centre vertical des cercles.
          On laisse de la marge horizontale pour qu'elle ne dépasse pas
          des points extrêmes. */}
      <div className="absolute top-1/2 left-[24px] right-[24px] h-px bg-white/10 -translate-y-1/2" />

      {/* Ligne de progression jusqu'à la valeur actuelle */}
      <motion.div
        className="absolute top-1/2 left-[24px] h-px bg-accent-purple -translate-y-1/2 origin-left"
        animate={{ scaleX: (value - 1) / (max - 1) }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={{ width: 'calc(100% - 48px)' }}
      />

      {/* Points cliquables — chiffre AU CENTRE, taille suffisante pour
          être touché confortablement au pouce. */}
      <div className="relative flex justify-between items-center">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1
          const active = value === n
          const passed = n <= value
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${n} joueur${n > 1 ? 's' : ''}`}
              className="relative flex items-center justify-center group cursor-pointer
                         w-12 h-12 sm:w-14 sm:h-14 rounded-full touch-manipulation"
            >
              {/* Cercle de fond animé */}
              <motion.span
                animate={{
                  scale: active ? 1 : 0.85,
                  backgroundColor: passed
                    ? 'var(--color-accent-purple)'
                    : 'var(--color-bg-elevated)',
                  borderColor: passed
                    ? 'var(--color-accent-purple)'
                    : 'rgba(255,255,255,0.2)',
                }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className={`
                  absolute inset-0 rounded-full border-2
                  ${active ? 'ring-4 ring-accent-purple/30' : ''}
                  group-hover:scale-105 transition-transform
                `}
                aria-hidden="true"
              />
              {/* Chiffre au centre */}
              <span
                className={`
                  relative font-display font-bold text-base sm:text-lg tabular-nums
                  transition-colors
                  ${passed ? 'text-white' : 'text-text-tertiary group-hover:text-text-secondary'}
                `}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {/* Helper texte : récap du choix en cours */}
      <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
        <span className="serif-italic normal-case tracking-normal text-accent-purple">
          {value}
        </span>{' '}
        joueur{value > 1 ? 's' : ''}{' '}
        <span className="serif-italic normal-case tracking-normal text-text-tertiary">
          sélectionné{value > 1 ? 's' : ''}
        </span>
      </p>
    </div>
  )
}
