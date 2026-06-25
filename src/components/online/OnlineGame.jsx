import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchPlayers,
  fetchRoom,
  leaveRoom,
  subscribeToRoom,
} from '../../realtime/roomService'
import {
  buildOnlineQuestions,
  startGame,
  getRound,
  submitAnswer,
  endRoundTimeout,
  getRoundResult,
  nextRound,
  replayGame,
  saveMyOnlineGame,
} from '../../realtime/onlineGameService'
import { playCorrect, playWrong, playTick } from '../../utils/sounds'
import { EASE_OUT, pageTransition } from '../../utils/motion'

/*
  OnlineGame — boucle de jeu EN LIGNE (chacun sur son écran).
  ---------------------------------------------------------------------------
  Tous les signaux live viennent de la table `rooms` (manche en cours, manche
  révélée, statut), lue en temps réel. Le scoring est tranché côté serveur.

  Lecture MANUELLE : à chaque manche, chaque joueur appuie sur « Lancer
  l'extrait » pour entendre (les navigateurs mobiles interdisent le son
  automatique). Le chrono démarre à ce moment-là. La manche se termine quand
  quelqu'un trouve (1er bon buzz, tranché serveur) ou quand le chrono de l'hôte
  arrive à zéro.

  Phases (déduites de l'état serveur) :
   - preparing : l'HÔTE construit les questions (Deezer) puis lance la partie
   - playing   : « Lancer l'extrait » → audio + 4 propositions ; on buzz
   - reveal    : bonne réponse + gagnant + scores ; l'hôte enchaîne
   - finished  : podium
*/

const SAMPLE_MS = 8000
const QUESTION_S = 15

export default function OnlineGame({ room: initialRoom, hostConfig, onExit, onBackToLobby }) {
  const { user } = useAuth()

  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(null) // { round_number, total, choices, audio }
  const [result, setResult] = useState(null) // reveal
  const [myAnswer, setMyAnswer] = useState(null) // null | 'pending' | 'correct' | 'wrong'
  const [hasPlayed, setHasPlayed] = useState(false) // ce joueur a lancé l'extrait
  const [armed, setArmed] = useState(false) // le son a été « activé » sur cet appareil
  const [timeLeft, setTimeLeft] = useState(QUESTION_S)
  const [prepError, setPrepError] = useState('')

  const isHost = user && room.host_id === user.id

  const audioRef = useRef(null)
  const sampleTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const preparedRef = useRef(false)
  const savedRef = useRef(false)
  const gameStartedRef = useRef(false) // a-t-on déjà vu la partie démarrer ?
  const sendPlayRef = useRef(null) // pour diffuser le signal « play » aux autres
  const onPlayRef = useRef(() => {}) // toujours pointé sur le handler le plus récent

  function clearTimers() {
    clearTimeout(sampleTimerRef.current)
    clearInterval(countdownRef.current)
  }

  // --- Abonnement live (room + joueurs) + sync initiale + préparation hôte ---
  useEffect(() => {
    fetchRoom(initialRoom.id).then((r) => r && setRoom(r)).catch(() => {})
    fetchPlayers(initialRoom.id).then(setPlayers).catch(() => {})

    const { unsubscribe, sendPlay } = subscribeToRoom(initialRoom.id, {
      onRoom: setRoom,
      onPlayers: setPlayers,
      // Un joueur a lancé l'extrait → on déclenche la lecture ici aussi.
      onPlay: (payload) => onPlayRef.current(payload),
    })
    sendPlayRef.current = sendPlay

    // Filet de sécurité : si un événement Realtime est manqué (mise en veille de
    // l'écran, réseau mobile instable…), on resynchronise l'état du salon. Comme
    // les effets ne se déclenchent que si les valeurs changent vraiment, ce poll
    // est sans effet quand tout est déjà à jour.
    const pollId = setInterval(() => {
      fetchRoom(initialRoom.id).then((r) => r && setRoom(r)).catch(() => {})
      fetchPlayers(initialRoom.id).then(setPlayers).catch(() => {})
    }, 4000)

    // L'hôte qui arrive avec une config construit les questions et lance.
    if (hostConfig && !preparedRef.current) {
      preparedRef.current = true
      ;(async () => {
        try {
          const questions = await buildOnlineQuestions(hostConfig)
          await startGame(initialRoom.id, hostConfig, questions)
        } catch (err) {
          setPrepError(err.message || 'Impossible de lancer la partie.')
        }
      })()
    }

    return () => {
      unsubscribe()
      clearInterval(pollId)
      clearTimers()
      if (audioRef.current) audioRef.current.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Réagit aux changements d'état du salon ---
  useEffect(() => {
    if (room.status === 'finished') {
      clearTimers()
      if (audioRef.current) audioRef.current.pause()
      if (!savedRef.current) {
        savedRef.current = true
        saveMyOnlineGame({ room, players, userId: user?.id })
      }
      return
    }

    // Retour en lobby APRÈS une partie = l'hôte a relancé (« Rejouer ») → on
    // ramène tout le monde dans le lobby (sans sortir du salon).
    if (room.status === 'lobby') {
      if (gameStartedRef.current) {
        clearTimers()
        if (audioRef.current) audioRef.current.pause()
        onBackToLobby && onBackToLobby()
      }
      return
    }

    if (room.status !== 'playing') return
    gameStartedRef.current = true

    if (room.round_revealed) {
      // Reveal : stop audio/chrono + on récupère bonne réponse + gagnant + scores.
      clearTimers()
      if (audioRef.current) audioRef.current.pause()
      getRoundResult(room.id)
        .then((res) => {
          if (!res) return
          setResult(res)
          if (res.winner_user_id === user?.id) playCorrect()
          else if (!res.winner_user_id) playWrong()
        })
        .catch(() => {})
    } else {
      // Nouvelle manche : on réinitialise et on charge les choix + l'audio
      // (sans le lancer : le joueur devra appuyer sur « Lancer l'extrait »).
      clearTimers()
      setResult(null)
      setMyAnswer(null)
      setHasPlayed(false)
      setTimeLeft(QUESTION_S)
      getRound(room.id)
        .then((r) => {
          if (!r) return
          setRound(r)
          if (audioRef.current && r.audio) {
            audioRef.current.src = r.audio
            audioRef.current.load()
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, room.current_round, room.round_revealed])

  // Chrono local (pression + déclenche la fin de manche côté hôte).
  function beginCountdown() {
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - 1)
        if (next > 0) playTick(next <= 5)
        if (next === 0) {
          clearInterval(countdownRef.current)
          if (isHost) endRoundTimeout(room.id).catch(() => {})
        }
        return next
      })
    }, 1000)
  }

  // Démarre l'extrait. fromRemote = déclenché par le signal d'un autre joueur :
  // si le navigateur bloque la lecture auto, on laisse le bouton manuel.
  function startSample({ fromRemote = false } = {}) {
    if (hasPlayed || !round) return
    const audio = audioRef.current
    const begin = () => {
      setHasPlayed(true)
      beginCountdown()
    }
    if (audio && round.audio) {
      audio.currentTime = 0
      Promise.resolve(audio.play())
        .then(() => {
          clearTimeout(sampleTimerRef.current)
          sampleTimerRef.current = setTimeout(() => audio.pause(), SAMPLE_MS)
          begin()
        })
        .catch(() => {
          if (!fromRemote) begin() // tap local : on continue même sans audio
        })
    } else {
      begin()
    }
  }

  // « Activer le son » : un geste utilisateur débloque l'audio sur cet appareil
  // (requis sur mobile) pour que la lecture déclenchée à distance fonctionne.
  function armAudio() {
    const audio = audioRef.current
    if (audio) {
      audio.muted = true
      Promise.resolve(audio.play())
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          audio.muted = false
        })
        .catch(() => {
          audio.muted = false
        })
    }
    setArmed(true)
  }

  // Tap local sur « Lancer l'extrait » → on joue ici ET on prévient les autres.
  function handlePlayClick() {
    startSample({ fromRemote: false })
    if (sendPlayRef.current && round) sendPlayRef.current({ round: round.round_number })
  }

  // Handler du signal distant (réassigné à chaque rendu → toujours à jour).
  onPlayRef.current = (payload) => {
    if (!payload || !round) return
    if (payload.round !== round.round_number) return
    if (!armed || hasPlayed || room.round_revealed) return
    startSample({ fromRemote: true })
  }

  async function handleBuzz(choice) {
    if (myAnswer || room.round_revealed) return
    setMyAnswer('pending')
    try {
      const res = await submitAnswer(room.id, choice.id)
      setMyAnswer(res.is_correct ? 'correct' : 'wrong')
      if (!res.is_correct) playWrong()
    } catch {
      setMyAnswer(null) // ex : "déjà répondu" / "trop tard" — on relâche
    }
  }

  async function handleNext() {
    try {
      await nextRound(room.id)
    } catch {}
  }

  async function handleExit() {
    try {
      await leaveRoom(room.id)
    } catch {}
    onExit()
  }

  const hideSubtitle = room.mode === 'otaku'
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const answerLocked = !!myAnswer || room.round_revealed

  return (
    <motion.main
      key="online_game"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-8"
    >
      <audio ref={audioRef} preload="auto" />

      {/* En-tête : manche + quitter */}
      <header className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">Manche</p>
          <p className="font-display font-bold text-2xl sm:text-4xl leading-none mt-1 tabular-nums">
            <span className="text-text-primary">
              {String(round?.round_number || room.current_round || 1).padStart(2, '0')}
            </span>
            <span className="serif-italic text-text-tertiary text-lg sm:text-2xl mx-2">/</span>
            <span className="text-text-tertiary">{String(round?.total || room.rounds || 0).padStart(2, '0')}</span>
          </p>
        </div>
        <button onClick={handleExit} className="btn-back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          Quitter
        </button>
      </header>

      <div className="relative z-10 mt-8 grid grid-cols-12 gap-6">
        {/* Colonne principale */}
        <section className="col-span-12 lg:col-span-8">
          {/* Préparation (hôte) / chargement de la 1re manche */}
          {room.status !== 'finished' && !round && !result && (
            <CenteredBlock
              title={prepError ? 'Oups' : 'Préparation'}
              subtitle={prepError || 'On construit la partie…'}
            />
          )}

          <AnimatePresence mode="wait">
            {/* PHASE PLAYING */}
            {room.status === 'playing' && !room.round_revealed && round && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              >
                {!armed ? (
                  /* Activation du son (une fois par appareil) : débloque l'audio
                     pour que la lecture déclenchée à distance fonctionne sur mobile. */
                  <div className="flex flex-col items-center py-10">
                    <button
                      onClick={armAudio}
                      className="px-8 py-4 rounded-full bg-accent-purple text-white font-display font-medium text-lg
                                 cursor-pointer hover:scale-105 transition-transform shadow-2xl shadow-accent-purple/30"
                    >
                      Activer le son
                    </button>
                    <p className="mt-6 max-w-[300px] text-center text-xs uppercase tracking-[0.3em] text-text-tertiary">
                      Une fois, pour entendre les extraits
                    </p>
                  </div>
                ) : !hasPlayed ? (
                  /* Lancer l'extrait : joue ici ET chez les autres joueurs */
                  <div className="flex flex-col items-center py-10">
                    <button
                      onClick={handlePlayClick}
                      className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-accent-green text-black
                                 flex items-center justify-center cursor-pointer
                                 hover:scale-105 transition-transform shadow-2xl shadow-accent-green/40"
                      aria-label="Lancer l'extrait"
                    >
                      <span className="ml-2 block w-0 h-0 border-t-[22px] border-t-transparent
                                       border-b-[22px] border-b-transparent border-l-[34px] border-l-black" />
                    </button>
                    <p className="mt-6 text-xs uppercase tracking-[0.3em] text-text-tertiary">
                      Lancer l'extrait
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Chrono */}
                    <div className="flex justify-center mb-8">
                      <span
                        className={`font-display font-bold text-6xl sm:text-7xl tabular-nums ${
                          timeLeft <= 5 ? 'text-accent-pink' : 'text-text-primary'
                        }`}
                      >
                        {timeLeft}
                      </span>
                    </div>

                    <p className="text-center text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-6">
                      {myAnswer === 'wrong'
                        ? 'Raté — attends la révélation'
                        : myAnswer === 'correct'
                          ? 'Bonne réponse !'
                          : 'Tape la bonne proposition'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {round.choices.map((choice, i) => (
                        <button
                          key={`${choice.id}-${i}`}
                          onClick={() => handleBuzz(choice)}
                          disabled={answerLocked}
                          className="group relative overflow-hidden text-left p-5 rounded-2xl border transition-all duration-300
                                     bg-bg-card border-white/10 enabled:hover:border-accent-purple enabled:hover:bg-bg-card/80
                                     enabled:cursor-pointer enabled:hover:scale-[1.02] disabled:opacity-50 min-h-[84px]"
                        >
                          <span
                            className="absolute -right-4 -bottom-10 serif-italic text-[120px] leading-none text-white/[0.04] pointer-events-none"
                            aria-hidden="true"
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <p className="relative font-display font-semibold text-base sm:text-lg text-text-primary leading-tight">
                            {choice.title}
                          </p>
                          {!hideSubtitle && (
                            <p className="relative text-sm text-text-secondary mt-1 truncate">
                              {choice.artist?.name}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* PHASE REVEAL */}
            {room.status === 'playing' && room.round_revealed && result && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <RevealBlock result={result} />
                <div className="mt-10">
                  {isHost ? (
                    <button onClick={handleNext} className="btn-primary bg-accent-green text-bg-primary">
                      {result.is_last ? 'Voir le classement' : 'Manche suivante'}
                    </button>
                  ) : (
                    <p className="text-text-tertiary text-sm">
                      <span className="serif-italic">en attente —</span> l'hôte continue…
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* PHASE FINISHED — podium */}
            {room.status === 'finished' && (
              <motion.div
                key="finished"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-accent-green mb-3">
                  Partie terminée
                </p>
                <h1 className="font-display font-extrabold text-[44px] sm:text-[72px] leading-none tracking-[-0.03em] mb-8">
                  Le <span className="serif-italic text-accent-green">podium.</span>
                </h1>
                <ul className="space-y-2 max-w-lg">
                  {ranked.map((p, i) => (
                    <li
                      key={p.id}
                      className={`flex items-baseline gap-4 border-b border-white/10 pb-3 ${
                        i === 0 ? 'text-accent-green' : 'text-text-primary'
                      }`}
                    >
                      <span className="serif-italic text-2xl w-10">{i + 1}</span>
                      <span className="flex-1 font-display font-bold text-xl truncate">{p.username}</span>
                      <span className="font-display font-bold text-xl tabular-nums">{p.score}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col sm:flex-row gap-6 sm:items-center">
                  {isHost ? (
                    <button
                      onClick={() => replayGame(room.id).catch(() => {})}
                      className="btn-primary bg-accent-green text-bg-primary"
                    >
                      Rejouer
                    </button>
                  ) : (
                    <p className="text-text-tertiary text-sm">
                      <span className="serif-italic">en attente —</span> l'hôte peut relancer une partie…
                    </p>
                  )}
                  <button
                    onClick={handleExit}
                    className="cursor-pointer text-text-secondary hover:text-text-primary text-sm underline underline-offset-4 decoration-white/20"
                  >
                    Quitter le salon
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Scoreboard live */}
        <aside className="col-span-12 lg:col-span-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4 border-b border-white/10 pb-3">
            Scores{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">en direct</span>
          </p>
          <ul className="space-y-1">
            {ranked.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-baseline gap-3 px-3 py-2 rounded-lg ${
                  user && p.user_id === user.id ? 'bg-white/[0.04]' : ''
                }`}
              >
                <span className="serif-italic text-accent-purple text-sm w-5">{i + 1}</span>
                <span className="flex-1 font-medium truncate">{p.username}</span>
                <span className="font-display font-bold tabular-nums">{p.score}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </motion.main>
  )
}

/* ----- Blocs réutilisés ----- */
function CenteredBlock({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <h2 className="font-display font-bold text-4xl mb-3 tracking-tight">
        {title}
        <span className="serif-italic text-accent-purple">.</span>
      </h2>
      <p className="text-text-secondary max-w-md">{subtitle}</p>
    </div>
  )
}

function RevealBlock({ result }) {
  const track = result.correct || {}
  const cover = track.album?.cover_big || track.album?.cover_medium
  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
      {cover && (
        <img
          src={cover}
          alt=""
          className="col-span-1 sm:col-span-5 w-40 sm:w-full max-w-[220px] aspect-square rounded-xl object-cover shadow-2xl mx-auto sm:mx-0"
        />
      )}
      <div className="col-span-1 sm:col-span-7 text-center sm:text-left">
        <p
          className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${
            result.winner_username ? 'text-accent-green' : 'text-accent-pink'
          }`}
        >
          {result.winner_username ? `Trouvé par ${result.winner_username}` : 'Personne n\'a trouvé'}
        </p>
        <p className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] tracking-tight break-words">
          {track.title}
        </p>
        <p className="mt-2 text-base text-text-secondary">
          <span className="serif-italic">par</span> {track.artist?.name}
        </p>
      </div>
    </div>
  )
}
