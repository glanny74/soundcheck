/*
  Génération de sons côté client via la Web Audio API.
  ---------------------------------------------------------------------------
  Pas de fichiers MP3 à embarquer : tous les sons sont synthétisés à la volée
  avec des oscillateurs. Avantage : zéro dépendance, taille du bundle minime,
  et on peut facilement régler la couleur des sons en changeant les notes.

  IMPORTANT : la plupart des navigateurs interdisent de créer / démarrer un
  AudioContext tant que l'utilisateur n'a pas interagi avec la page (politique
  "autoplay"). On crée donc le contexte de manière paresseuse (au premier
  appel d'un son) et on le "resume" si nécessaire.
*/

let audioCtx = null

// Récupère (ou crée) le contexte audio partagé.
function getAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  // Sur certains navigateurs, le contexte peut être en "suspended" tant
  // qu'aucune interaction utilisateur n'a eu lieu.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Joue une note pure (oscillateur) avec une enveloppe ADSR très simplifiée.
 *
 * @param {number} freq      - fréquence en Hz (440 = La4)
 * @param {number} duration  - durée en secondes
 * @param {object} opts
 *   - type     : 'sine' (doux), 'square' (8-bit), 'triangle', 'sawtooth'
 *   - volume   : 0 → 1 (par défaut 0.2)
 *   - startAt  : décalage en secondes par rapport au moment courant
 */
function playTone(freq, duration, opts = {}) {
  const ctx = getAudioContext()
  if (!ctx) return

  const { type = 'sine', volume = 0.2, startAt = 0 } = opts

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = freq

  const now = ctx.currentTime + startAt
  // Enveloppe : montée rapide (10ms) → maintien → fade out doux pour éviter les clics
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.setValueAtTime(volume, now + duration - 0.05)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + duration)
}

// =====================================================================
// Sons exportés
// =====================================================================

/**
 * Tick du chrono — un "bip" court et discret.
 * Le paramètre `urgent` permet d'avoir un son plus aigu/plus fort sur les
 * dernières secondes pour signaler l'urgence.
 */
export function playTick(urgent = false) {
  if (urgent) {
    playTone(1200, 0.08, { type: 'square', volume: 0.18 })
  } else {
    playTone(800, 0.05, { type: 'square', volume: 0.08 })
  }
}

/**
 * Son de bonne réponse — petit arpège ascendant doux (do-mi-sol).
 * Inspiration : effets de jeux musicaux type Rocksmith / Beat Saber.
 */
export function playCorrect() {
  // Notes : C5 (523), E5 (659), G5 (784) — accord parfait majeur
  playTone(523.25, 0.15, { type: 'sine', volume: 0.25, startAt: 0 })
  playTone(659.25, 0.15, { type: 'sine', volume: 0.25, startAt: 0.08 })
  playTone(783.99, 0.3, { type: 'sine', volume: 0.25, startAt: 0.16 })
}

/**
 * Son de mauvaise réponse — descente grave dissonante.
 * Sinusoïde sombre, deux notes qui glissent vers le bas.
 */
export function playWrong() {
  // E4 (329) → C4 (261) — descente mineure qui rend "déçu"
  playTone(329.63, 0.2, { type: 'triangle', volume: 0.25, startAt: 0 })
  playTone(261.63, 0.4, { type: 'triangle', volume: 0.25, startAt: 0.15 })
}
