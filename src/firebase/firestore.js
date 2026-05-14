/*
  Fonctions d'accès à Firestore pour SoundCheck.
  ---------------------------------------------------------------------------
  Trois collections :
   - users      : profil de chaque utilisateur (1 doc par user, id = uid)
   - games      : historique des parties (1 doc par partie)
   - leaderboard : vue dénormalisée pour le classement (1 doc par user)

  Note sur le quota gratuit Firebase :
   - 50 000 lectures / jour
   - 20 000 écritures / jour
   - C'est large pour un projet pédagogique. Chaque sauvegarde de partie
     coûte ~3 écritures (game + user stats + leaderboard).
*/

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'

// =========================================================================
// USERS
// =========================================================================

/**
 * Vérifie si un username est déjà pris.
 * Lecture sur la collection users avec un where username == query.
 */
export async function isUsernameTaken(username) {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('username', '==', username), limit(1))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

/**
 * Crée le profil utilisateur s'il n'existe pas déjà. Idempotent : safe à
 * appeler à chaque login.
 */
export async function ensureUserProfile({ uid, email, username, photoURL, provider }) {
  const ref = doc(db, 'users', uid)
  const existing = await getDoc(ref)

  if (existing.exists()) {
    return existing.data()
  }

  // Pour Google : si le username dérivé existe déjà, on suffixe avec l'uid
  let finalUsername = username
  if (provider === 'google' && (await isUsernameTaken(username))) {
    finalUsername = `${username}-${uid.slice(0, 4)}`
  }

  const profile = {
    email,
    username: finalUsername,
    photoURL,
    provider,
    createdAt: serverTimestamp(),
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  }
  await setDoc(ref, profile)
  return profile
}

/** Récupère le profil d'un utilisateur (1 lecture). */
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// =========================================================================
// GAMES
// =========================================================================

/**
 * Enregistre une partie terminée en base et met à jour les stats du joueur
 * + son entrée leaderboard (3 écritures au total).
 *
 * @param {object} payload - {
 *   userId, mode, modeParams, rounds, players[], winner, duration, playedAt
 * }
 */
export async function saveGame({
  userId,
  username,
  photoURL,
  mode,
  modeParams,
  rounds,
  players,
  winner,
  duration,
}) {
  // 1) Document de partie
  const gamesRef = collection(db, 'games')
  const gameDoc = await addDoc(gamesRef, {
    userId,
    mode,
    modeParams,
    rounds,
    players,
    winner,
    duration,
    playedAt: serverTimestamp(),
  })

  // 2) Stats utilisateur (incréments atomiques)
  // On considère que le joueur "host" est celui qui a créé la partie.
  // Si le user connecté est le host et qu'il a gagné, on incrémente gamesWon.
  const hostPlayer = players.find((p) => p.isHost) || players[0]
  const userScore = hostPlayer?.score || 0
  const userWon = winner === hostPlayer?.name

  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    totalScore: increment(userScore),
    gamesPlayed: increment(1),
    gamesWon: increment(userWon ? 1 : 0),
  })

  // 3) Leaderboard (dénormalisé, pour requêtes rapides)
  const leaderRef = doc(db, 'leaderboard', userId)
  // setDoc avec merge:true → crée le doc s'il n'existe pas, sinon update
  await setDoc(
    leaderRef,
    {
      username,
      photoURL: photoURL || null,
      totalScore: increment(userScore),
      gamesPlayed: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return gameDoc.id
}

/**
 * Récupère l'historique des parties d'un utilisateur, paginé.
 *
 * @param {string} userId
 * @param {number} pageSize - nombre de parties par page (10 par défaut)
 * @param {DocumentSnapshot} after - dernière partie de la page précédente (pour pagination)
 */
export async function getUserGames(userId, pageSize = 10, after = null) {
  const gamesRef = collection(db, 'games')
  const baseQuery = [
    where('userId', '==', userId),
    orderBy('playedAt', 'desc'),
    limit(pageSize),
  ]
  if (after) baseQuery.splice(2, 0, startAfter(after))

  const q = query(gamesRef, ...baseQuery)
  const snapshot = await getDocs(q)

  return {
    games: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  }
}

// =========================================================================
// LEADERBOARD
// =========================================================================

/**
 * Récupère le top N du leaderboard (par défaut top 100).
 * Très peu coûteux car on lit la collection leaderboard dénormalisée.
 */
export async function getLeaderboard(topN = 100) {
  const leaderRef = collection(db, 'leaderboard')
  const q = query(leaderRef, orderBy('totalScore', 'desc'), limit(topN))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d, i) => ({
    rank: i + 1,
    id: d.id,
    ...d.data(),
  }))
}

/** Récupère le doc leaderboard d'un user (1 lecture). */
export async function getLeaderboardEntry(userId) {
  const ref = doc(db, 'leaderboard', userId)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Helper pour convertir un Timestamp Firestore en Date JS
export function toDate(ts) {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (ts.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}
