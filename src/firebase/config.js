/*
  Initialisation de Firebase pour SoundCheck.
  ---------------------------------------------------------------------------
  On lit les clés de configuration depuis les variables d'environnement Vite
  (préfixe VITE_*). En dev local, elles viennent du fichier .env à la racine
  du projet. En prod sur Vercel, on les configurera via le dashboard.

  Pourquoi des variables d'env plutôt qu'en dur dans le code ?
   - On ne commit JAMAIS de clés API dans git (même publiques)
   - On peut changer de projet Firebase (prod/staging) sans rebuilder
   - C'est la pratique standard pour tout projet pro

  IMPORTANT : les clés Firebase côté client sont **publiques par nature** —
  elles permettent d'identifier le projet, pas de prouver une autorité. La
  vraie sécurité se fait via les Firestore Security Rules.
*/

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialise l'app Firebase une seule fois pour toute l'appli
export const app = initializeApp(firebaseConfig)

// Exporte des handles vers les services utilisés
export const auth = getAuth(app)
export const db = getFirestore(app)

// Provider Google réutilisable pour signInWithPopup
export const googleProvider = new GoogleAuthProvider()
