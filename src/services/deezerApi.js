/*
  Service d'accès à l'API Deezer.
  ----------------------------------------------------------------------------
  L'API Deezer est publique (aucune clé requise) mais elle ne renvoie pas les
  bons en-têtes CORS pour un appel direct depuis le navigateur.

  Notre stratégie :
   - en dev : on utilise le proxy Vite déclaré dans vite.config.js
     (toutes les requêtes vers /deezer/* sont relayées vers api.deezer.com).
   - en prod (Vercel) : on passe par corsproxy.io qui ajoute les en-têtes
     CORS pour nous. C'est un service public gratuit, suffisant pour un
     projet pédagogique.

  Toutes les fonctions ci-dessous renvoient des tableaux de "tracks" filtrés
  pour ne garder que les titres ayant un champ `preview` (URL MP3 30s).
*/

// import.meta.env.DEV vaut true quand on lance `vite` en local
const DEV = import.meta.env.DEV

// Construit l'URL complète vers l'API selon l'environnement
function buildUrl(endpoint) {
  if (DEV) {
    // En dev : /deezer/search/artist?q=... -> proxy Vite -> api.deezer.com
    return `/deezer${endpoint}`
  }
  // En prod : on passe par corsproxy.io
  return `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com${endpoint}`)}`
}

// Fonction utilitaire qui fait l'appel HTTP, parse le JSON et gère les erreurs.
async function fetchJson(endpoint) {
  const url = buildUrl(endpoint)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erreur Deezer (${response.status}) sur ${endpoint}`)
  }
  return response.json()
}

// Garde uniquement les titres exploitables (preview MP3 disponible).
function filterPlayable(tracks) {
  return (tracks || []).filter((t) => t && t.preview && t.title && t.artist)
}

/**
 * Recherche un artiste par nom.
 * Renvoie une liste d'artistes (id, name, picture).
 */
export async function searchArtist(query) {
  if (!query || !query.trim()) return []
  const data = await fetchJson(`/search/artist?q=${encodeURIComponent(query)}&limit=8`)
  return data.data || []
}

/**
 * Récupère les titres les plus écoutés d'un artiste donné (par son id Deezer).
 * On limite à 50 titres pour avoir un pool suffisamment large.
 */
export async function getArtistTopTracks(artistId, limit = 50) {
  const data = await fetchJson(`/artist/${artistId}/top?limit=${limit}`)
  return filterPlayable(data.data)
}

/**
 * Récupère les top titres pour plusieurs artistes et fusionne le pool.
 * Utilisé pour le mode "Multi-artistes" ET pour le mode "Genre" (via seeds).
 */
export async function getMultiArtistsTracks(artistIds, limitPerArtist = 20) {
  const results = await Promise.all(
    artistIds.map((id) => getArtistTopTracks(id, limitPerArtist))
  )
  return results.flat()
}

/*
  --------------------------------------------------------------------------
  GENRES — implémentation via "seed artists".

  L'API Deezer accepte `q=genre:"rap"` en théorie mais en pratique le filtre
  est très permissif et renvoie n'importe quoi. La méthode fiable consiste
  à choisir une poignée d'artistes représentatifs de chaque genre × langue,
  puis à fusionner leurs top titres pour former le pool de la partie.

  Avantage : on contrôle exactement ce qui sera joué et la qualité du pool.
  Inconvénient : il faut maintenir la liste, mais c'est bénin pour un projet
  pédagogique.
  --------------------------------------------------------------------------
*/

const GENRE_SEEDS = {
  rap: {
    fr: ['Booba', 'Ninho', 'Damso', 'PNL', 'Orelsan', 'SCH', 'Jul', 'Nekfeu', 'Kaaris', 'Bigflo & Oli'],
    en: ['Drake', 'Eminem', 'Kendrick Lamar', 'J. Cole', 'Travis Scott', 'Kanye West', '50 Cent', 'Future', 'Jay-Z', 'Lil Wayne'],
  },
  pop: {
    fr: ['Aya Nakamura', 'Stromae', 'Angèle', 'Indila', 'Vianney', 'Louane', 'Clara Luciani', 'Vitaa', 'M. Pokora', 'Slimane'],
    en: ['Taylor Swift', 'Ed Sheeran', 'Dua Lipa', 'Adele', 'Billie Eilish', 'The Weeknd', 'Ariana Grande', 'Bruno Mars', 'Harry Styles', 'Olivia Rodrigo'],
  },
  'r&b': {
    fr: ['Tayc', 'Dadju', 'Ronisia', 'Maître Gims', 'Hatik', 'Wejdene', 'Joé Dwèt Filé', 'Aya Nakamura', 'KeBlack'],
    en: ['The Weeknd', 'SZA', 'Bryson Tiller', 'H.E.R.', 'Khalid', 'Frank Ocean', 'Daniel Caesar', 'Summer Walker', 'Chris Brown', 'Usher'],
  },
  afrobeat: {
    fr: ['Aya Nakamura', 'Dadju', 'Fally Ipupa', 'Tayc', 'Naza', 'Singuila', "Innoss'B", 'KeBlack', 'Vegedream'],
    en: ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Tems', 'Ayra Starr', 'Tiwa Savage', 'Asake', 'CKay', 'Omah Lay'],
  },
  rock: {
    fr: ['Indochine', 'Téléphone', 'Noir Désir', 'Kyo', 'Mylène Farmer', 'Superbus', 'Louise Attaque', 'Trust'],
    en: ['Queen', 'Linkin Park', 'Imagine Dragons', 'Coldplay', 'Arctic Monkeys', 'Red Hot Chili Peppers', 'Foo Fighters', 'Muse', 'Green Day'],
  },
  electro: {
    fr: ['Daft Punk', 'David Guetta', 'DJ Snake', 'Madeon', 'Petit Biscuit', 'M83', 'Justice', 'Bob Sinclar'],
    en: ['Calvin Harris', 'Avicii', 'Marshmello', 'The Chainsmokers', 'Skrillex', 'Major Lazer', 'Martin Garrix', 'Tiësto'],
  },
}

export const AVAILABLE_GENRES = Object.keys(GENRE_SEEDS)
export const AVAILABLE_LANGUAGES = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'Anglais' },
  { id: 'all', label: 'Tous' },
]

/**
 * Récupère les top titres d'un artiste à partir de son nom (en deux étapes :
 * recherche puis top tracks). Renvoie [] si l'artiste n'a pas été trouvé.
 */
async function getTopTracksByArtistName(name, limit = 15) {
  try {
    const results = await searchArtist(name)
    if (!results.length) return []
    // On prend le premier résultat (le plus pertinent selon Deezer)
    const artistId = results[0].id
    return await getArtistTopTracks(artistId, limit)
  } catch (err) {
    console.warn(`Impossible de récupérer les tracks pour ${name} :`, err)
    return []
  }
}

/**
 * Récupère le pool de titres pour un genre et une langue donnés.
 * @param {string} genre - clé de GENRE_SEEDS (rap, pop, r&b, afrobeat, rock, electro)
 * @param {string} language - 'fr', 'en' ou 'all'
 */
export async function getTracksByGenre(genre, language = 'all') {
  const seeds = GENRE_SEEDS[genre]
  if (!seeds) return []

  // Construit la liste d'artistes selon la langue
  let artistNames = []
  if (language === 'fr') {
    artistNames = seeds.fr
  } else if (language === 'en') {
    artistNames = seeds.en
  } else {
    // 'all' : on mélange les deux pools en prenant les meilleurs des deux
    artistNames = [...seeds.fr.slice(0, 6), ...seeds.en.slice(0, 6)]
  }

  // Pour limiter la charge réseau, on plafonne à 8 artistes max
  artistNames = artistNames.slice(0, 8)

  // Lance toutes les requêtes en parallèle
  const results = await Promise.all(
    artistNames.map((name) => getTopTracksByArtistName(name, 15))
  )
  return filterPlayable(results.flat())
}

/**
 * Récupère un pool de titres "aléatoires" en piochant sur quelques termes
 * populaires variés. Deezer n'offre pas vraiment d'endpoint "random",
 * donc on simule en mélangeant des recherches génériques.
 */
export async function getRandomTracks() {
  const seeds = ['love', 'night', 'party', 'summer', 'feel', 'dance']
  // On ne lance pas les 6 requêtes : on en pioche 3 pour rester rapide
  const picks = seeds.sort(() => Math.random() - 0.5).slice(0, 3)

  const results = await Promise.all(
    picks.map((seed) =>
      fetchJson(`/search?q=${encodeURIComponent(seed)}&limit=40`).then((d) =>
        filterPlayable(d.data)
      )
    )
  )
  return results.flat()
}
