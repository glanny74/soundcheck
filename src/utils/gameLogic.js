/*
  Logique pure du jeu — séparée des composants pour faciliter la lecture
  et permettre de tester ces fonctions indépendamment de React.
*/

/**
 * Mélange un tableau aléatoirement (algorithme de Fisher-Yates).
 * Retourne un NOUVEAU tableau, ne modifie pas l'original.
 */
export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Construit une question de blind test à partir d'un pool de titres.
 *
 * @param {Array}  pool          - liste complète de titres Deezer disponibles
 * @param {Array}  usedIds       - ids de titres déjà utilisés dans la partie
 * @returns {Object|null}        - { correct, choices } ou null si pool insuffisant
 *
 * `choices` est un tableau de 4 titres mélangés contenant la bonne réponse
 * et 3 leurres. Le format d'une proposition est : "Titre — Artiste".
 */
export function buildQuestion(pool, usedIds = []) {
  // On évite de repiocher un titre déjà utilisé pour ne pas avoir 2x la même question
  const available = pool.filter((t) => !usedIds.includes(t.id))

  if (available.length < 4) {
    // Pas assez de titres pour faire une question (1 correct + 3 leurres)
    return null
  }

  // Tirage du titre correct
  const correctIndex = Math.floor(Math.random() * available.length)
  const correct = available[correctIndex]

  // On retire le titre correct du pool restant, puis on mélange et on prend 3 leurres
  // On filtre aussi sur le label (titre+artiste) pour éviter qu'un même morceau
  // apparaisse en double sous une autre version (live, remix...).
  const correctLabel = formatLabel(correct)
  const remaining = available.filter(
    (t, i) => i !== correctIndex && formatLabel(t) !== correctLabel
  )
  const decoys = shuffle(remaining).slice(0, 3)

  // Mélange final des 4 propositions
  const choices = shuffle([correct, ...decoys])

  return { correct, choices }
}

/**
 * Format d'affichage d'un titre dans les boutons de réponse.
 */
export function formatLabel(track) {
  return `${track.title} — ${track.artist.name}`
}

/**
 * Trie un tableau de joueurs par score décroissant.
 * Renvoie un nouveau tableau (sans mutation).
 */
export function rankPlayers(players) {
  return [...players].sort((a, b) => b.score - a.score)
}
