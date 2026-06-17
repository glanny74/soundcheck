/*
  Hook custom pour récupérer l'historique des parties d'un utilisateur.
  ---------------------------------------------------------------------------
  Encapsule la pagination (chargement initial + « voir plus ») pour que le
  composant History.jsx reste simple.

  Usage :
    const { games, loading, error, hasMore, loadMore } = useGameHistory(userId)

  Pagination Supabase : on avance par offset (nombre de parties déjà chargées),
  plus simple que les curseurs Firestore. getUserGames renvoie nextOffset.
*/

import { useCallback, useEffect, useState } from 'react'
import { getUserGames } from '../supabase/db'

export function useGameHistory(userId, pageSize = 10) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Chargement initial — déclenché à chaque changement de userId
  const loadInitial = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getUserGames(userId, pageSize, 0)
      setGames(result.games)
      setHasMore(result.hasMore)
      setOffset(result.nextOffset)
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

  // Charge la page suivante (concaténation aux parties déjà chargées)
  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await getUserGames(userId, pageSize, offset)
      setGames((prev) => [...prev, ...result.games])
      setHasMore(result.hasMore)
      setOffset(result.nextOffset)
    } catch (err) {
      console.error('Erreur load more historique :', err)
      setError(err)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, offset, hasMore, loadingMore, pageSize])

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
