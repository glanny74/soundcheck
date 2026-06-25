/*
  Fonctions d'authentification Supabase.
  ---------------------------------------------------------------------------
  Remplace src/firebase/auth.js. On encapsule toute la logique réseau ici
  pour que les composants ne connaissent que des fonctions de haut niveau
  (signUpWithEmail, signInWithEmail, signInWithGoogle, etc.).

  Différences clés avec l'ancienne version Firebase :
   - La vérification d'email est NATIVE Supabase : pas de serverless, pas
     d'EmailJS, pas de page /verify custom. Le mail (template éditable dans
     le dashboard Supabase) contient un lien que le client supabase-js gère
     tout seul au retour sur l'app.
   - Avec la confirmation d'email activée, signUp ne crée PAS de session :
     l'utilisateur doit cliquer le lien reçu avant de pouvoir se connecter.
     C'est pour ça que l'écran d'inscription affiche « vérifie ta boîte mail »
     au lieu de connecter directement.
   - Google = redirection (signInWithOAuth) et non plus une popup.

  Toutes les fonctions throw en cas d'erreur — c'est aux composants d'attraper
  et d'afficher le message côté UI.
*/

import { supabase } from './config'
import { isUsernameTaken } from './db'

/**
 * Inscription par email + mot de passe.
 * Le pseudo est passé dans les métadonnées (options.data) : un trigger SQL
 * côté Supabase crée automatiquement la ligne `profiles` à partir de là.
 *
 * @returns {boolean} needsConfirmation - true si un mail de confirmation a
 *   été envoyé et qu'aucune session n'est encore ouverte (cas standard).
 */
export async function signUpWithEmail({ email, password, username, firstName, lastName }) {
  // Vérification d'unicité du pseudo avant création (sinon le trigger SQL
  // suffixerait silencieusement le pseudo en cas de collision).
  if (await isUsernameTaken(username)) {
    throw new Error('Ce nom d\'utilisateur est déjà pris.')
  }

  // Nom complet « Prénom Nom » : rempli la colonne full_name (profiles + Display
  // name côté Supabase Auth), comme le fait Google nativement. Le pseudo reste
  // distinct (c'est lui qu'on affiche en jeu).
  const fullName = [firstName, lastName].map((s) => (s || '').trim()).filter(Boolean).join(' ')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Métadonnées lues par le trigger handle_new_user (-> profiles.username / full_name)
      data: { username, full_name: fullName },
      // URL de retour après clic sur le lien de confirmation. Doit figurer
      // dans la liste blanche « Redirect URLs » du dashboard Supabase.
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) throw error

  // Si la confirmation d'email est activée, session est null tant que
  // l'utilisateur n'a pas cliqué le lien : on le signale au composant.
  const needsConfirmation = !data.session
  return needsConfirmation
}

/** Connexion par email + mot de passe. */
export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data.user
}

/**
 * Connexion / inscription via Google.
 * Redirige vers Google puis revient sur l'app : le client supabase-js récupère
 * automatiquement la session dans l'URL au retour. Le profil est créé par le
 * trigger SQL au premier login. Cette fonction ne « rend pas la main » en cas
 * de succès (la page navigue), seuls les échecs de configuration throwent.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

/** Déconnexion. */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Renvoie le mail de confirmation d'inscription (si l'utilisateur l'a manqué).
 * Supabase applique son propre rate limit côté serveur.
 */
export async function resendConfirmationEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

/**
 * Envoi d'un email de réinitialisation de mot de passe.
 * Le lien renvoie sur l'app avec une session de récupération : au retour,
 * supabase-js émet l'événement `PASSWORD_RECOVERY` (capté dans AuthContext),
 * ce qui déclenche l'affichage de l'écran de saisie du nouveau mot de passe.
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

/**
 * Définit un nouveau mot de passe pour l'utilisateur courant.
 * Appelée depuis l'écran ResetPassword, une fois que l'utilisateur est arrivé
 * via le lien de récupération (il a alors une session valide qui autorise
 * updateUser). Min 6 caractères, exigé par Supabase.
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
