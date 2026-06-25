import { motion } from 'framer-motion'
import { useState } from 'react'
import { createRoom, joinRoom } from '../../realtime/roomService'
import { pageTransition } from '../../utils/motion'

/*
  OnlineHome — porte d'entrée du multijoueur EN LIGNE.
  ---------------------------------------------------------------------------
  Deux actions : créer un salon (on devient l'hôte) ou en rejoindre un via son
  code à 5 chiffres. Réservé aux utilisateurs connectés (le gating est fait en
  amont dans App, ici on suppose qu'on a un compte).
*/

export default function OnlineHome({ onCreated, onJoined, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('') // '' | 'create' | 'join'

  async function handleCreate() {
    setError('')
    setLoading('create')
    try {
      const room = await createRoom()
      onCreated(room)
    } catch (err) {
      setError(traduireErreur(err))
      setLoading('')
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    const clean = code.trim()
    if (!/^\d{5}$/.test(clean)) {
      setError('Le code doit faire 5 chiffres.')
      return
    }
    setLoading('join')
    try {
      const room = await joinRoom(clean)
      onJoined(room)
    } catch (err) {
      setError(traduireErreur(err))
      setLoading('')
    }
  }

  return (
    <motion.main
      key="online_home"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-8"
    >
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent-green/15 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      <header className="relative z-10">
        <button onClick={onBack} className="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Retour
        </button>
      </header>

      <div className="relative z-10 mt-12 sm:mt-20 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-4">
          Multijoueur{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            en ligne
          </span>
        </p>
        <h1 className="font-display font-extrabold leading-[0.9] tracking-[-0.03em] text-[48px] sm:text-[80px]">
          <span className="text-text-primary">Jouez</span>{' '}
          <span className="serif-italic text-accent-green">ensemble.</span>
        </h1>
        <p className="mt-6 max-w-[420px] text-text-secondary leading-relaxed">
          Chacun sur son écran. Crée un salon et partage le code, ou rejoins une
          partie existante.
        </p>

        {/* Créer */}
        <div className="mt-12">
          <button
            onClick={handleCreate}
            disabled={!!loading}
            className="btn-primary bg-accent-green text-bg-primary"
          >
            {loading === 'create' ? 'Création…' : 'Créer un salon'}
          </button>
        </div>

        {/* Séparateur */}
        <div className="my-10 flex items-center gap-4 max-w-[420px]">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Rejoindre */}
        <form onSubmit={handleJoin} className="max-w-[420px]">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
            Rejoindre avec un code
          </label>
          <div className="flex items-end gap-4 border-b border-white/10 pb-3 focus-within:border-accent-green transition-colors">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="• • • • •"
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary
                         text-3xl tracking-[0.4em] py-2 focus:outline-none font-display font-bold"
            />
            <button
              type="submit"
              disabled={!!loading}
              className="btn-primary bg-accent-green text-bg-primary shrink-0"
            >
              {loading === 'join' ? 'Connexion…' : 'Rejoindre'}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-6 text-danger text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        )}
      </div>
    </motion.main>
  )
}

function traduireErreur(err) {
  const msg = err?.message || 'Une erreur est survenue.'
  if (/introuvable/i.test(msg)) return 'Aucun salon avec ce code.'
  if (/déjà commencé/i.test(msg)) return 'Cette partie a déjà commencé.'
  if (/complet/i.test(msg)) return 'Ce salon est complet.'
  if (/connexion requise/i.test(msg)) return 'Tu dois être connecté pour jouer en ligne.'
  return msg
}
