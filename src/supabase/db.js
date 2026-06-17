/*
  Accès aux données SoundCheck via Supabase (PostgreSQL).
  ---------------------------------------------------------------------------
  Remplace src/firebase/firestore.js. Deux ressources :
   - profiles : profil + stats agrégées de chaque utilisateur
   - games    : historique des parties

  Important — convention de nommage :
   PostgreSQL utilise le snake_case (total_score, photo_url, played_at...).
   Les composants React, eux, parlent camelCase (totalScore, photoURL...).
   On fait la traduction ICI, dans la couche données, via mapProfile/mapGame.
   Comme ça les composants (Profile, Game, History) n'ont quasi rien à changer.
*/

import { supabase } from './config'

// =========================================================================
// PROFILES
// =========================================================================

// Traduit une ligne SQL (snake_case) en objet camelCase utilisé par l'app.
function mapProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    photoURL: row.photo_url,
    provider: row.provider,
    totalScore: row.total_score,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    createdAt: row.created_at,
  }
}

/**
 * Récupère le profil d'un utilisateur. Renvoie null s'il n'existe pas encore.
 * (Le profil est créé automatiquement à l'inscription par un trigger SQL.)
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return mapProfile(data)
}

/**
 * Vérifie si un pseudo est déjà pris (lecture publique autorisée par RLS).
 * Utilisé côté inscription pour afficher une erreur claire avant le signUp.
 */
export async function isUsernameTaken(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1)

  if (error) throw error
  return data.length > 0
}

// =========================================================================
// GAMES
// =========================================================================

function mapGame(row) {
  return {
    id: row.id,
    mode: row.mode,
    modeParams: row.mode_params,
    rounds: row.rounds,
    players: row.players,
    winner: row.winner,
    duration: row.duration,
    playedAt: row.played_at,
  }
}

/**
 * Enregistre une partie terminée + met à jour les stats du joueur.
 * ---------------------------------------------------------------------------
 * On appelle la fonction PostgreSQL `record_game` (RPC). Elle fait l'insert
 * de la partie ET l'incrément des stats dans UNE SEULE transaction atomique —
 * ce qui remplace les 3 écritures séparées + increment() de l'ancien Firestore.
 *
 * L'identité du joueur (auth.uid()) est déterminée côté serveur par la RPC :
 * pas besoin de passer userId, et impossible d'écrire pour un autre user.
 *
 * @param {object} payload - { mode, modeParams, rounds, players, winner, duration }
 */
export async function saveGame({ mode, modeParams, rounds, players, winner, duration }) {
  // Convention : le 1er joueur saisi (isHost) correspond au compte connecté.
  // Ses points alimentent ses stats personnelles.
  const host = players.find((p) => p.isHost) || players[0]
  const userScore = host?.score || 0
  const userWon = winner === host?.name

  const { data, error } = await supabase.rpc('record_game', {
    p_mode: mode,
    p_mode_params: modeParams,
    p_rounds: rounds,
    p_players: players,
    p_winner: winner,
    p_duration: duration,
    p_user_score: userScore,
    p_user_won: userWon,
  })

  if (error) throw error
  return data // uuid de la partie créée
}

/**
 * Historique paginé des parties d'un utilisateur.
 * ---------------------------------------------------------------------------
 * Pagination par offset (`.range`), plus simple que les curseurs Firestore.
 * RLS garantit qu'un user ne lit QUE ses propres parties — on filtre quand
 * même sur user_id par clarté et pour l'index.
 *
 * @param {string} userId
 * @param {number} pageSize - parties par page (10 par défaut)
 * @param {number} offset   - nombre de parties déjà chargées
 */
export async function getUserGames(userId, pageSize = 10, offset = 0) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) throw error
  return {
    games: data.map(mapGame),
    hasMore: data.length === pageSize,
    nextOffset: offset + data.length,
  }
}

// =========================================================================
// HELPERS
// =========================================================================

/**
 * Convertit une valeur date Supabase (chaîne ISO 8601) en objet Date JS.
 * Garde le même nom que l'ancien helper Firestore pour ne pas toucher aux
 * composants qui l'utilisent (Profile, History).
 */
export function toDate(value) {
  if (!value) return null
  return new Date(value)
}
