/*
  Re-export pratique du hook useAuth depuis le contexte.
  ---------------------------------------------------------------------------
  Ça permet aux composants de faire :
      import { useAuth } from '../hooks/useAuth'
  plutôt que :
      import { useAuth } from '../contexts/AuthContext'
  C'est un détail de conventions (hooks/ regroupe tous les hooks).
*/
export { useAuth } from '../contexts/AuthContext'
