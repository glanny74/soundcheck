import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { rankPlayers } from '../utils/gameLogic'
import {
  EASE_OUT,
  fadeUpChild,
  heroTitle,
  pageTransition,
  staggerContainer,
} from '../utils/motion'

/*
  Écran Results V2 — wow final editorial.
  ===========================================================================
  - Backdrop : halos colorés qui dérivent lentement (gradient mesh)
  - canvas-confetti au mount (3 vagues échelonnées dans le temps)
  - Titre héroïque (180px+) : "{Gagnant} l'emporte." avec "l'emporte" en
    Instrument Serif italique
  - Podium asymétrique :
      * 1er au centre, très grand, gradient vert→violet
      * 2e en bas à gauche, plus petit, ton bleu/argent
      * 3e en bas à droite, encore plus petit, ton rose/bronze
  - Bloc de stats globales en cartes editorial
  - CTAs minimalistes (liens stylés)
*/

const CONFETTI_COLORS = ['#1DB954', '#A855F7', '#EC4899', '#3B82F6', '#FFFFFF']

export default function Results({ players, onReplay, onNewGame }) {
  const ranked = rankPlayers(players)
  const [first, second, third, ...rest] = ranked

  // Stats dérivées (on n'a pas besoin de tracker plus côté state)
  const totalPoints = players.reduce((sum, p) => sum + p.score, 0)
  const totalCorrect = totalPoints / 10
  const gap = first && ranked.length > 1 ? first.score - ranked[ranked.length - 1].score : 0

  // Confettis au montage — trois vagues pour une explosion plus longue
  useEffect(() => {
    const fire = (origin, particleCount) =>
      confetti({
        particleCount,
        spread: 80,
        startVelocity: 45,
        origin,
        colors: CONFETTI_COLORS,
        scalar: 1.1,
        ticks: 250,
      })

    fire({ x: 0.5, y: 0.4 }, 120)
    const t1 = setTimeout(() => fire({ x: 0.2, y: 0.5 }, 80), 400)
    const t2 = setTimeout(() => fire({ x: 0.8, y: 0.5 }, 80), 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <motion.main
      key="results"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-8 sm:py-12"
    >
      {/* Halos colorés (gradient mesh artisanal) */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent-purple/20 blur-[140px] animate-drift"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-accent-green/15 blur-[120px] animate-drift"
        style={{ animationDelay: '-10s' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-accent-pink/15 blur-[140px] animate-drift"
        style={{ animationDelay: '-5s' }}
        aria-hidden="true"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-6xl mx-auto"
      >
        {/* Label editorial */}
        <motion.p
          variants={fadeUpChild}
          className="text-center text-[11px] uppercase tracking-[0.4em] text-text-tertiary"
        >
          Fin de la partie —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            classement final
          </span>
        </motion.p>

        {/* Titre héroïque : nom du gagnant + l'emporte en italique */}
        <motion.h1
          variants={heroTitle}
          className="mt-6 text-center font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                     text-[52px] sm:text-[120px] lg:text-[180px] break-words"
        >
          <span className="block bg-gradient-to-br from-accent-green via-accent-purple to-accent-pink bg-clip-text text-transparent">
            {first ? first.name : '—'}
          </span>
          <span className="block serif-italic text-text-secondary text-[28px] sm:text-[72px] lg:text-[96px] leading-none mt-1">
            l'emporte.
          </span>
        </motion.h1>

        {/* Podium editorial asymétrique */}
        <motion.div
          variants={fadeUpChild}
          className="mt-16 grid grid-cols-12 gap-6 items-end"
        >
          {/* 2e — à gauche, plus petit */}
          <div className="col-span-4 sm:col-span-3 lg:col-span-3">
            <PodiumCard player={second} rank={2} />
          </div>

          {/* 1er — centre, grand */}
          <div className="col-span-4 sm:col-span-6 lg:col-span-6">
            <PodiumCard player={first} rank={1} hero />
          </div>

          {/* 3e — à droite, plus petit */}
          <div className="col-span-4 sm:col-span-3 lg:col-span-3">
            <PodiumCard player={third} rank={3} />
          </div>
        </motion.div>

        {/* Bloc stats globales — fiche editorial */}
        <motion.div
          variants={fadeUpChild}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
        >
          <StatCard
            number="01"
            label="Bonnes réponses au total"
            value={totalCorrect}
            accent="text-accent-green"
          />
          <StatCard
            number="02"
            label="Points distribués"
            value={totalPoints}
            accent="text-accent-purple"
          />
          <StatCard
            number="03"
            label="Écart 1er — dernier"
            value={gap}
            accent="text-accent-pink"
          />
        </motion.div>

        {/* Tableau complet (si plus de 3 joueurs) */}
        {rest.length > 0 && (
          <motion.div
            variants={fadeUpChild}
            className="mt-12 max-w-md mx-auto"
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-4 border-b border-white/10 pb-3">
              Classement{' '}
              <span className="serif-italic normal-case tracking-normal text-text-secondary">
                complet
              </span>
            </p>
            <ul className="divide-y divide-white/5">
              {ranked.map((p, i) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 py-3"
                >
                  <span className="serif-italic text-text-tertiary text-sm">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <span className="font-display font-bold text-2xl tabular-nums">
                    {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* CTAs minimalistes éditoriaux — sous-label en small caps pour
            expliciter ce que chaque action fait (sinon Rejouer/Nouvelle
            partie sont ambigus pour qui découvre le jeu). */}
        <motion.div
          variants={fadeUpChild}
          className="mt-16 flex flex-col sm:flex-row gap-10 sm:gap-16 justify-center items-start sm:items-center"
        >
          <div className="flex flex-col items-start sm:items-center gap-2">
            <button
              onClick={onReplay}
              className="editorial-link group cursor-pointer font-display font-medium text-2xl text-text-primary"
            >
              <span>Rejouer</span>
              <span className="arrow text-accent-green text-3xl leading-none">→</span>
            </button>
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
              Mêmes joueurs,{' '}
              <span className="serif-italic normal-case tracking-normal text-text-secondary">
                nouveau mode
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-center gap-2">
            <button
              onClick={onNewGame}
              className="editorial-link group cursor-pointer font-display font-medium text-2xl text-text-secondary"
            >
              <span>
                <span className="serif-italic">ou</span> nouvelle partie
              </span>
              <span className="arrow text-text-secondary text-3xl leading-none">→</span>
            </button>
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
              Tout{' '}
              <span className="serif-italic normal-case tracking-normal text-text-secondary">
                recommencer
              </span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </motion.main>
  )
}

/* ============================================================ */
/* SOUS-COMPOSANTS                                               */
/* ============================================================ */

/* ----- Carte de podium : grand cercle gradient + nom + score ----- */
function PodiumCard({ player, rank, hero = false }) {
  // Couleurs et tailles selon le rang
  const config = {
    1: {
      gradient: 'from-accent-green via-accent-green to-accent-purple',
      sizeCircle: hero ? 'w-32 h-32 sm:w-48 sm:h-48' : 'w-20 h-20',
      sizeName: hero ? 'text-2xl sm:text-3xl' : 'text-lg',
      sizeScore: hero ? 'text-5xl sm:text-7xl' : 'text-3xl',
      sizeRankNum: hero ? 'text-7xl sm:text-8xl' : 'text-4xl',
    },
    2: {
      gradient: 'from-accent-blue to-accent-purple',
      sizeCircle: 'w-20 h-20 sm:w-28 sm:h-28',
      sizeName: 'text-base sm:text-xl',
      sizeScore: 'text-2xl sm:text-4xl',
      sizeRankNum: 'text-4xl sm:text-5xl',
    },
    3: {
      gradient: 'from-accent-pink to-accent-purple',
      sizeCircle: 'w-20 h-20 sm:w-28 sm:h-28',
      sizeName: 'text-base sm:text-xl',
      sizeScore: 'text-2xl sm:text-4xl',
      sizeRankNum: 'text-4xl sm:text-5xl',
    },
  }
  const c = config[rank]

  if (!player) {
    return (
      <div className="flex flex-col items-center opacity-30">
        <div className={`${c.sizeCircle} rounded-full bg-bg-card`} />
        <p className="mt-3 text-text-tertiary text-sm">—</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 + rank * 0.15, ease: EASE_OUT }}
      className="flex flex-col items-center text-center"
    >
      {/* Cercle gradient avec numéro de rang en gros */}
      <div
        className={`
          relative ${c.sizeCircle} rounded-full
          bg-gradient-to-br ${c.gradient}
          flex items-center justify-center
          shadow-2xl
        `}
        style={{ boxShadow: hero ? '0 0 80px rgba(168, 85, 247, 0.35)' : '' }}
      >
        <span className={`serif-italic ${c.sizeRankNum} text-black/70 leading-none`}>
          {String(rank).padStart(2, '0')}
        </span>
      </div>

      {/* Nom du joueur */}
      <p
        className={`mt-4 font-display font-bold ${c.sizeName} truncate max-w-full`}
        title={player.name}
      >
        {player.name}
      </p>

      {/* Score en gros */}
      <p className={`font-display font-extrabold ${c.sizeScore} tabular-nums mt-1 leading-none`}>
        {player.score}
        <span className="serif-italic text-text-tertiary text-base ml-2 align-middle">
          pts
        </span>
      </p>
    </motion.div>
  )
}

/* ----- Carte de stat editorial : numéro italique + label + valeur ----- */
function StatCard({ number, label, value, accent }) {
  return (
    <div className="bg-bg-card/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
      <p className={`serif-italic ${accent} text-2xl mb-3`}>{number}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-2">
        {label}
      </p>
      <p className="font-display font-bold text-4xl tabular-nums">{value}</p>
    </div>
  )
}
