/*
  Fonctions d'authentification Firebase.
  ---------------------------------------------------------------------------
  On encapsule toute la logique réseau ici pour que les composants React
  n'aient à connaître que des fonctions de haut niveau (signUp, signIn,
  signOutUser, etc.).

  Toutes les fonctions sont asynchrones et peuvent throw — c'est aux
  composants appelants d'attraper et d'afficher les erreurs côté UI.
*/

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from './config'
import { ensureUserProfile, isUsernameTaken } from './firestore'

/*
  Construit l'objet actionCodeSettings utilisé pour customiser le lien envoyé
  dans le mail Firebase. Concrètement, on dit à Firebase :
   - "le lien doit pointer sur MON app (pas sur ta page par défaut)"
   - "ne pré-valide pas le code côté Firebase, mon app va appeler
      applyActionCode() elle-même"

  On utilise window.location.origin pour fonctionner aussi bien en dev local
  qu'en prod sur Vercel, sans config hardcodée. Important : pour la prod, le
  domaine Vercel doit être listé dans Firebase Console > Auth > Settings >
  Authorized domains (les domaines `localhost` et `<project>.firebaseapp.com`
  sont autorisés par défaut).
*/
function buildVerificationActionSettings() {
  const url =
    typeof window !== 'undefined' ? window.location.origin + '/' : '/'
  return {
    url,
    handleCodeInApp: true,
  }
}

/*
  Envoie le mail de vérification brandé via notre serverless function Vercel.
  ---------------------------------------------------------------------------
  En PROD : on POST sur /api/send-verification-email. La function utilise
  Firebase Admin SDK pour générer le lien et Resend pour envoyer un mail
  HTML aux couleurs de SoundCheck.

  En DEV (Vite, `import.meta.env.DEV` === true) : la fonction /api/ n'est pas
  servie par Vite. On retombe sur le `sendEmailVerification()` standard de
  Firebase (mail basique mais fonctionnel) pour que le développement local
  reste possible sans avoir à lancer `vercel dev` ou à déployer.

  Cette fonction est appelée depuis signUpWithEmail() et resendEmailVerification().
*/
async function sendBrandedVerificationEmail(user) {
  // En dev : on n'a pas la serverless function, on prend le chemin Firebase.
  if (import.meta.env.DEV) {
    await sendEmailVerification(user, buildVerificationActionSettings())
    return
  }

  // En prod : on passe par notre route /api/send-verification-email.
  let response
  try {
    response = await fetch('/api/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        username: user.displayName,
      }),
    })
  } catch (networkErr) {
    // Réseau coupé / serverless down : on fallback sur Firebase pour ne pas
    // laisser l'utilisateur sans mail. C'est moins joli mais ça marche.
    console.warn('Serverless indispo, fallback Firebase :', networkErr)
    await sendEmailVerification(user, buildVerificationActionSettings())
    return
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error(
      `Serverless email a répondu ${response.status} : ${errText}. Fallback Firebase.`
    )
    await sendEmailVerification(user, buildVerificationActionSettings())
  }
}

/**
 * Inscription par email + mot de passe.
 * @param {string} email
 * @param {string} password (min 6 caractères, exigé par Firebase)
 * @param {string} username (visible publiquement, doit être unique)
 */
export async function signUpWithEmail({ email, password, username }) {
  // Vérification d'unicité du username avant création du compte
  const taken = await isUsernameTaken(username)
  if (taken) {
    throw new Error('Ce nom d\'utilisateur est déjà pris.')
  }

  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  // On enrichit le profil Firebase avec le displayName
  await updateProfile(user, { displayName: username })

  // Envoi de l'email de vérification — ne bloque pas l'inscription si ça
  // échoue (réseau coupé, quota, etc.) : on log et on continue. L'utilisateur
  // pourra renvoyer le lien depuis la bannière en haut de l'app.
  try {
    await sendBrandedVerificationEmail(user)
  } catch (err) {
    console.warn('Envoi du mail de vérification échoué :', err)
  }

  // On crée le document Firestore associé (collection `users`).
  // `provider: 'password'` correspond au providerId natif Firebase pour les
  // comptes email+password (vs 'google.com' pour Google).
  await ensureUserProfile({
    uid: user.uid,
    email,
    username,
    photoURL: null,
    provider: 'password',
  })

  return user
}

/**
 * Renvoie le mail de vérification à l'utilisateur courant.
 * Utilisé par la bannière "vérifie ton email" quand l'utilisateur a manqué
 * ou perdu le premier mail. Firebase applique un rate limit côté serveur,
 * pas besoin de gérer ça côté client.
 */
export async function resendEmailVerification() {
  if (!auth.currentUser) {
    throw new Error('Aucun utilisateur connecté.')
  }
  await sendBrandedVerificationEmail(auth.currentUser)
}

/**
 * Applique un code de vérification d'email (oobCode) — appelé depuis la page
 * /verify quand l'utilisateur clique sur le lien dans son mail.
 *
 * Firebase met à jour côté serveur le flag emailVerified, mais l'objet
 * `auth.currentUser` côté client n'est PAS rafraîchi automatiquement —
 * il faudra appeler `reloadCurrentUser()` ensuite si on veut lire la valeur
 * à jour.
 *
 * @param {string} oobCode - code unique extrait de l'URL du mail
 */
export async function applyVerificationCode(oobCode) {
  await applyActionCode(auth, oobCode)
}

/**
 * Recharge l'objet user courant depuis Firebase pour rafraîchir des champs
 * comme `emailVerified` après que l'utilisateur a cliqué sur le lien de
 * confirmation. Firebase ne synchronise pas ces changements automatiquement.
 */
export async function reloadCurrentUser() {
  if (!auth.currentUser) return null
  await auth.currentUser.reload()
  return auth.currentUser
}

/** Connexion par email + mot de passe. */
export async function signInWithEmail({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

/**
 * Connexion via Google (popup).
 * Au premier login, on crée aussi le profil Firestore.
 */
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider)

  // Profil Firestore : on s'assure qu'il existe (sinon on le crée)
  await ensureUserProfile({
    uid: user.uid,
    email: user.email,
    // Pour Google, le username initial = displayName Google. L'utilisateur
    // pourra le modifier depuis son profil plus tard si besoin.
    username: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL,
    provider: 'google',
  })

  return user
}

/** Déconnexion. */
export async function signOutUser() {
  await signOut(auth)
}

/**
 * Envoi d'un email de réinitialisation de mot de passe.
 * L'utilisateur recevra un lien pour définir un nouveau mot de passe.
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}
