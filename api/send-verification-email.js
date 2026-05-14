/*
  Serverless function Vercel — envoi du mail de vérification d'adresse mail
  brandé SoundCheck (HTML custom) via Resend.
  ---------------------------------------------------------------------------
  Pourquoi cette fonction existe :
   Firebase Auth en plan Spark verrouille les templates d'email (impossible
   de mettre du HTML perso). On bypasse donc l'envoi côté Firebase :
   - On utilise l'Admin SDK pour GÉNÉRER le lien de vérif officiel (oobCode
     signé, expiration, usage-unique), mais sans envoyer le mail.
   - On envoie ensuite NOTRE propre mail HTML via Resend.

  Le front (src/firebase/auth.js) appelle cette route après
  createUserWithEmailAndPassword(). En dev local (Vite), la route /api/ n'est
  pas servie → le front fait un fallback sur sendEmailVerification() de
  Firebase pour ne pas bloquer le développement.

  Variables d'env requises (Vercel) :
   - RESEND_API_KEY        : clé API du compte Resend
   - RESEND_FROM_EMAIL     : "Nom <email@domaine>" (test mode possible :
                             "SoundCheck <onboarding@resend.dev>")
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY

  Sécurité : on n'expose AUCUN secret au front. La route ne fait que recevoir
  un email et déclencher un envoi. Si quelqu'un l'appelle avec un email
  arbitraire, le seul effet est un mail à cette adresse — Firebase ne crée
  pas de compte tant que l'utilisateur ne s'inscrit pas côté client.
*/

import { Resend } from 'resend'
import { getAdminAuth } from './_lib/firebase-admin.js'
import { buildVerificationEmail } from './_lib/verification-email.js'

export default async function handler(req, res) {
  // CORS basique — même domaine en prod, mais utile pour les preview deploys
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  // Vercel parse automatiquement le JSON quand Content-Type est application/json
  const { email, username } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email manquant ou invalide.' })
  }

  try {
    // 1) Génération du lien officiel via l'Admin SDK.
    // Le lien retourné respecte le "Custom action URL" configuré dans la
    // console Firebase (Auth > Templates > Email address verification).
    // En dev il pointe sur http://localhost:5173/, en prod il pointera sur
    // l'URL Vercel — selon ce qu'on a réglé dans la console.
    const actionLink = await getAdminAuth().generateEmailVerificationLink(email)

    // 2) Construction du mail brandé
    const { subject, html, text } = buildVerificationEmail({
      username: username || null,
      actionLink,
    })

    // 3) Envoi via Resend
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY manquante côté Vercel.')
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'SoundCheck <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Resend error:', error)
      return res
        .status(502)
        .json({ error: error.message || 'Resend a refusé l\'envoi.' })
    }

    return res.status(200).json({ success: true, id: data?.id })
  } catch (err) {
    console.error('send-verification-email error:', err)
    return res
      .status(500)
      .json({ error: err?.message || 'Erreur serveur lors de l\'envoi.' })
  }
}
