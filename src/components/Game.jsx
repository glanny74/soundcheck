import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
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
  Écran Game V2 — refonte editorial magazine.
  ===========================================================================
  Ambiance immersive : pochette de l'album en cours, floutée massivement en
  arrière-plan (blur + scale). Chaque manche a donc sa propre ambiance
  visuelle, comme une couverture qui change.

  Composants visuels clés :
   - Header editorial (label MANCHE + signature SoundCheck)
   - Timer circulaire SVG (stroke-dashoffset animé)
   - Visualiseur audio en barres (Web Audio API + AnalyserNode — pas du fake)
   - Layout central qui change selon la phase
   - 4 cartes QCM avec numéro Instrument Serif en fond
   - Scoreboard "fiche editorial" avec count-up sur les scores

  La logique fonctionnelle (phases, timers, buzz, scores) est strictement
  identique à la V1 — c'est uniquement le rendu qui change.
*/

const SAMPLE_DURATION_MS = 8000
const QUESTION_TIME_MS = 15000
const QUESTION_TIME_S = QUESTION_TIME_MS / 1000
const POINTS_PER_CORRECT = 10

// 7 barres pour le visualiseur audio
const BAR_COUNT = 7

export default function Game({ players, config, onFinish }) {
  // ---------------- état principal ----------------
  const [phase, setPhase] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const [pool, setPool] = useState([])
  const [usedIds, setUsedIds] = useState([])

  const [roundIndex, setRoundIndex] = useState(0)
  const [question, setQuestion] = useState(null)

  const [scoreboard, setScoreboard] = useState(players)
  const [activePlayerIds, setActivePlayerIds] = useState(
    players.map((p) => p.id)
  )
  const [buzzedPlayer, setBuzzedPlayer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_S)
  const [lastResult, setLastResult] = useState(null)

  // Barres du visualiseur audio — values entre 0 et 1
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(0.05))

  // ---------------- refs ----------------
  const audioRef = useRef(null)
  const sampleTimerRef = useRef(null)
  const questionTimerRef = useRef(null)
  const tickTimerRef = useRef(null)

  // Visualiseur Web Audio API
  const visualizerRef = useRef({
    ctx: null,
    source: null,
    analyser: null,
    data: null,
  })

  // -------------------------------------------------------------------------
  // 1) Chargement du pool de titres au montage (en fonction du mode choisi)
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
    setActivePlayerIds(players.map((p) => p.id))
    setBuzzedPlayer(null)
    setTimeLeft(QUESTION_TIME_S)
    setLastResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool])

  // -------------------------------------------------------------------------
  // 3) Gestion des touches clavier (buzz) pendant la phase "playing"
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing') return

    function handleKeyDown(e) {
      const num = parseInt(e.key, 10)
      if (Number.isNaN(num) || num < 1 || num > players.length) return

      const player = players[num - 1]
      if (!player) return
      if (!activePlayerIds.includes(player.id)) return

      buzzIn(player)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activePlayerIds])

  // -------------------------------------------------------------------------
  // 4) Tick du timer de question (1 seconde toutes les secondes)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'answering') return

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
  // 5) Boucle d'animation du visualiseur audio (requestAnimationFrame)
  //    Lit les fréquences en temps réel pendant la phase "playing".
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing') return
    let rafId

    function frame() {
      const { analyser, data } = visualizerRef.current
      if (analyser && data) {
        analyser.getByteFrequencyData(data)
        // On regroupe les données en BAR_COUNT buckets équidistants
        const step = Math.floor(data.length / BAR_COUNT)
        const next = new Array(BAR_COUNT)
        for (let i = 0; i < BAR_COUNT; i++) {
          // On prend la valeur moyenne du bucket pour lisser
          let sum = 0
          for (let j = 0; j < step; j++) sum += data[i * step + j]
          next[i] = Math.max(0.05, sum / step / 255)
        }
        setBars(next)
      }
      rafId = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(rafId)
      setBars(new Array(BAR_COUNT).fill(0.05))
    }
  }, [phase])

  // -------------------------------------------------------------------------
  // 6) Cleanup global au démontage : audio + timers + Web Audio API
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      clearTimeout(sampleTimerRef.current)
      clearTimeout(questionTimerRef.current)
      clearInterval(tickTimerRef.current)
      if (audioRef.current) audioRef.current.pause()
      const { ctx } = visualizerRef.current
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
    }
  }, [])

  // =========================================================================
  // ACTIONS
  // =========================================================================

  // Initialise le contexte Web Audio + AnalyserNode au premier play.
  // On ne peut le faire qu'à ce moment (politique autoplay des navigateurs)
  // et on doit créer le MediaElementSource UNE seule fois par élément audio.
  function ensureAnalyserSetup() {
    if (visualizerRef.current.source) return
    if (!audioRef.current) return

    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      const source = ctx.createMediaElementSource(audioRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyser.connect(ctx.destination)

      visualizerRef.current = {
        ctx,
        source,
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount),
      }
    } catch (err) {
      console.warn('Visualiseur audio indisponible :', err)
    }
  }

  function startSample() {
    ensureAnalyserSetup()
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

  function buzzIn(player) {
    if (audioRef.current) audioRef.current.pause()
    setBuzzedPlayer(player)
    setPhase('answering')
  }

  function handleAnswer(track) {
    if (!buzzedPlayer || !question) return
    const isCorrect = track.id === question.correct.id

    if (isCorrect) {
      setScoreboard((prev) =>
        prev.map((p) =>
          p.id === buzzedPlayer.id
            ? { ...p, score: p.score + POINTS_PER_CORRECT }
            : p
        )
      )
      setLastResult('correct')
      playCorrect()
      revealQuestion()
    } else {
      const remaining = activePlayerIds.filter((id) => id !== buzzedPlayer.id)
      setActivePlayerIds(remaining)
      setBuzzedPlayer(null)

      if (remaining.length === 0) {
        setLastResult('wrong')
        playWrong()
        revealQuestion()
      } else {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {})
        }
        setPhase('playing')
      }
    }
  }

  function handleTimeout() {
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

  function finishGame(maybeBoard) {
    setPhase('finished')
    setTimeout(() => onFinish(maybeBoard ?? scoreboard), 50)
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

  // Couleur du timer : passe au rose quand il reste peu de temps
  const timerDanger = timeLeft <= 5

  return (
    <motion.main
      key="game"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden"
    >
      <audio ref={audioRef} src={question.correct.preview} preload="auto" crossOrigin="anonymous" />

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
      <header className="relative z-10 flex items-start justify-between gap-6 px-6 sm:px-10 pt-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
            Manche
          </p>
          <p className="font-display font-bold text-4xl sm:text-5xl leading-none mt-2 tabular-nums">
            <span className="text-text-primary">{String(roundIndex + 1).padStart(2, '0')}</span>
            <span className="serif-italic text-text-tertiary text-2xl sm:text-3xl mx-2">/</span>
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
      <div className="relative z-10 px-6 sm:px-10 mt-8 grid grid-cols-12 gap-6 pb-12">
        {/* Colonne centrale (9 cols desktop) */}
        <section className="col-span-12 lg:col-span-9">
          {/* Timer circulaire SVG centré */}
          <div className="flex justify-center mb-8">
            <CircularTimer
              seconds={timeLeft}
              total={QUESTION_TIME_S}
              danger={timerDanger}
              showVisualizer={phase === 'playing'}
              bars={bars}
            />
          </div>

          {/* Zone centrale variable */}
          <div className="min-h-[260px] flex items-center justify-center">
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
                  <p className="mt-6 text-sm uppercase tracking-[0.3em] text-text-tertiary">
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
                  <p className="font-display font-bold text-3xl sm:text-4xl">
                    Écoute{' '}
                    <span className="serif-italic text-text-secondary">
                      attentivement
                    </span>
                    .
                  </p>
                  <p className="mt-3 text-sm text-text-secondary">
                    Appuie sur ta touche dès que tu sais.
                  </p>
                </motion.div>
              )}

              {phase === 'answering' && buzzedPlayer && (
                <motion.div
                  key="answering"
                  initial={{ opacity: 0, scale: 1.3, filter: 'blur(20px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                  className="text-center"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
                    À toi de jouer
                  </p>
                  <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-[72px] sm:text-[120px] lg:text-[160px]">
                    <span className="bg-gradient-to-r from-accent-green via-accent-blue to-accent-purple bg-clip-text text-transparent">
                      {buzzedPlayer.name}
                    </span>
                  </p>
                  <p className="mt-4 text-sm text-text-secondary">
                    Clique sur la bonne proposition ci-dessous.
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
                  <RevealLayout track={question.correct} result={lastResult} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* === Boutons QCM === */}
          {(phase === 'playing' || phase === 'answering') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10"
            >
              {question.choices.map((track, i) => (
                <ChoiceCard
                  key={track.id + '-' + i}
                  index={i + 1}
                  track={track}
                  canClick={phase === 'answering'}
                  onClick={() => phase === 'answering' && handleAnswer(track)}
                />
              ))}
            </motion.div>
          )}

          {/* === Bouton manche suivante (phase reveal) === */}
          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-10 flex justify-end"
            >
              <button
                onClick={advanceToNext}
                className="editorial-link group cursor-pointer font-display font-medium text-2xl text-text-primary"
              >
                <span>{isLastRound ? 'Voir les résultats' : 'Manche suivante'}</span>
                <span className="arrow text-accent-green text-3xl leading-none">→</span>
              </button>
            </motion.div>
          )}
        </section>

        {/* Colonne droite : scoreboard */}
        <aside className="col-span-12 lg:col-span-3 order-first lg:order-last">
          <Scoreboard
            players={scoreboard}
            activeIds={activePlayerIds}
            buzzedId={buzzedPlayer?.id}
          />
        </aside>
      </div>
    </motion.main>
  )
}

/* ============================================================ */
/* ----- SOUS-COMPOSANTS ----- */
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

/* ----- Timer circulaire SVG + visualiseur centré ----- */
function CircularTimer({ seconds, total, danger, showVisualizer, bars }) {
  const R = 84
  const C = 2 * Math.PI * R
  const offset = C * (1 - seconds / total)
  const color = danger ? 'var(--color-accent-pink)' : 'var(--color-accent-green)'

  return (
    <div className="relative w-[200px] h-[200px]">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        {/* Cercle de fond */}
        <circle
          cx="100"
          cy="100"
          r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
          fill="none"
        />
        {/* Cercle progressif animé via stroke-dashoffset */}
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

      {/* Contenu central : visualiseur ou chiffre */}
      <div className="absolute inset-0 flex items-center justify-center">
        {showVisualizer ? (
          <div className="flex items-end gap-1.5 h-16">
            {bars.map((v, i) => (
              <span
                key={i}
                style={{
                  height: `${10 + v * 90}%`,
                  background: 'var(--color-accent-green)',
                  width: '5px',
                  borderRadius: '2px',
                  transition: 'height 80ms ease-out',
                }}
              />
            ))}
          </div>
        ) : (
          <span
            className={`
              font-display font-bold text-6xl tabular-nums leading-none
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
      className="w-44 h-44 rounded-full bg-accent-green text-black
                 flex items-center justify-center cursor-pointer
                 hover:scale-105 hover:bg-accent-green-hover transition-all duration-300
                 shadow-2xl shadow-accent-green/40
                 animate-pulse-glow"
      aria-label="Lancer l'extrait"
    >
      <span
        className="ml-3 block w-0 h-0
                   border-t-[26px] border-t-transparent
                   border-b-[26px] border-b-transparent
                   border-l-[40px] border-l-black"
      />
    </button>
  )
}

/* ----- Layout de révélation : split pochette + titre ----- */
function RevealLayout({ track, result }) {
  const headlines = {
    correct: {
      label: 'Bonne réponse',
      color: 'text-accent-green',
      italicEnding: 'bravo.',
    },
    wrong: {
      label: 'Personne',
      color: 'text-accent-pink',
      italicEnding: "n'a trouvé.",
    },
    timeout: {
      label: 'Temps écoulé',
      color: 'text-accent-pink',
      italicEnding: 'dommage.',
    },
  }
  const h = headlines[result] || headlines.timeout
  const cover = track.album?.cover_big || track.album?.cover_medium

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
      <motion.img
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        src={cover}
        alt=""
        className="col-span-1 sm:col-span-5 w-48 sm:w-full max-w-[220px] aspect-square rounded-xl object-cover shadow-2xl mx-auto sm:mx-0"
      />
      <div className="col-span-1 sm:col-span-7">
        <p className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${h.color}`}>
          {h.label}{' '}
          <span className="serif-italic normal-case tracking-normal">
            {h.italicEnding}
          </span>
        </p>
        <p className="font-display font-bold text-4xl sm:text-5xl leading-[0.95] tracking-tight">
          {track.title}
        </p>
        <p className="mt-3 text-lg text-text-secondary">
          <span className="serif-italic">par</span> {track.artist.name}
        </p>
      </div>
    </div>
  )
}

/* ----- Carte QCM editorial : numéro Instrument Serif en fond + titre + artiste ----- */
function ChoiceCard({ index, track, canClick, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={`
        group relative overflow-hidden text-left
        p-6 rounded-2xl border transition-all duration-300
        ${
          canClick
            ? 'bg-bg-card border-white/10 hover:border-accent-green hover:bg-bg-card/80 cursor-pointer hover:scale-[1.02]'
            : 'bg-bg-card/40 border-white/5 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Numéro en italique serif en fond, gros, transparent */}
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
      <p className="relative font-display font-semibold text-lg text-text-primary leading-tight">
        {track.title}
      </p>
      <p className="relative text-sm text-text-secondary mt-1">
        {track.artist.name}
      </p>
    </button>
  )
}

/* ----- Scoreboard editorial : style fiche magazine ----- */
function Scoreboard({ players, activeIds, buzzedId }) {
  return (
    <div className="lg:sticky lg:top-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 border-b border-white/10 pb-3">
        Tableau{' '}
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          des scores
        </span>
      </p>

      <ul className="space-y-1">
        {players.map((p, i) => {
          const isOut = !activeIds.includes(p.id)
          const isBuzzed = p.id === buzzedId
          return (
            <li
              key={p.id}
              className={`
                grid grid-cols-[auto_1fr_auto] items-baseline gap-3 px-3 py-3 rounded-lg
                transition-all duration-300
                ${
                  isBuzzed
                    ? 'bg-accent-green/15 border border-accent-green/50'
                    : isOut
                    ? 'opacity-40 line-through'
                    : 'hover:bg-white/[0.03]'
                }
              `}
            >
              <span className="serif-italic text-accent-purple text-sm">
                P.{String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-medium truncate">{p.name}</span>
              <span className="font-display font-bold text-xl tabular-nums">
                <AnimatedNumber value={p.score} />
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-text-tertiary leading-relaxed border-t border-white/10 pt-4">
        Tape ton numéro
        <br />
        <span className="serif-italic normal-case tracking-normal text-text-secondary">
          pour buzzer.
        </span>
      </p>
    </div>
  )
}

/* ----- Petit hook visuel : nombre qui s'anime en count-up ----- */
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
      // easeOutCubic
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
