# Contexte complet du projet — SoundCheck

## Présentation du projet

**SoundCheck** est une application web de blind test musical multijoueur local, développée en React dans le cadre d'un projet scolaire (formation Big Data & IA, 2e année). Les joueurs écoutent un extrait audio de 8 secondes et le premier qui clique sur la bonne réponse parmi 4 propositions gagne 10 points. À la fin des manches, un podium affiche le classement final.

## Cahier des charges du prof

L'application doit démontrer la maîtrise des notions React :
- Composants, props, state, événements
- Formulaires
- Hooks (useState, useEffect)
- Organisation moderne d'une application

Critères imposés :
- Plusieurs composants React
- Navigation claire
- useState et useEffect utilisés
- Au moins un formulaire
- Gestion dynamique des données
- Design propre et responsive
- Personnalisée (pas un simple todo-list)
- Déployée en ligne

## Stack technique

- **React** avec **Vite**
- **Tailwind CSS**
- **Framer Motion** pour les animations
- **canvas-confetti** pour les effets de victoire
- Navigation entre écrans via `useState` (pas de React Router pour la V1)
- Pas de backend en V1 (uniquement frontend + APIs externes)
- Déploiement sur **Vercel**

## V2 — Firebase (en cours d'intégration)

Ajout de :
- **Firebase Authentication** (Email/Password + Google Sign-In)
- **Firestore** (NoSQL) pour la persistance

Fonctionnalités ajoutées :
- Comptes utilisateurs (inscription, connexion, mot de passe oublié)
- Mode invité conservé (jouer sans compte)
- Historique des parties pour utilisateurs connectés
- Leaderboard global (top 100, filtres par mode et période)

Structure Firestore :
- Collection `users` : profils utilisateurs avec stats agrégées
- Collection `games` : historique des parties
- Collection `leaderboard` : vue dénormalisée pour requêtes rapides

Utilisation d'un Context API (`AuthContext`) uniquement pour l'état d'authentification.

## APIs utilisées

### 1. API Deezer (modes classiques)
- Publique, sans clé requise
- Endpoints :
  - Recherche d'artiste : `https://api.deezer.com/search/artist?q={query}`
  - Top tracks : `https://api.deezer.com/artist/{id}/top?limit=50`
  - Recherche par genre : `https://api.deezer.com/search?q=genre:"rap"`
- Filtrer systématiquement les titres sans `preview`
- CORS : utiliser `https://corsproxy.io/?` en préfixe si nécessaire, ou configurer un proxy Vite

### 2. API AnimeThemes.moe (mode Otaku)
- Publique, sans clé requise
- Rate limit : 90 req/min, max 100 résultats par page
- Endpoint : `https://api.animethemes.moe/animetheme?include=anime,song,animethemeentries.videos.audio&filter[type]=OP&page[size]=100`
- Fichiers audio en OGG/WebM
- Mention légale à ajouter : "Audio fourni par AnimeThemes.moe. Projet non commercial à des fins éducatives."

## Les 5 modes de jeu

1. **Artiste solo** : barre de recherche, toutes les questions sur un seul artiste
2. **Multi-artistes** : recherche et sélection de plusieurs artistes (min 2)
3. **Genre** : sélection parmi liste prédéfinie (Rap, Pop, R&B, Afrobeat, Rock, Électro)
4. **Aléatoire** : pioche dans tout
5. **Otaku** : openings/endings d'anime, on devine le nom de l'anime (pas le titre/artiste)

## Logique de jeu

- Multijoueur local (1 à 5 joueurs)
- 5, 10 ou 15 manches par partie
- Extrait audio de **8 secondes** par question
- Timer de **15 secondes** par question
- Mode réactif : premier qui buzz sur la bonne réponse gagne 10 points
- Système d'attribution : raccourcis clavier (chaque joueur a une touche assignée)
- Si personne ne trouve : reveal, 0 point, manche suivante
- Reveal de 3 secondes après chaque réponse avec pochette + titre + artiste

## Structure des dossiers

```
soundcheck/
├── src/
│   ├── components/
│   │   ├── Home.jsx
│   │   ├── PlayerSetup.jsx
│   │   ├── ModeSelect.jsx
│   │   ├── Game.jsx
│   │   ├── Results.jsx
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── AuthLayout.jsx
│   │   ├── profile/
│   │   │   ├── Profile.jsx
│   │   │   └── History.jsx
│   │   ├── leaderboard/
│   │   │   └── Leaderboard.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       └── Input.jsx
│   ├── services/
│   │   ├── deezerApi.js
│   │   └── animeThemesApi.js
│   ├── firebase/
│   │   ├── config.js
│   │   ├── auth.js
│   │   └── firestore.js
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useGameHistory.js
│   ├── utils/
│   │   └── gameLogic.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Design

### Direction artistique
Editorial/magazine premium, inspiré de magazines de musique (The FADER, Pitchfork, Crack Magazine) et d'Apple Music.

Principes :
- Typographie démesurée, hiérarchies tranchées
- Grilles asymétriques
- Espaces noirs maîtrisés
- Mise en page magazine
- Élégance premium, prise de risque visuelle

### Palette
```css
--bg-primary: #0A0A0A;
--bg-card: #181818;
--bg-elevated: #232323;
--accent-green: #1DB954;
--accent-purple: #A855F7;
--accent-pink: #EC4899;
--accent-blue: #3B82F6;
--accent-otaku: #DC2626;
--text-primary: #FFFFFF;
--text-secondary: #B3B3B3;
--text-tertiary: #6B6B6B;
```

Chaque écran a une couleur dominante différente.

### Typographies
- **Bricolage Grotesque** pour les gros titres display
- **Space Grotesk** pour le corps
- **Instrument Serif** (italique) pour les accents editorial (numéros, labels, mots accentués)

### Animations (niveau riche)
- Transitions de page théâtrales (Framer Motion, easing custom `[0.22, 1, 0.36, 1]`, durées 600-800ms)
- Stagger reveal au chargement des écrans
- Visualiseur audio réactif (Web Audio API + AnalyserNode)
- Pochette d'album floutée en backdrop pendant le jeu (blur 100px, opacity 0.35)
- Confettis sur Results (canvas-confetti)
- Compteur de score animé (count-up)
- Timer circulaire SVG
- Pulse sur le bouton play
- Hover scale 1.02 + glow coloré

### Détails transversaux
- Grain texture overlay léger (SVG noise, opacity 0.03-0.05)
- Coins arrondis 8-24px
- Pas d'emojis ni d'icônes décoratives
- Curseur custom (optionnel)

## Préférences personnelles importantes

- Pas d'emojis, d'icônes décoratives, ni d'éléments superflus
- Code propre, ne pas avoir l'air "AI-generated"
- Commentaires en français
- Approche pédagogique : faire comprendre, pas juste copier-coller
- Pas de hashage de mots de passe (note : sans objet ici car Firebase gère)
- Pas de phrasing trailing/breathless dans les textes

## État actuel du projet

- [x] Setup Vite + Tailwind fait
- [x] V1 fonctionnelle (5 écrans, 4 modes Deezer)
- [x] Design V2 editorial appliqué
- [x] **V1 déployée sur Vercel** (sans Firebase encore)
- [x] Refonte flux Game V3 (réponse → attribution joueur) + responsive mobile (commit `d6d0c5c`)
- [x] **Firebase intégré, commit `bed603c` poussé sur Vercel le 2026-05-15** :
  - Auth Google opérationnelle
  - Auth Email/Password : `Login`, `Register`, `ForgotPassword`
  - Vérification d'email (`sendEmailVerification`) + bannière `EmailVerificationBanner` avec actions "renvoyer le lien" / "j'ai vérifié"
  - **Page de vérification custom `/verify`** : le lien du mail pointe sur l'app (pas sur Firebase). `VerifyEmail.jsx` détecte `?mode=verifyEmail&oobCode=...` au chargement, appelle `applyActionCode`, affiche un écran brandé (succès vert / erreur rose) puis redirige vers Home. L'utilisateur ne voit jamais d'UI Firebase générique.
  - **Mail HTML custom via EmailJS (en prod uniquement)** : Firebase Spark verrouillant les templates, on bypasse l'envoi Firebase. Serverless function Vercel `api/send-verification-email.js` génère le lien via Firebase Admin SDK puis envoie le mail via **EmailJS** (Gmail connecté côté EmailJS comme expéditeur). Le template HTML est stocké dans le dashboard EmailJS (pas dans le code) avec les variables `{{username}}`, `{{verification_link}}`, `{{to_email}}`. En dev local (Vite ne sert pas `/api/*`), fallback automatique sur `sendEmailVerification()` de Firebase. (Migration depuis Resend faite le 2026-05-15 — Resend imposait un domaine vérifié pour envoyer à d'autres adresses que celle du compte.)
  - Création auto du doc `users/{uid}` (avec `provider: 'password'` ou `'google'`, `username`, `totalScore`, `gamesPlayed`, `gamesWon`)
  - `useGameHistory` hook + écrans `Profile`, `History`, `Leaderboard`
- [x] **Vars d'env Firebase ajoutées dans Vercel** (6 `VITE_FIREBASE_*` client + 3 Firebase Admin serveur : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` + 4 EmailJS : `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`)
- [x] **Custom action URL Firebase** réglée sur l'URL Vercel
- [x] Push + déploiement Vercel réussi (le site se charge correctement après fix `auth/invalid-api-key`)
- [ ] **⚠️ Mail de vérif PAS REÇU en prod après inscription par email** — voir section "Problèmes ouverts" ci-dessous
- [ ] Mode Otaku ajouté (service `animeThemesApi.js` à créer)
- [ ] Durcir les règles Firestore (mode test expire dans 30j à compter de la création — créé le 2026-05-13 ish, donc expire vers le 2026-06-12)
- [ ] Customiser aussi le mail de reset password via Resend (actuellement encore en Firebase basique)

## Setup Firebase actuel (projet `soundcheck-8fe5d`)

- Plan : Spark (gratuit), Web app `soundcheck-web`
- Auth providers actifs : Email/Password + Google
- Firestore en `eur3` (multi-régional Europe, non modifiable), mode test
- Collection `users` créée automatiquement au login
- Schéma `users/{uid}` actuel :
  ```
  createdAt   : timestamp
  email       : string
  username    : string         (unique)
  photoURL    : string | null
  provider    : 'password' | 'google'
  totalScore  : number (init 0)
  gamesPlayed : number (init 0)
  gamesWon    : number (init 0)
  ```

## Consignes d'exécution pour Claude Code

- Implémenter par étapes
- Commenter en français
- Expliquer les choix techniques
- Ne pas casser le code existant
- Préciser les limitations connues
- Pour les requêtes Firestore, mentionner l'impact sur les quotas
- Approche propre et professionnelle, sans hacks

## Problèmes ouverts (à reprendre la prochaine fois)

### 1. ⚠️ Mail de vérif pas reçu en prod (2026-05-15)

**Symptôme** : après inscription par email sur la version Vercel déployée
(commit `bed603c`), AUCUN mail n'arrive — ni le mail HTML brandé Resend,
ni le mail Firebase basique en fallback.

**Contexte** :
- Le site Vercel se charge correctement (après fix `auth/invalid-api-key`
  en ajoutant les 6 `VITE_FIREBASE_*` qui manquaient).
- Les 5 env vars serveur (`FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`) sont déclarées sur Vercel.
- Le compte Firebase est bien créé (Firebase Auth list montre le user).
- En local avec `npm run dev`, le mail Firebase basique arrivait (fallback OK).

**Pistes à explorer dans l'ordre** :
1. **Vercel Functions logs** : Dashboard > projet > onglet "Logs" (ou
   "Functions") → filtrer sur `send-verification-email`. Lire l'erreur
   exacte. Probables suspects :
   - `FIREBASE_PRIVATE_KEY` mal formatée (les `\n` perdus, ou guillemets
     non retirés en copiant depuis le JSON service account)
   - `RESEND_API_KEY` invalide ou révoquée
   - `RESEND_FROM_EMAIL` rejeté par Resend (sender pas autorisé en test mode)
2. **Test mode Resend** : sans domaine vérifié, Resend n'accepte d'envoyer
   QU'À l'email avec lequel le compte Resend a été créé. Vérifier que
   l'utilisateur a bien testé l'inscription avec CETTE adresse précise.
3. **Vérifier dans le dashboard Resend** : section "Emails" → est-ce qu'il
   y a une trace de tentative d'envoi ? Si oui, son statut (delivered,
   bounced, rejected) ?
4. **Tester l'endpoint isolément** : depuis devtools Network ou curl,
   appeler `POST /api/send-verification-email` avec un body
   `{ "email": "test@test.com", "username": "test" }` et lire la réponse.

**Si le fallback Firebase ne s'est pas non plus déclenché**, c'est que
l'erreur côté serverless est silencieuse côté front (le front a peut-être
reçu un 200 menteur, ou l'inscription a une autre branche qui n'appelle
pas du tout `sendBrandedVerificationEmail`). À vérifier dans
`src/firebase/auth.js`.

### 2. UserMenu dropdown : clics non-fonctionnels

**Symptôme** : la dropdown du UserMenu (avatar en haut à droite de Home)
s'ouvre bien au clic sur l'avatar, mais les 4 items à l'intérieur
("Mon profil", "Mon historique", "Classement", "Se déconnecter") ne
déclenchent jamais leur `onClick` — même un `console.log` placé dans le
handler ne sort pas dans la console.

**Workaround actuel** : `src/components/Home.jsx` expose les 4 actions
en liens éditoriaux visibles directement (sous-composant `UserActions`).
La dropdown originale a été simplifiée — `UserMenu.jsx` n'affiche plus
qu'une carte d'identité (avatar + pseudo) sans interaction. Une note
dans le code rappelle de ne pas remettre de dropdown tant que le bug
n'est pas réparé.

**Pistes à explorer** :
1. Cache Vite stale (`rm -rf node_modules/.vite` puis `npm run dev`)
2. Inspection DOM avec DevTools picker : voir l'élément réellement au-dessus
   du bouton "Mon profil" via `document.elementsFromPoint(x, y)`
3. Tester sans `<StrictMode>` dans `main.jsx`
4. Tester en build de prod (`npm run build && npm run preview`)
5. Soupçon n°1 : `backdrop-blur-md` sur le motion.div de la dropdown qui
   casse le hit-testing dans certains contextes

**Note** : ce bug est ancien (existait avant les changements Firebase) et
n'est pas bloquant grâce au workaround `UserActions`.
