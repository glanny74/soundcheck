/*
  Serverless function Vercel — envoi du mail de vérification d'adresse mail
  brandé SoundCheck via EmailJS.
  ---------------------------------------------------------------------------
  Pourquoi cette fonction existe :
   Firebase Auth en plan Spark verrouille les templates d'email (impossible
   d'y mettre du HTML perso). On bypasse donc l'envoi côté Firebase :
   - On utilise l'Admin SDK pour GÉNÉRER le lien de vérif officiel (oobCode
     signé, expiration, usage-unique), mais sans envoyer le mail.
   - On envoie ensuite NOTRE propre mail HTML via EmailJS.

  Le front (src/firebase/auth.js) appelle cette route après
  createUserWithEmailAndPassword(). En dev local (Vite), la route /api/ n'est
  pas servie → le front fait un fallback sur sendEmailVerification() de
  Firebase pour ne pas bloquer le développement.

  Pourquoi EmailJS (vs Resend) :
   Resend en plan gratuit exige un domaine vérifié pour envoyer à n'importe
   qui (en test mode, il ne sert que l'email du compte). EmailJS utilise le
   compte Gmail connecté pour envoyer, donc pas de restriction de destinataire.
   Plan gratuit : 200 mails/mois — largement suffisant pour un projet école.

  Le template HTML lui-même est défini dans le dashboard EmailJS, pas dans
  le code (contrainte EmailJS). On lui passe juste les variables.

  Variables d'env requises (Vercel) :
   - EMAILJS_SERVICE_ID    : ID du service email (Gmail) configuré sur EmailJS
   - EMAILJS_TEMPLATE_ID   : ID du template "SoundCheck Verification"
   - EMAILJS_PUBLIC_KEY    : clé publique du compte EmailJS
   - EMAILJS_PRIVATE_KEY   : clé privée (recommandée pour usage server-side)
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY

  Sécurité : on n'expose AUCUN secret au front. La route ne fait que recevoir
  un email et déclencher un envoi. Si quelqu'un l'appelle avec un email
  arbitraire, le seul effet est un mail à cette adresse — Firebase ne crée
  pas de compte tant que l'utilisateur ne s'inscrit pas côté client.
*/

import emailjs from '@emailjs/nodejs'
import { getAdminAuth } from './_lib/firebase-admin.js'

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
    // En prod il doit pointer sur l'URL Vercel ; en dev sur http://localhost:5173/.
    const actionLink = await getAdminAuth().generateEmailVerificationLink(email)

    // 2) Vérification des credentials EmailJS
    const {
      EMAILJS_SERVICE_ID: serviceId,
      EMAILJS_TEMPLATE_ID: templateId,
      EMAILJS_PUBLIC_KEY: publicKey,
      EMAILJS_PRIVATE_KEY: privateKey,
    } = process.env

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      throw new Error('Variables EMAILJS_* manquantes côté Vercel.')
    }

    // 3) Envoi via EmailJS. Les noms des variables doivent matcher EXACTEMENT
    // ceux utilisés dans le template EmailJS (to_email, username, verification_link).
    const result = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: email,
        username: username || 'joueur',
        verification_link: actionLink,
      },
      {
        publicKey,
        privateKey,
      }
    )

    return res.status(200).json({
      success: true,
      status: result.status,
      text: result.text,
    })
  } catch (err) {
    // EmailJS renvoie ses erreurs avec une propriété `text` parlante (ex:
    // "The Public Key is invalid", "Service not found", etc.). On log un
    // max pour faciliter le diagnostic via les Vercel Function logs.
    const detail = err?.text || err?.message || String(err)
    console.error('send-verification-email error:', detail, err)
    return res.status(502).json({ error: detail })
  }
}
