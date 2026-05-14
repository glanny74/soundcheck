/*
  Hook custom pour récupérer l'historique des parties d'un utilisateur.
  ---------------------------------------------------------------------------
  Encapsule la logique de pagination Firestore (chargement initial + "load more")
  pour que le composant History.jsx reste simple.

  Usage :
    const { games, loading, error, hasMore, loadMore } = useGameHistory(userId)

  Note : chaque page = 1 lecture par game (10 lectures par défaut).
  Le quota gratuit Firestore est de 50 000 lectures/jour → largement suffisant.
*/

import { useCallback, useEffect, useState } from 'react'
import { getUserGames } from '../firebase/firestore'

export function useGameHistory(userId, pageSize = 10) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState(null)

  // Chargement initial — déclenché à chaque changement de userId
  const loadInitial = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getUserGames(userId, pageSize)
      setGames(result.games)
      setHasMore(result.hasMore)
      setLastDoc(result.lastDoc)
    } catch (err) {
      console.error('Erreur historique :', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId, pageSize])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // Charge la page suivante (concaténation aux jeux déjà chargés)
  const loadMore = useCallback(async () => {
    if (!userId || !lastDoc || !hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await getUserGames(userId, pageSize, lastDoc)
      setGames((prev) => [...prev, ...result.games])
      setHasMore(result.hasMore)
      setLastDoc(result.lastDoc)
    } catch (err) {
      console.error('Erreur load more historique :', err)
      setError(err)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, lastDoc, hasMore, loadingMore, pageSize])

  return {
    games,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh: loadInitial,
  }
}
