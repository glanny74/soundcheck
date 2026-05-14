/*
  AuthContext — état d'authentification partagé dans toute l'app.
  ---------------------------------------------------------------------------
  C'est l'UNIQUE entorse à la règle "pas de Context" qu'on s'était fixée
  en V1. On l'introduit ici parce que l'auth doit être accessible partout :
  Header (avatar), Game (sauvegarde), Profile, Leaderboard, etc.

  Le Context expose :
   - user           : l'objet User Firebase (ou null si déconnecté)
   - profile        : le profil étendu Firestore (username, photoURL, stats)
   - loading        : true tant qu'on n'a pas terminé le check initial
   - isAuthenticated: shortcut booléen
   - refreshProfile : pour forcer un re-fetch du profil (après update)

  L'authentification persiste automatiquement entre les sessions grâce
  au comportement par défaut de Firebase Auth (stockage localStorage).
*/

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { reloadCurrentUser } from '../firebase/auth'
import { getUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Écoute les changements d'état d'auth Firebase (login/logout/refresh token)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser)

      if (fbUser) {
        // Utilisateur connecté → on charge son profil Firestore
        try {
          const prof = await getUserProfile(fbUser.uid)
          setProfile(prof)
        } catch (err) {
          console.error('Erreur chargement profil :', err)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Permet à un composant (ex: Profile après update) de forcer le rafraîchissement
  async function refreshProfile() {
    if (!user) return
    const prof = await getUserProfile(user.uid)
    setProfile(prof)
  }

  // Recharge le user Firebase pour récupérer la valeur à jour de
  // `emailVerified` après que l'utilisateur a cliqué sur le lien dans son mail.
  // On crée un nouvel objet pour forcer React à détecter le changement.
  async function refreshUser() {
    const fresh = await reloadCurrentUser()
    if (fresh) {
      // Spread pour bien créer une nouvelle référence (Firebase mute l'objet
      // currentUser en place sans changer son identité)
      setUser({ ...fresh })
    }
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refreshProfile,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook custom pour accéder au Context, lance une erreur si utilisé hors AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() doit être utilisé dans un <AuthProvider>')
  }
  return ctx
}
