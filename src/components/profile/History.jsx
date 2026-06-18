import { motion } from 'framer-motion'
import { useState } from 'react'
import { toDate } from '../../supabase/db'
import { useAuth } from '../../hooks/useAuth'
import { useGameHistory } from '../../hooks/useGameHistory'
import {
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../../utils/motion'

/*
  Écran Historique — liste paginée des parties jouées par l'utilisateur.
  ---------------------------------------------------------------------------
  - Style editorial : chaque partie = "article" magazine avec numéro italique,
    date en label, mode en gros, score/gagnant en accents
  - Pagination "load more" (10 par défaut) — le hook useGameHistory gère
  - Click sur une partie → expand inline pour voir le détail des joueurs
*/

// Mapping mode → label affichable + couleur d'accent
const MODE_LABELS = {
  artist: { label: 'Artiste solo', accent: 'text-accent-purple' },
  multi: { label: 'Multi-artistes', accent: 'text-accent-blue' },
  genre: { label: 'Par genre', accent: 'text-accent-pink' },
  random: { label: 'Aléatoire', accent: 'text-accent-green' },
  otaku: { label: 'Otaku', accent: 'text-accent-otaku' },
}

export default function History({ onBack }) {
  const { user } = useAuth()
  const { games, loading, loadingMore, error, hasMore, loadMore } =
    useGameHistory(user?.id)

  return (
    <motion.main
      key="history"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-10"
    >
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent-purple/15 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-4xl mx-auto"
      >
        <button
          onClick={onBack}
          className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm mb-8"
        >
          <span className="arrow text-accent-purple text-xl leading-none rotate-180 inline-block">
            →
          </span>
          <span>Retour à l'accueil</span>
        </button>

        {/* Titre */}
        <motion.p
          variants={fadeUpChild}
          className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-4"
        >
          SoundCheck —{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            archives
          </span>
        </motion.p>

        <motion.h1
          variants={fadeUpChild}
          className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                     text-[52px] sm:text-[96px] lg:text-[120px]"
        >
          <span className="block text-text-primary">Mon</span>
          <span className="block serif-italic text-accent-purple ml-[8%]">
            historique.
          </span>
        </motion.h1>

        {/* États de chargement / erreur / vide */}
        {loading && <CenteredMessage text="Chargement de tes parties…" />}

        {error && !loading && (
          <CenteredMessage
            text="Impossible de charger ton historique. Réessaie plus tard."
            isError
          />
        )}

        {!loading && !error && games.length === 0 && (
          <motion.div
            variants={fadeUpChild}
            className="mt-16 text-center max-w-md mx-auto py-12"
          >
            <p className="font-display font-bold text-3xl mb-3">
              Aucune partie.
              <span className="serif-italic text-text-tertiary"> pour l'instant.</span>
            </p>
            <p className="text-text-secondary text-sm">
              Joue ta première partie pour commencer à construire ton historique.
            </p>
          </motion.div>
        )}

        {/* Liste des parties */}
        {!loading && !error && games.length > 0 && (
          <>
            <motion.p
              variants={fadeUpChild}
              className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mt-12 mb-6 pb-3 border-b border-white/10"
            >
              {games.length}{' '}
              <span className="serif-italic normal-case tracking-normal text-text-secondary">
                partie{games.length > 1 ? 's' : ''} jouée{games.length > 1 ? 's' : ''}
              </span>
            </motion.p>

            <ul className="space-y-3">
              {games.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} />
              ))}
            </ul>

            {/* Bouton load more */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="editorial-link group cursor-pointer font-display font-medium text-lg text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <span>
                    {loadingMore ? 'Chargement…' : 'Voir plus'}
                  </span>
                  <span className="arrow text-accent-purple text-2xl leading-none">↓</span>
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.main>
  )
}

/* ============================================================ */
/* SOUS-COMPOSANTS                                               */
/* ============================================================ */

function CenteredMessage({ text, isError }) {
  return (
    <motion.p
      variants={fadeUpChild}
      className={`
        mt-12 text-center text-base
        ${isError ? 'text-accent-pink' : 'text-text-secondary'}
      `}
    >
      <span className="serif-italic">
        {isError ? 'erreur — ' : ''}
      </span>
      {text}
    </motion.p>
  )
}

/* ----- Carte d'une partie : header + détail au clic ----- */
function GameCard({ game, index }) {
  const [expanded, setExpanded] = useState(false)
  const modeConf = MODE_LABELS[game.mode] || {
    label: game.mode,
    accent: 'text-text-secondary',
  }

  const playedDate = toDate(game.playedAt)
  const dateStr = playedDate
    ? playedDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const host = game.players?.find((p) => p.isHost) || game.players?.[0]
  const userScore = host?.score || 0
  const userWon = game.winner === host?.name
  const durationMin = Math.floor((game.duration || 0) / 60)
  const durationSec = (game.duration || 0) % 60

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.5) }}
      layout
      className="bg-bg-card/60 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 sm:p-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-2">
              <span className={`serif-italic ${modeConf.accent} text-sm`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
                {dateStr}
              </p>
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl text-text-primary leading-tight">
              {modeConf.label}{' '}
              <span className="serif-italic text-text-tertiary text-base">
                — {game.rounds} manches
              </span>
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Gagnant :{' '}
              <span
                className={`font-medium ${userWon ? 'text-accent-green' : 'text-text-primary'}`}
              >
                {game.winner}
                {userWon && (
                  <span className="ml-2 serif-italic text-accent-green text-xs">
                    toi
                  </span>
                )}
              </span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-1">
              Ton score
            </p>
            <p
              className={`font-display font-bold text-3xl sm:text-4xl tabular-nums leading-none ${
                userWon ? 'text-accent-green' : 'text-text-primary'
              }`}
            >
              {userScore}
            </p>
          </div>
        </div>
      </button>

      {/* Bloc détail (expand au clic) */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-white/5 px-5 sm:px-6 pb-5 sm:pb-6 pt-5"
        >
          {/* Métadonnées de la partie */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Detail label="Durée" value={`${durationMin}m ${durationSec}s`} />
            <Detail
              label="Joueurs"
              value={game.players?.length || 0}
            />
            {game.modeParams?.genre && (
              <Detail label="Genre" value={game.modeParams.genre} />
            )}
            {game.modeParams?.language && game.modeParams.language !== 'all' && (
              <Detail
                label="Langue"
                value={game.modeParams.language === 'fr' ? 'Français' : 'Anglais'}
              />
            )}
            {game.modeParams?.artists && game.modeParams.artists.length > 0 && (
              <Detail
                label={
                  game.modeParams.artists.length > 1 ? 'Artistes' : 'Artiste'
                }
                value={game.modeParams.artists.join(', ')}
              />
            )}
          </div>

          {/* Tableau scores complet */}
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
            Tableau des{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              scores
            </span>
          </p>
          <ul className="divide-y divide-white/5">
            {[...(game.players || [])]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="serif-italic text-text-tertiary text-sm w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium">{p.name}</span>
                    {p.isHost && (
                      <span className="serif-italic text-accent-purple text-xs">
                        toi
                      </span>
                    )}
                  </span>
                  <span className="font-display font-bold text-xl tabular-nums">
                    {p.score}
                  </span>
                </li>
              ))}
          </ul>
        </motion.div>
      )}
    </motion.li>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
        {label}
      </p>
      <p className="font-medium text-sm text-text-primary truncate" title={String(value)}>
        {value}
      </p>
    </div>
  )
}
