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
- [x] **Firebase intégré (working tree, non-commit)** :
  - Auth Google opérationnelle (testée)
  - Auth Email/Password : code complet (`Login`, `Register`, `ForgotPassword`)
  - Vérification d'email (`sendEmailVerification`) + bannière `EmailVerificationBanner` avec actions "renvoyer le lien" / "j'ai vérifié"
  - **Page de vérification custom `/verify`** : le lien du mail pointe sur l'app (pas sur Firebase). `VerifyEmail.jsx` détecte `?mode=verifyEmail&oobCode=...` au chargement, appelle `applyActionCode`, affiche un écran brandé (succès vert / erreur rose) puis redirige vers Home. L'utilisateur ne voit jamais d'UI Firebase générique.
  - **Mail HTML custom via Resend (en prod uniquement)** : Firebase Spark verrouillant les templates, on bypasse l'envoi Firebase. Serverless function Vercel `api/send-verification-email.js` génère le lien via Firebase Admin SDK puis envoie un mail HTML brandé SoundCheck via Resend. En dev local (Vite ne sert pas `/api/*`), fallback automatique sur `sendEmailVerification()` de Firebase pour ne pas bloquer le développement.
  - Création auto du doc `users/{uid}` (avec `provider: 'password'` ou `'google'`, `username`, `totalScore`, `gamesPlayed`, `gamesWon`)
  - `useGameHistory` hook + écrans `Profile`, `History`, `Leaderboard`
- [ ] **Test bout-en-bout local de l'auth email** (signup → mail de vérif → login → logout)
- [ ] **Vars d'env Firebase ajoutées dans Vercel** (avant push) — voir `.env.example`. En plus des 6 `VITE_FIREBASE_*` côté client, il faut maintenant aussi : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service account), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- [ ] **Custom action URL Firebase à mettre à jour selon l'env** : actuellement `http://localhost:5173/` (dev). Avant chaque déploiement Vercel, changer dans Firebase Console > Auth > Templates > Email verification > "customize action URL" → mettre l'URL Vercel. (Une seule valeur possible côté Firebase, pas de séparation dev/prod automatique.)
- [ ] Commit de l'intégration Firebase
- [ ] Re-déploiement Vercel
- [ ] Mode Otaku ajouté (service `animeThemesApi.js` à créer)
- [ ] Durcir les règles Firestore (mode test expire dans 30j à compter de la création)

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
