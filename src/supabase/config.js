/*
  Initialisation du client Supabase pour SoundCheck.
  ---------------------------------------------------------------------------
  Remplace src/firebase/config.js. On lit l'URL du projet et la clé publique
  (« anon / publishable ») depuis les variables d'environnement Vite. Ces deux
  valeurs sont PUBLIQUES par nature : elles identifient le projet côté client.
  La vraie sécurité est assurée côté serveur par les politiques RLS PostgreSQL
  (équivalent des anciennes Firestore Security Rules).

  En dev local : valeurs dans le fichier .env à la racine.
  En prod (Vercel) : à déclarer dans le dashboard du projet.
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Message explicite plutôt qu'une erreur cryptique plus loin dans le code.
  throw new Error(
    'Variables Supabase manquantes : vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env'
  )
}

/*
  Le client gère automatiquement :
   - la persistance de la session (localStorage) entre les rechargements
   - le rafraîchissement des tokens
   - la détection de la session dans l'URL au retour d'un lien de confirmation
     d'email ou d'une connexion OAuth Google (detectSessionInUrl, activé par
     défaut) — c'est ce qui nous permet de supprimer toute l'ancienne page
     /verify et la gestion manuelle du oobCode.
*/
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
