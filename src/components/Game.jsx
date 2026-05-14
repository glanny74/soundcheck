import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { saveGame } from '../firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import {
  getArtistTopTracks,
  getMultiArtistsTracks,
  getRandomTracks,
  getTracksByGenre,
} from '../services/deezerApi'
import { buildQuestion, formatLabel } from '../utils/gameLogic'
import { EASE_OUT, pageTransition } from '../utils/motion'
import { playCorrect, playTick, playWrong } from '../utils/sounds'
import Button from './ui/Button'

/*
  Écran Game V3 — flux inversé "réponse d'abord, puis joueur".
  ===========================================================================
  Changement majeur par rapport à la V2 : on supprime la mécanique de buzz
  (clavier 1-5 pendant l'audio). Désormais :

    1) phase "playing"     : l'audio joue, les 4 propositions sont
                             cliquables. N'importe qui peut tap.
    2) phase "attributing" : on demande "qui a donné cette réponse ?"
                             en présentant des grosses cartes joueurs
                             cliquables (tactile-friendly).
    3) phase "reveal"      : on évalue (bonne/mauvaise), on attribue les
                             points, on affiche la pochette + titre.

  Pourquoi : c'est naturellement adapté au mobile (pas besoin de clavier
  physique) et évite la course au buzz qui est parfois injuste. On garde
  les touches clavier en bonus pour desktop :
    - phase "playing"     : 1-4 = choisir la proposition correspondante
    - phase "attributing" : 1-5 = sélectionner le joueur correspondant
*/

const SAMPLE_DURATION_MS = 8000
const QUESTION_TIME_MS = 15000
const QUESTION_TIME_S = QUESTION_TIME_MS / 1000
const POINTS_PER_CORRECT = 10
const BAR_COUNT = 7

export default function Game({ players, config, onFinish }) {
  // user/profile : utilisé en fin de partie pour sauvegarder en Firestore.
  // Si non connecté (invité) → on bypass simplement la sauvegarde.
  const { user, profile } = useAuth()

  // ---------------- état principal ----------------
  const [phase, setPhase] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const [pool, setPool] = useState([])
  const [usedIds, setUsedIds] = useState([])

  const [roundIndex, setRoundIndex] = useState(0)
  const [question, setQuestion] = useState(null)

  const [scoreboard, setScoreboard] = useState(players)

  // Nouvelle logique : on stocke la réponse cliquée et le joueur attribué
  const [selectedAnswer, setSelectedAnswer] = useState(null) // track
  const [attributedPlayer, setAttributedPlayer] = useState(null) // player

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_S)
  const [lastResult, setLastResult] = useState(null) // 'correct' | 'wrong' | 'timeout'

  // ---------------- refs ----------------
  const audioRef = useRef(null)
  const sampleTimerRef = useRef(null)
  const questionTimerRef = useRef(null)
  const tickTimerRef = useRef(null)

  // Timestamp de démarrage de la partie — utilisé pour calculer la durée
  // en fin de partie (pour les stats Firestore).
  const startTimeRef = useRef(Date.now())

  // -------------------------------------------------------------------------
  // 1) Chargement du pool de titres au montage
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function loadPool() {
      try {
        let tracks = []
        if (config.mode === 'artist') {
          tracks = await getArtistTopTracks(config.artists[0].id)
        } else if (config.mode === 'multi') {
          tracks = await getMultiArtistsTracks(config.artists.map((a) => a.id))
        } else if (config.mode === 'genre') {
          tracks = await getTracksByGenre(config.genre, config.language)
        } else if (config.mode === 'random') {
          tracks = await getRandomTracks()
        }

        const uniqueById = Array.from(
          new Map(tracks.map((t) => [t.id, t])).values()
        )

        if (cancelled) return

        if (uniqueById.length < 4) {
          setErrorMsg(
            'Pas assez de titres trouvés pour générer une partie. Essaie un autre artiste ou genre.'
          )
          setPhase('error')
          return
        }

        setPool(uniqueById)
        setPhase('ready')
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setErrorMsg('Impossible de contacter Deezer. Vérifie ta connexion.')
          setPhase('error')
        }
      }
    }

    loadPool()
    return () => {
      cancelled = true
    }
  }, [config])

  // -------------------------------------------------------------------------
  // 2) Génération de la question dès qu'on entre en phase "ready"
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'ready' || pool.length === 0) return
    const q = buildQuestion(pool, usedIds)
    if (!q) {
      finishGame(scoreboard)
      return
    }
    setQuestion(q)
    setSelectedAnswer(null)
    setAttributedPlayer(null)
    setTimeLeft(QUESTION_TIME_S)
    setLastResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool])

  // -------------------------------------------------------------------------
  // 3) Gestion clavier — touches 1-4 (réponse) en playing, 1-5 (joueur) en
  //    attributing. Bonus pour desktop, pas nécessaire en mobile.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'attributing') return

    function handleKeyDown(e) {
      const num = parseInt(e.key, 10)
      if (Number.isNaN(num)) return

      if (phase === 'playing') {
        // 1-4 = choisir la proposition
        if (num < 1 || num > 4) return
        const choice = question?.choices?.[num - 1]
        if (choice) handleAnswerSelect(choice)
      } else if (phase === 'attributing') {
        // 1-N = sélectionner le joueur
        if (num < 1 || num > players.length) return
        const player = players[num - 1]
        if (player) handlePlayerAttribute(player)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question, players])

  // -------------------------------------------------------------------------
  // 4) Tick du chrono UNIQUEMENT pendant la phase playing.
  //    Dès qu'on tap une réponse (passage en "attributing"), le tick s'arrête
  //    et l'utilisateur peut sélectionner le joueur tranquillement, sans pression.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing') return

    tickTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - 1)
        if (next > 0) playTick(next <= 5)
        return next
      })
    }, 1000)

    return () => clearInterval(tickTimerRef.current)
  }, [phase])

  // -------------------------------------------------------------------------
  // 5) Cleanup au démontage
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      clearTimeout(sampleTimerRef.current)
      clearTimeout(questionTimerRef.current)
      clearInterval(tickTimerRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  // =========================================================================
  // ACTIONS
  // =========================================================================

  function startSample() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch((err) => console.warn('Lecture audio refusée :', err))

    setPhase('playing')

    sampleTimerRef.current = setTimeout(() => {
      if (audio) audio.pause()
    }, SAMPLE_DURATION_MS)

    questionTimerRef.current = setTimeout(() => {
      handleTimeout()
    }, QUESTION_TIME_MS)
  }

  function clearAllTimers() {
    clearTimeout(sampleTimerRef.current)
    clearTimeout(questionTimerRef.current)
    clearInterval(tickTimerRef.current)
  }

  // Phase 1 → 2 : on a cliqué sur une proposition. On stoppe l'audio,
  // on stoppe AUSSI le compte à rebours global (15s) pour ne plus mettre
  // de pression pendant la sélection du joueur.
  function handleAnswerSelect(track) {
    if (phase !== 'playing' || !track) return
    if (audioRef.current) audioRef.current.pause()
    clearTimeout(sampleTimerRef.current)
    clearTimeout(questionTimerRef.current)
    clearInterval(tickTimerRef.current)
    setSelectedAnswer(track)
    setPhase('attributing')
  }

  // Phase 2 → 3 : on a sélectionné le joueur. On évalue maintenant :
  //   - si selectedAnswer == bonne réponse, ce joueur gagne +10 pts
  //   - sinon, lastResult = 'wrong' (0 point)
  function handlePlayerAttribute(player) {
    if (phase !== 'attributing' || !selectedAnswer || !question) return

    const isCorrect = selectedAnswer.id === question.correct.id
    setAttributedPlayer(player)

    if (isCorrect) {
      setScoreboard((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, score: p.score + POINTS_PER_CORRECT }
            : p
        )
      )
      setLastResult('correct')
      playCorrect()
    } else {
      setLastResult('wrong')
      playWrong()
    }

    revealQuestion()
  }

  function handleTimeout() {
    if (phase === 'reveal') return // déjà passé en reveal
    setLastResult('timeout')
    playWrong()
    revealQuestion()
  }

  function revealQuestion() {
    clearAllTimers()
    if (audioRef.current) audioRef.current.pause()
    if (question) {
      setUsedIds((prev) => [...prev, question.correct.id])
    }
    setPhase('reveal')
  }

  function advanceToNext() {
    const next = roundIndex + 1
    if (next >= config.totalRounds) {
      finishGame(undefined)
    } else {
      setRoundIndex(next)
      setPhase('ready')
    }
  }

  // Fin de partie : on calcule la durée, on détermine le gagnant, et si
  // l'utilisateur est connecté, on sauvegarde la partie en Firestore avant
  // de remonter à App pour aller à Results. La sauvegarde est non-bloquante :
  // si elle échoue (réseau, règles Firestore...), on continue quand même.
  async function finishGame(maybeBoard) {
    setPhase('finished')

    const finalPlayers = maybeBoard ?? scoreboard
    const ranked = [...finalPlayers].sort((a, b) => b.score - a.score)
    const winner = ranked[0]?.name || ''
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)

    // Sauvegarde Firestore — uniquement si l'utilisateur est connecté
    // (les invités ne sauvegardent rien, conformément au brief)
    if (user && profile) {
      try {
        await saveGame({
          userId: user.uid,
          username: profile.username,
          photoURL: profile.photoURL,
          mode: config.mode,
          modeParams: {
            // On stocke uniquement les noms (pas les objets complets)
            // pour rester léger et indépendant du format Deezer
            artists: config.artists?.map((a) => a.name) || null,
            genre: config.genre || null,
            language: config.language || null,
          },
          rounds: config.totalRounds,
          players: finalPlayers.map((p, i) => ({
            name: p.name,
            score: p.score,
            // Convention : le premier joueur saisi est considéré comme
            // l'hôte (= le user connecté). Ses stats grimpent dans son profil.
            isHost: i === 0,
          })),
          winner,
          duration,
        })
      } catch (err) {
        // On loggue mais on ne bloque pas le flow — le joueur va voir Results
        console.warn('Échec de la sauvegarde de la partie :', err)
      }
    }

    setTimeout(() => onFinish(finalPlayers), 50)
  }

  // =========================================================================
  // RENDU
  // =========================================================================

  if (phase === 'loading') {
    return <CenteredMessage title="Chargement" subtitle="On prépare ta playlist." />
  }
  if (phase === 'error') {
    return (
      <CenteredMessage
        title="Oups."
        subtitle={errorMsg}
        action={
          <Button variant="secondary" onClick={() => onFinish(scoreboard)}>
            Retour
          </Button>
        }
      />
    )
  }

  if (!question) return null

  const cover =
    question.correct.album?.cover_xl ||
    question.correct.album?.cover_big ||
    question.correct.album?.cover_medium
  const isLastRound = roundIndex + 1 >= config.totalRounds
  const timerDanger = timeLeft <= 5

  return (
    <motion.main
      key="game"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden"
    >
      {/* IMPORTANT : pas de crossOrigin sur l'audio Deezer — leurs MP3 preview
          ne renvoient pas les bons en-têtes CORS et l'audio se bloque sinon.
          Conséquence : le vrai visualiseur AnalyserNode ne marche pas, on
          a remplacé par des barres animées CSS purement décoratives. */}
      <audio ref={audioRef} src={question.correct.preview} preload="auto" />

      {/* === Backdrop pochette floutée === */}
      <AnimatePresence mode="wait">
        <motion.div
          key={cover}
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 0.35, scale: 1.3 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) saturate(1.2)',
          }}
          aria-hidden="true"
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-bg-primary/40" aria-hidden="true" />

      {/* === Header editorial === */}
      <header className="relative z-10 flex items-start justify-between gap-4 px-4 sm:px-10 pt-6 sm:pt-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
            Manche
          </p>
          <p className="font-display font-bold text-3xl sm:text-5xl leading-none mt-2 tabular-nums">
            <span className="text-text-primary">{String(roundIndex + 1).padStart(2, '0')}</span>
            <span className="serif-italic text-text-tertiary text-xl sm:text-3xl mx-2">/</span>
            <span className="text-text-tertiary">{String(config.totalRounds).padStart(2, '0')}</span>
          </p>
        </div>

        <p className="text-right text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
          SoundCheck
          <br />
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            blind test
          </span>
        </p>
      </header>

      {/* === Zone principale : grille 12 cols asymétrique === */}
      <div className="relative z-10 px-4 sm:px-10 mt-6 sm:mt-8 grid grid-cols-12 gap-4 sm:gap-6 pb-12">
        {/* Colonne centrale (9 cols desktop, 12 mobile) */}
        <section className="col-span-12 lg:col-span-9 order-2 lg:order-1">
          {/* Timer circulaire SVG centré */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <CircularTimer
              seconds={timeLeft}
              total={QUESTION_TIME_S}
              danger={timerDanger}
              showVisualizer={phase === 'playing'}
            />
          </div>

          {/* Zone centrale variable */}
          <div className="min-h-[180px] sm:min-h-[220px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === 'ready' && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                  className="flex flex-col items-center"
                >
                  <PlayButton onClick={startSample} />
                  <p className="mt-6 text-xs uppercase tracking-[0.3em] text-text-tertiary">
                    Tap to play
                  </p>
                </motion.div>
              )}

              {phase === 'playing' && (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="text-center"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
                    À l'écoute
                  </p>
                  <p className="font-display font-bold text-2xl sm:text-4xl px-2">
                    Tape la bonne{' '}
                    <span className="serif-italic text-text-secondary">
                      proposition
                    </span>
                    .
                  </p>
                </motion.div>
              )}

              {phase === 'attributing' && selectedAnswer && (
                <motion.div
                  key="attributing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="text-center"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-accent-purple mb-3">
                    Réponse choisie
                  </p>
                  <p className="font-display font-bold text-xl sm:text-2xl px-2">
                    {selectedAnswer.title}
                    <span className="serif-italic text-text-tertiary">
                      {' '}
                      — {selectedAnswer.artist.name}
                    </span>
                  </p>
                  <p className="mt-4 text-sm sm:text-base text-text-secondary">
                    Qui a{' '}
                    <span className="serif-italic text-text-primary">
                      donné
                    </span>{' '}
                    cette réponse ?
                  </p>
                </motion.div>
              )}

              {phase === 'reveal' && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                  className="w-full"
                >
                  <RevealLayout
                    track={question.correct}
                    result={lastResult}
                    attributedPlayer={attributedPlayer}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* === Boutons QCM === (phase playing uniquement) */}
          {phase === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-10"
            >
              {question.choices.map((track, i) => (
                <ChoiceCard
                  key={track.id + '-' + i}
                  index={i + 1}
                  track={track}
                  onClick={() => handleAnswerSelect(track)}
                />
              ))}
            </motion.div>
          )}

          {/* === Cartes joueurs === (phase attributing uniquement) */}
          {phase === 'attributing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="mt-8 sm:mt-10"
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 text-center">
                Tape sur le{' '}
                <span className="serif-italic normal-case tracking-normal text-text-secondary">
                  joueur
                </span>
              </p>
              <div
                className={`
                  grid gap-3
                  ${players.length <= 2 ? 'grid-cols-2' : ''}
                  ${players.length === 3 ? 'grid-cols-3' : ''}
                  ${players.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : ''}
                  ${players.length === 5 ? 'grid-cols-2 sm:grid-cols-5' : ''}
                `}
              >
                {players.map((p, i) => (
                  <PlayerAttributeCard
                    key={p.id}
                    index={i + 1}
                    player={p}
                    onClick={() => handlePlayerAttribute(p)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* === Bouton manche suivante (phase reveal) === */}
          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-10 flex justify-center sm:justify-end"
            >
              <button
                onClick={advanceToNext}
                className="editorial-link group cursor-pointer font-display font-medium text-xl sm:text-2xl text-text-primary"
              >
                <span>{isLastRound ? 'Voir les résultats' : 'Manche suivante'}</span>
                <span className="arrow text-accent-green text-2xl sm:text-3xl leading-none">→</span>
              </button>
            </motion.div>
          )}
        </section>

        {/* Colonne droite : scoreboard (en haut sur mobile, à droite desktop) */}
        <aside className="col-span-12 lg:col-span-3 order-1 lg:order-2">
          <Scoreboard players={scoreboard} attributedId={attributedPlayer?.id} />
        </aside>
      </div>
    </motion.main>
  )
}

/* ============================================================ */
/* SOUS-COMPOSANTS                                               */
/* ============================================================ */

function CenteredMessage({ title, subtitle, action }) {
  return (
    <motion.main
      key="loading"
      {...pageTransition}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
        SoundCheck
      </p>
      <h2 className="font-display font-bold text-5xl mb-3 tracking-tight">
        {title}
        <span className="serif-italic text-accent-purple">.</span>
      </h2>
      <p className="text-text-secondary max-w-md mb-6">{subtitle}</p>
      {action}
    </motion.main>
  )
}

/* ----- Timer circulaire SVG + visualiseur décoratif centré -----
    Note : le visualiseur n'est plus "réactif" au son (Deezer ne sert pas
    les bons headers CORS sur les MP3 preview, ce qui empêche createMediaElementSource).
    On utilise une animation CSS qui simule un visualizer. C'est purement décoratif. */
function CircularTimer({ seconds, total, danger, showVisualizer }) {
  const R = 84
  const C = 2 * Math.PI * R
  const offset = C * (1 - seconds / total)
  const color = danger ? 'var(--color-accent-pink)' : 'var(--color-accent-green)'

  return (
    <div className="relative w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {showVisualizer ? (
          <div className="flex items-end gap-1 sm:gap-1.5 h-14 sm:h-16">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <span
                key={i}
                className="bar-visualizer w-1 sm:w-[5px] bg-accent-green rounded-sm"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        ) : (
          <span
            className={`
              font-display font-bold text-5xl sm:text-6xl tabular-nums leading-none
              ${danger ? 'text-accent-pink' : 'text-text-primary'}
            `}
          >
            {seconds}
          </span>
        )}
      </div>
    </div>
  )
}

/* ----- Gros disque play central ----- */
function PlayButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-accent-green text-black
                 flex items-center justify-center cursor-pointer
                 hover:scale-105 hover:bg-accent-green-hover transition-all duration-300
                 shadow-2xl shadow-accent-green/40
                 animate-pulse-glow"
      aria-label="Lancer l'extrait"
    >
      <span
        className="ml-2 sm:ml-3 block w-0 h-0
                   border-t-[22px] sm:border-t-[26px] border-t-transparent
                   border-b-[22px] sm:border-b-[26px] border-b-transparent
                   border-l-[34px] sm:border-l-[40px] border-l-black"
      />
    </button>
  )
}

/* ----- Layout de révélation : split pochette + titre + joueur ----- */
function RevealLayout({ track, result, attributedPlayer }) {
  const headlines = {
    correct: {
      label: 'Bonne réponse',
      color: 'text-accent-green',
      italicEnding: 'bravo.',
    },
    wrong: {
      label: 'Mauvaise réponse',
      color: 'text-accent-pink',
      italicEnding: 'dommage.',
    },
    timeout: {
      label: 'Temps écoulé',
      color: 'text-accent-pink',
      italicEnding: 'trop tard.',
    },
  }
  const h = headlines[result] || headlines.timeout
  const cover = track.album?.cover_big || track.album?.cover_medium

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center">
      <motion.img
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        src={cover}
        alt=""
        className="col-span-1 sm:col-span-5 w-40 sm:w-full max-w-[220px] aspect-square rounded-xl object-cover shadow-2xl mx-auto sm:mx-0"
      />
      <div className="col-span-1 sm:col-span-7 text-center sm:text-left">
        <p className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${h.color}`}>
          {h.label}{' '}
          <span className="serif-italic normal-case tracking-normal">
            {h.italicEnding}
          </span>
        </p>
        <p className="font-display font-bold text-3xl sm:text-5xl leading-[0.95] tracking-tight break-words">
          {track.title}
        </p>
        <p className="mt-2 sm:mt-3 text-base sm:text-lg text-text-secondary">
          <span className="serif-italic">par</span> {track.artist.name}
        </p>
        {attributedPlayer && result !== 'timeout' && (
          <p className="mt-4 text-sm text-text-tertiary">
            <span className="serif-italic">attribuée à</span>{' '}
            <span className="font-medium text-text-primary">
              {attributedPlayer.name}
            </span>
            {result === 'correct' && (
              <span className="ml-2 text-accent-green font-semibold">
                +10
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/* ----- Carte QCM editorial : numéro Instrument Serif en fond + titre + artiste ----- */
function ChoiceCard({ index, track, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        group relative overflow-hidden text-left
        p-5 sm:p-6 rounded-2xl border transition-all duration-300
        bg-bg-card border-white/10 hover:border-accent-green hover:bg-bg-card/80
        cursor-pointer hover:scale-[1.02] active:scale-[0.98]
        min-h-[88px]
      "
    >
      <span
        className="absolute -right-4 -bottom-12 serif-italic text-[140px] leading-none text-white/[0.04] group-hover:text-accent-green/10 transition-colors pointer-events-none"
        aria-hidden="true"
      >
        {String(index).padStart(2, '0')}
      </span>

      <p className="relative text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-2">
        Proposition{' '}
        <span className="serif-italic normal-case tracking-normal">
          n°{index}
        </span>
      </p>
      <p className="relative font-display font-semibold text-base sm:text-lg text-text-primary leading-tight break-words">
        {track.title}
      </p>
      <p className="relative text-sm text-text-secondary mt-1 truncate">
        {track.artist.name}
      </p>
    </button>
  )
}

/* ----- Carte joueur (phase attribution) — grande, tactile-friendly ----- */
function PlayerAttributeCard({ index, player, onClick }) {
  // Couleur d'accent assignée selon l'index pour différencier visuellement les joueurs
  const accents = [
    'text-accent-green',
    'text-accent-purple',
    'text-accent-pink',
    'text-accent-blue',
    'text-accent-green',
  ]
  const accent = accents[index - 1]

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="
        group relative overflow-hidden text-center
        p-4 sm:p-6 rounded-2xl border border-white/10
        bg-bg-card hover:bg-bg-elevated
        transition-colors duration-200 cursor-pointer
        min-h-[100px] sm:min-h-[140px]
        flex flex-col items-center justify-center gap-2
      "
    >
      <span
        className={`absolute -bottom-6 -right-4 serif-italic ${accent} opacity-20 text-[90px] sm:text-[120px] leading-none pointer-events-none`}
        aria-hidden="true"
      >
        {String(index).padStart(2, '0')}
      </span>

      <span className={`serif-italic ${accent} text-sm`}>
        P.{String(index).padStart(2, '0')}
      </span>
      <span className="relative font-display font-bold text-lg sm:text-2xl text-text-primary leading-tight break-words px-1">
        {player.name}
      </span>
    </motion.button>
  )
}

/* ----- Scoreboard editorial (lecture seule maintenant — plus de buzz) ----- */
function Scoreboard({ players, attributedId }) {
  return (
    <div className="lg:sticky lg:top-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3 sm:mb-4 border-b border-white/10 pb-3">
        Tableau{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          des scores
        </span>
      </p>

      <ul className="space-y-1">
        {players.map((p, i) => {
          const highlighted = p.id === attributedId
          return (
            <li
              key={p.id}
              className={`
                grid grid-cols-[auto_1fr_auto] items-baseline gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-300
                ${
                  highlighted
                    ? 'bg-accent-green/15 border border-accent-green/50'
                    : 'hover:bg-white/[0.03]'
                }
              `}
            >
              <span className="serif-italic text-accent-purple text-sm">
                P.{String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-medium truncate">{p.name}</span>
              <span className="font-display font-bold text-lg sm:text-xl tabular-nums">
                <AnimatedNumber value={p.score} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ----- Nombre qui s'anime en count-up ----- */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (display === value) return
    const start = display
    const diff = value - start
    const duration = 700
    const t0 = performance.now()
    let rafId

    function frame(now) {
      const elapsed = now - t0
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(start + diff * eased))
      if (t < 1) rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <>{display}</>
}
