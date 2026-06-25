/*
  Service du multijoueur EN LIGNE (salons Supabase Realtime).
  ---------------------------------------------------------------------------
  Architecture hybride :
   - les TABLES (rooms, room_players...) sont la source de vérité ;
   - les FONCTIONS RPC (create_room, join_room, leave_room) font les écritures
     côté serveur (validées, anti-triche) ;
   - REALTIME (Postgres Changes) pousse les changements en direct aux clients
     abonnés au canal du salon (et respecte les RLS : on ne reçoit que les lignes
     qu'on a le droit de lire).

  Ce module est volontairement « pur » (pas de React) pour rester réutilisable,
  y compris plus tard sur le mobile.
*/

import { supabase } from '../supabase/config'

// --------------------------------------------------------------------------
// Écritures via RPC (validées côté serveur)
// --------------------------------------------------------------------------

/**
 * Crée un salon. L'appelant en devient l'hôte et le premier joueur.
 * Le mode/manches seront définis au lancement (l'hôte les choisit dans le lobby).
 * @returns la ligne `rooms` créée (avec son `code` à 5 chiffres).
 */
export async function createRoom() {
  const { data, error } = await supabase.rpc('create_room', {
    p_mode: null,
    p_mode_params: null,
    p_rounds: null,
  })
  if (error) throw error
  return data
}

/**
 * Rejoint un salon par son code à 5 chiffres.
 * @returns la ligne `rooms` rejointe.
 */
export async function joinRoom(code) {
  const { data, error } = await supabase.rpc('join_room', { p_code: code })
  if (error) throw error
  return data
}

/** Quitte un salon (si l'hôte part, le salon est marqué abandonné côté serveur). */
export async function leaveRoom(roomId) {
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId })
  if (error) throw error
}

// --------------------------------------------------------------------------
// Lectures
// --------------------------------------------------------------------------

/** Liste les joueurs d'un salon (triés par ordre d'arrivée). */
export async function fetchPlayers(roomId) {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data || []
}

/** Récupère une ligne `rooms` par son id. */
export async function fetchRoom(roomId) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle()
  if (error) throw error
  return data
}

// --------------------------------------------------------------------------
// Abonnement temps réel
// --------------------------------------------------------------------------

/**
 * S'abonne aux changements d'un salon : arrivées/départs de joueurs et
 * évolution du salon (statut, manche en cours...). À chaque changement, on
 * rappelle les callbacks fournis avec les données fraîches.
 *
 * @param {string}   roomId
 * @param {object}   handlers
 * @param {(players:any[]) => void} handlers.onPlayers - liste des joueurs à jour
 * @param {(room:any) => void}      handlers.onRoom    - salon à jour
 * @param {(payload:any) => void}   handlers.onPlay    - signal « lancer l'extrait »
 *        émis par un joueur (Broadcast, éphémère) pour synchroniser la lecture.
 * @returns {{ unsubscribe: () => void, sendPlay: (payload:any) => void }}
 */
export function subscribeToRoom(roomId, { onPlayers, onRoom, onPlay } = {}) {
  const refreshPlayers = () => {
    if (onPlayers) fetchPlayers(roomId).then(onPlayers).catch(() => {})
  }
  const refreshRoom = () => {
    if (onRoom) fetchRoom(roomId).then((r) => r && onRoom(r)).catch(() => {})
  }

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      refreshPlayers
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      refreshRoom
    )
    .on('broadcast', { event: 'play' }, ({ payload }) => {
      if (onPlay) onPlay(payload)
    })
    .subscribe()

  // Diffuse à tous les autres membres « lance l'extrait de la manche N ».
  const sendPlay = (payload) =>
    channel.send({ type: 'broadcast', event: 'play', payload })

  return {
    unsubscribe: () => supabase.removeChannel(channel),
    sendPlay,
  }
}
