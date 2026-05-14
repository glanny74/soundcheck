/*
  Initialisation du Firebase Admin SDK pour les serverless functions Vercel.
  ---------------------------------------------------------------------------
  L'Admin SDK donne un accès "serveur" à Firebase (sans passer par les règles
  Firestore, avec des droits d'écriture/lecture complets). Ici on l'utilise
  pour appeler `generateEmailVerificationLink()` — la version Admin de l'envoi
  de mail de vérif, qui renvoie le lien sans envoyer le mail elle-même.

  Variables d'env requises (côté Vercel) :
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY    (clé privée PEM — voir note sur les \n ci-dessous)

  Ces valeurs viennent du fichier JSON "Service account" téléchargé depuis
  Firebase Console > Project Settings > Service Accounts > Generate new
  private key. Champs correspondants : project_id, client_email, private_key.

  Note sur FIREBASE_PRIVATE_KEY : la clé PEM contient des sauts de ligne
  réels. Vercel (et la plupart des dashboards d'env vars) les stockent
  comme `\n` littéral (2 caractères). On les remet en vrais newlines avant
  de passer la clé à Firebase, sinon l'init échoue avec une erreur cryptique.

  Singleton : on cache l'instance pour éviter de re-init à chaque appel.
  Firebase rejette les doubles inits sur la même process (warning + erreur).
*/

import admin from 'firebase-admin'

function getAdminApp() {
  // Si déjà initialisé dans cette instance lambda, on réutilise
  if (admin.apps.length > 0) {
    return admin.apps[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Variables d'env Firebase Admin manquantes : vérifie FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY dans Vercel."
    )
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

/** Renvoie le service Auth de l'Admin SDK (singleton). */
export function getAdminAuth() {
  return getAdminApp().auth()
}
