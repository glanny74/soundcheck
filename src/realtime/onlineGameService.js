/*
  Service de la boucle de jeu EN LIGNE.
  ---------------------------------------------------------------------------
  - buildOnlineQuestions(config) : l'HÔTE construit les questions côté navigateur
    à partir de Deezer / AnimeThemes (le serveur Postgres ne peut pas appeler ces
    API). On envoie ensuite ces questions au serveur via start_game, qui les
    stocke (la bonne réponse restant cachée des autres joueurs).
  - les autres fonctions = simples enrobages des RPC serveur (scoring autoritaire).
*/

import { supabase } from '../supabase/config'
import {
  getArtistTopTracks,
  getMultiArtistsTracks,
  getRandomTracks,
  getTracksByGenre,
} from '../services/deezerApi'
import { getAnimeOpenings } from '../services/animeThemesApi'
import { buildQuestion } from '../utils/gameLogic'

// Réduit un titre Deezer à l'essentiel pour l'envoi réseau (id, libellés, pochette).
function slimTrack(t) {
  return {
    id: String(t.id),
    title: t.title,
    artist: { name: t.artist?.name || '' },
    album: {
      cover_big: t.album?.cover_big || t.album?.cover_medium || null,
      cover_medium: t.album?.cover_medium || null,
    },
  }
}

/**
 * Construit les questions de la partie à partir de la config choisie par l'hôte.
 * @returns {Array<{choices, audio, correct_track_id}>}
 */
export async function buildOnlineQuestions(config) {
  let tracks = []
  if (config.mode === 'artist') tracks = await getArtistTopTracks(config.artists[0].id)
  else if (config.mode === 'multi') tracks = await getMultiArtistsTracks(config.artists.map((a) => a.id))
  else if (config.mode === 'genre') tracks = await getTracksByGenre(config.genre, config.language)
  else if (config.mode === 'random') tracks = await getRandomTracks()
  else if (config.mode === 'otaku') tracks = await getAnimeOpenings(config.difficulty)

  // Dédoublonnage par id
  const pool = Array.from(new Map(tracks.map((t) => [t.id, t])).values())
  if (pool.length < 4) {
    throw new Error('Pas assez de titres pour cette partie. Essaie un autre artiste ou genre.')
  }

  const questions = []
  const used = []
  for (let i = 0; i < config.totalRounds; i++) {
    const q = buildQuestion(pool, used)
    if (!q) break
    used.push(q.correct.id)
    questions.push({
      choices: q.choices.map(slimTrack),
      audio: q.correct.preview,
      correct_track_id: String(q.correct.id),
    })
  }

  if (questions.length === 0) {
    throw new Error('Impossible de générer des questions pour cette partie.')
  }
  return questions
}

// --------------------------------------------------------------------------
// Enrobages RPC (scoring/validation côté serveur)
// --------------------------------------------------------------------------

/** L'hôte lance la partie avec les questions pré-construites. */
export async function startGame(roomId, config, questions) {
  const { error } = await supabase.rpc('start_game', {
    p_room_id: roomId,
    p_mode: config.mode,
    p_mode_params: {
      artists: config.artists?.map((a) => a.name) || null,
      genre: config.genre || null,
      language: config.language || null,
      difficulty: config.difficulty || null,
    },
    p_questions: questions,
  })
  if (error) throw error
}

/** Récupère la manche en cours (choix + audio, SANS la bonne réponse). */
export async function getRound(roomId) {
  const { data, error } = await supabase.rpc('get_round', { p_room_id: roomId })
  if (error) throw error
  return data
}

/** Envoie la réponse d'un joueur. Renvoie { is_correct, is_winner }. */
export async function submitAnswer(roomId, answerTrackId) {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_room_id: roomId,
    p_answer_track_id: String(answerTrackId),
  })
  if (error) throw error
  return data
}

/** Signale la fin du temps (aucun bon buzz) → reveal. Ouvert à tous les joueurs :
 *  le serveur vérifie que le temps est bien écoulé avant de clore la manche. */
export async function endRoundTimeout(roomId) {
  const { error } = await supabase.rpc('end_round_timeout', { p_room_id: roomId })
  if (error) throw error
}

/** Après reveal : bonne réponse + gagnant + scores. */
export async function getRoundResult(roomId) {
  const { data, error } = await supabase.rpc('get_round_result', { p_room_id: roomId })
  if (error) throw error
  return data
}

/** L'hôte passe à la manche suivante (ou termine la partie). */
export async function nextRound(roomId) {
  const { error } = await supabase.rpc('next_round', { p_room_id: roomId })
  if (error) throw error
}

/** L'hôte relance une partie dans le MÊME salon (scores remis à zéro). */
export async function replayGame(roomId) {
  const { error } = await supabase.rpc('replay_game', { p_room_id: roomId })
  if (error) throw error
}

/**
 * En fin de partie, CHAQUE joueur enregistre SA propre partie (pour ses stats
 * et le leaderboard). Réutilise la RPC record_game existante avec le score du
 * joueur courant.
 */
export async function saveMyOnlineGame({ room, players, userId }) {
  const me = players.find((p) => p.user_id === userId)
  if (!me) return
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const winner = ranked[0]?.username || ''
  const duration = room.started_at
    ? Math.round((Date.now() - new Date(room.started_at).getTime()) / 1000)
    : null

  const { error } = await supabase.rpc('record_game', {
    p_mode: room.mode,
    p_mode_params: room.mode_params,
    p_rounds: room.rounds,
    p_players: players.map((p) => ({ name: p.username, score: p.score })),
    p_winner: winner,
    p_duration: duration,
    p_user_score: me.score,
    p_user_won: winner === me.username,
  })
  if (error) console.error('Sauvegarde partie en ligne échouée :', error)
}
