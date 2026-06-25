import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchPlayers, leaveRoom, subscribeToRoom } from '../../realtime/roomService'
import { pageTransition } from '../../utils/motion'

/*
  Lobby — salle d'attente d'un salon en ligne.
  ---------------------------------------------------------------------------
  Affiche le code à partager et la liste des joueurs, mise à jour EN TEMPS RÉEL
  via Realtime (arrivées/départs). L'hôte peut lancer la partie dès qu'il y a au
  moins 2 joueurs (le lancement effectif = étape suivante). Les autres attendent.

  Si l'hôte quitte, le salon passe en « abandoned » côté serveur : on prévient
  les joueurs et on les ramène en arrière.
*/

const MIN_PLAYERS = 2

export default function Lobby({ room: initialRoom, onLeave, onConfigure, onGameStarted }) {
  const { user } = useAuth()
  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState([])
  const [notice, setNotice] = useState('')

  const isHost = user && room.host_id === user.id

  // Abonnement temps réel : joueurs + état du salon.
  useEffect(() => {
    fetchPlayers(room.id).then(setPlayers).catch(() => {})

    const { unsubscribe } = subscribeToRoom(room.id, {
      onPlayers: setPlayers,
      onRoom: (r) => {
        setRoom(r)
        // L'hôte a quitté / salon abandonné → on prévient et on sort.
        if (r.status === 'abandoned' && !isHost) {
          setNotice("L'hôte a quitté le salon.")
          setTimeout(() => onLeave(), 1800)
        }
        // La partie démarre → tout le monde bascule sur l'écran de jeu.
        if (r.status === 'playing' && onGameStarted) onGameStarted(r)
      },
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id])

  async function handleLeave() {
    try {
      await leaveRoom(room.id)
    } catch {
      // on sort quand même côté UI
    }
    onLeave()
  }

  const canStart = isHost && players.length >= MIN_PLAYERS

  return (
    <motion.main
      key="lobby"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-8"
    >
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-accent-purple/15 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-start justify-between gap-4">
        <button onClick={handleLeave} className="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Quitter
        </button>
        <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">
          Salon{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            d'attente
          </span>
        </p>
      </header>

      <div className="relative z-10 mt-10 sm:mt-16 grid grid-cols-12 gap-8 lg:gap-16">
        {/* Code à partager */}
        <div className="col-span-12 lg:col-span-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Code du salon
          </p>
          <p className="font-display font-extrabold text-accent-green text-[64px] sm:text-[96px] leading-none tracking-[0.1em]">
            {room.code}
          </p>
          <p className="mt-6 max-w-[340px] text-text-secondary text-sm leading-relaxed">
            Partage ce code. Les joueurs le saisissent dans{' '}
            <span className="serif-italic text-text-primary">Jouer en ligne</span>{' '}
            pour rejoindre.
          </p>
        </div>

        {/* Joueurs connectés */}
        <div className="col-span-12 lg:col-span-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-5">
            Joueurs{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              ({players.length}/{room.max_players})
            </span>
          </p>

          <ul className="space-y-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-4 border-b border-white/10 pb-3"
              >
                <span className="serif-italic text-accent-purple text-lg w-8 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium text-lg text-text-primary flex-1 truncate">
                  {p.username}
                </span>
                {p.is_host && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-accent-green">
                    hôte
                  </span>
                )}
                {user && p.user_id === user.id && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                    toi
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Action */}
          <div className="mt-10">
            {isHost ? (
              <button
                onClick={() => onConfigure && onConfigure()}
                disabled={!canStart}
                className="btn-primary bg-accent-green text-bg-primary"
              >
                Lancer la partie
              </button>
            ) : (
              <p className="text-text-tertiary text-sm">
                <span className="serif-italic">en attente —</span> l'hôte va lancer la partie…
              </p>
            )}
            {isHost && !canStart && (
              <p className="mt-3 text-xs text-text-tertiary">
                Il faut au moins {MIN_PLAYERS} joueurs pour lancer.
              </p>
            )}
          </div>

          {notice && (
            <p className="mt-6 text-danger text-sm">{notice}</p>
          )}
        </div>
      </div>
    </motion.main>
  )
}
