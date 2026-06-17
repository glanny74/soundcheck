/*
  AuthContext — état d'authentification partagé dans toute l'app.
  ---------------------------------------------------------------------------
  C'est l'UNIQUE entorse à la règle « pas de Context » qu'on s'était fixée :
  l'auth doit être accessible partout (Home, Game, Profile, Leaderboard...).

  Version Supabase (remplace la version Firebase). Le Context expose :
   - user           : l'objet User Supabase (ou null si déconnecté)
   - profile        : le profil étendu PostgreSQL (username, photoURL, stats)
   - loading        : true tant que le check de session initial n'est pas fini
   - isAuthenticated: raccourci booléen
   - refreshProfile : force un re-fetch du profil (ex : après update du pseudo)

  La session persiste automatiquement entre les rechargements (localStorage,
  géré par supabase-js).
*/

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/config'
import { getUserProfile } from '../supabase/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // true quand l'utilisateur arrive depuis un lien « mot de passe oublié » :
  // on doit alors lui afficher l'écran de saisie d'un nouveau mot de passe.
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  // 1) Détermination de la session : une lecture initiale + un abonnement aux
  //    changements (login, logout, retour de lien email/OAuth, refresh token).
  //    On ne fait QUE mettre à jour `user` ici. Le chargement du profil se
  //    fait dans un second effet : appeler une requête Supabase asynchrone
  //    directement dans le callback onAuthStateChange peut provoquer un blocage
  //    (limitation documentée), on l'évite en découplant les deux.
  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Retour depuis un lien de réinitialisation : Supabase émet cet événement.
      // On lève le drapeau pour que App affiche l'écran « nouveau mot de passe ».
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // 2) Chargement du profil étendu à chaque changement d'utilisateur.
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    let active = true
    getUserProfile(user.id)
      .then((prof) => {
        if (active) setProfile(prof)
      })
      .catch((err) => {
        console.error('Erreur chargement profil :', err)
        if (active) setProfile(null)
      })

    return () => {
      active = false
    }
  }, [user])

  // Permet à un composant (ex : Profile après update) de forcer le re-fetch.
  async function refreshProfile() {
    if (!user) return
    const prof = await getUserProfile(user.id)
    setProfile(prof)
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refreshProfile,
    passwordRecovery,
    // Appelé par l'écran ResetPassword une fois le mot de passe changé.
    clearPasswordRecovery: () => setPasswordRecovery(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook custom pour accéder au Context, lance une erreur si utilisé hors Provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() doit être utilisé dans un <AuthProvider>')
  }
  return ctx
}
