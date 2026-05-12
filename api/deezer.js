/*
  Serverless function Vercel — proxy vers l'API Deezer.
  ---------------------------------------------------------------------------
  Pourquoi : l'API Deezer ne renvoie pas les bons en-têtes CORS pour un
  appel direct depuis un navigateur. On évite la dépendance à corsproxy.io
  (peu fiable, rate-limited) en hébergeant notre propre proxy directement
  sur Vercel.

  Cette fonction est appelée par le client via /api/deezer?path=/search/artist?q=Drake
  Elle fait l'appel serveur-à-serveur vers Deezer (où CORS n'existe pas)
  puis renvoie la réponse JSON avec les bons en-têtes.

  Caching : on autorise 60 secondes de cache CDN pour soulager Deezer en
  cas d'usage répété (mêmes recherches, mêmes top tracks).
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
    const response = await fetch(`https://api.deezer.com${path}`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Deezer a répondu ${response.status}` })
    }

    const data = await response.json()

    // Headers CORS — au cas où, même si on reste sur le même domaine
    res.setHeader('Access-Control-Allow-Origin', '*')
    // Cache CDN 60s + stale-while-revalidate pour réactivité
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

    return res.status(200).json(data)
  } catch (err) {
    console.error('Proxy Deezer error:', err)
    return res.status(500).json({ error: err.message })
  }
}
