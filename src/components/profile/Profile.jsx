import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { toDate } from '../../supabase/db'
import {
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../../utils/motion'

/*
  Écran Profile — fiche utilisateur editorial.
  ---------------------------------------------------------------------------
  Affiche :
   - Avatar (photo Google ou initiale dans un cercle gradient)
   - Pseudo en gros, email en sous-titre
   - 4 cartes de stats : parties jouées / score total / victoires / taux victoire
   - Métadonnées : date de création, provider (email ou Google)

  Pas accessible en mode invité (l'utilisateur arrive ici via le menu, qui
  n'affiche pas cette entrée pour les invités).
*/

export default function Profile({ onBack, onStart }) {
  const { user, profile } = useAuth()

  // Si jamais on arrive ici sans user (bug), on évite le crash
  if (!user || !profile) {
    return (
      <motion.main
        {...pageTransition}
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      >
        <p className="text-text-secondary mb-4">Profil indisponible.</p>
        <button onClick={onBack} className="text-accent-green underline">
          Retour
        </button>
      </motion.main>
    )
  }

  const displayName = profile.username || user.displayName || 'Joueur'
  const initial = displayName.charAt(0).toUpperCase()
  const photoURL = profile.photoURL || user.photoURL
  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0
  const createdAt = toDate(profile.createdAt)

  return (
    <motion.main
      key="profile"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-10"
    >
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent-green/15 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-5xl mx-auto"
      >
        <button
          onClick={onBack}
          className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm mb-8"
        >
          <span className="arrow text-accent-green text-xl leading-none rotate-180 inline-block">
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
            fiche personnelle
          </span>
        </motion.p>

        <motion.h1
          variants={fadeUpChild}
          className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                     text-[52px] sm:text-[96px] lg:text-[120px]"
        >
          <span className="block text-text-primary">Mon</span>
          <span className="block serif-italic text-accent-green ml-[8%]">
            profil.
          </span>
        </motion.h1>

        {/* Bloc identité — avatar + nom */}
        <motion.div
          variants={fadeUpChild}
          className="mt-12 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-10"
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt=""
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full
                         bg-gradient-to-br from-accent-green to-accent-purple
                         flex items-center justify-center
                         shadow-2xl shadow-accent-green/20"
            >
              <span className="font-display font-extrabold text-6xl text-black/70">
                {initial}
              </span>
            </div>
          )}

          <div className="text-center sm:text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-2">
              Pseudo
            </p>
            <p className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
              {displayName}
            </p>
            <p className="text-text-secondary mt-1 text-sm">
              <span className="serif-italic">via</span> {user.email}
            </p>
          </div>
        </motion.div>

        {/* Empty state — affiché uniquement si l'utilisateur n'a encore joué
            aucune partie. Le bloc des cartes de stats reste visible en
            dessous mais l'empty state explique pourquoi elles sont à zéro
            et propose un CTA direct pour lancer une partie. */}
        {(profile.gamesPlayed || 0) === 0 && (
          <motion.div
            variants={fadeUpChild}
            className="mt-12 p-6 sm:p-8 bg-bg-card/60 border border-white/5 rounded-2xl"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
              Première partie{' '}
              <span className="serif-italic normal-case tracking-normal text-accent-green">
                à venir
              </span>
            </p>
            <p className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-3 leading-tight">
              Pas encore de stats —{' '}
              <span className="serif-italic text-text-tertiary">c'est normal.</span>
            </p>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-lg mb-6">
              Tes parties jouées, scores et victoires viendront se loger dans
              les cartes ci-dessous dès que tu auras lancé ta première manche.
            </p>
            {onStart && (
              <button
                onClick={onStart}
                className="editorial-link group cursor-pointer font-display font-medium text-base sm:text-lg text-text-primary"
              >
                <span>Démarrer ma première partie</span>
                <span className="arrow text-accent-green text-xl leading-none">→</span>
              </button>
            )}
          </motion.div>
        )}

        {/* Cartes de stats */}
        <motion.div
          variants={fadeUpChild}
          className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            number="01"
            label="Parties jouées"
            value={profile.gamesPlayed || 0}
            accent="text-accent-green"
          />
          <StatCard
            number="02"
            label="Score total"
            value={profile.totalScore || 0}
            accent="text-accent-purple"
          />
          <StatCard
            number="03"
            label="Victoires"
            value={profile.gamesWon || 0}
            accent="text-accent-pink"
          />
          <StatCard
            number="04"
            label="Taux de victoire"
            value={`${winRate}%`}
            accent="text-accent-blue"
          />
        </motion.div>

        {/* Métadonnées */}
        <motion.div
          variants={fadeUpChild}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
        >
          <Meta
            label="Inscrit depuis"
            value={
              createdAt
                ? createdAt.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'
            }
          />
          <Meta
            label="Méthode d'inscription"
            value={profile.provider === 'google' ? 'Compte Google' : 'Email'}
          />
        </motion.div>
      </motion.div>
    </motion.main>
  )
}

function StatCard({ number, label, value, accent }) {
  return (
    <div className="bg-bg-card/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
      <p className={`serif-italic ${accent} text-2xl mb-3`}>{number}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-2">
        {label}
      </p>
      <p className="font-display font-bold text-3xl tabular-nums">{value}</p>
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div className="border-t border-white/10 pt-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-1">
        {label}
      </p>
      <p className="font-display font-semibold text-base">{value}</p>
    </div>
  )
}
