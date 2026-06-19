/*
  Serverless function Vercel — proxy vers l'API AnimeThemes.moe (mode Otaku).
  ---------------------------------------------------------------------------
  Pourquoi : en appel DIRECT depuis le navigateur, l'API AnimeThemes fonctionne
  sur desktop mais échoue sur certains navigateurs MOBILES (iOS Safari notamment
  est très strict sur le cross-origin, surtout en rafale). En relayant la
  requête côté serveur (où CORS n'existe pas), l'appel devient « même origine »
  pour le navigateur et fonctionne partout.

  Appelée par le client via :
    /api/animethemes?path=/anime/naruto?include=images,animethemes...
  On relaie tel quel vers https://api.animethemes.moe{path}.

  Note : seuls les appels JSON de l'API passent par ce proxy. Les fichiers
  audio (a.animethemes.moe/*.ogg) restent chargés en direct par la balise
  <audio> (lecture média opaque, sans contrainte CORS).

  Caching : 5 min de cache CDN — les openings d'anime ne changent jamais, ça
  soulage l'API et accélère les parties répétées.
*/

export default async function handler(req, res) {
  const { path } = req.query

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Paramètre "path" manquant.' })
  }

  // Sécurité minimale : on ne relaie que les chemins commençant par /
  if (!path.startsWith('/')) {
    return res.status(400).json({ error: 'Path doit commencer par /' })
  }

  try {
    // AnimeThemes (derrière Cloudflare) renvoie 403 aux requêtes sans
    // User-Agent de navigateur (le fetch serveur de Vercel n'en met pas par
    // défaut). On en fournit un explicite pour être accepté.
    const response = await fetch(`https://api.animethemes.moe${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `AnimeThemes a répondu ${response.status}` })
    }

    const data = await response.json()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

    return res.status(200).json(data)
  } catch (err) {
    console.error('Proxy AnimeThemes error:', err)
    return res.status(500).json({ error: err.message })
  }
}
