# Documentation technique — Portfolio Adem Arfaoui

Version du projet : 1.0
Stack : Node.js / Express (backend) + HTML/CSS/JS vanilla (frontend), stockage de données en fichier JSON.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Fonctionnalités du site public](#4-fonctionnalités-du-site-public)
5. [Le backend en détail](#5-le-backend-en-détail)
6. [Le tableau de bord admin](#6-le-tableau-de-bord-admin)
7. [Sécurité](#7-sécurité)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [Installation et lancement en local](#9-installation-et-lancement-en-local)
10. [Hébergement / déploiement](#10-hébergement--déploiement)
11. [Maintenance et dépannage](#11-maintenance-et-dépannage)
12. [Évolutions possibles](#12-évolutions-possibles)

---

## 1. Vue d'ensemble

Ce projet est un site portfolio personnel complet, composé de deux parties :

- **Un site public** (`/`, `/blog`, `/blog/:slug`) : présentation, projets, articles de blog, formulaire de contact. Thème sombre par défaut avec bascule vers un thème clair, entièrement responsive (mobile / tablette / desktop).
- **Un panneau d'administration** (`/admin`) : interface protégée par mot de passe permettant de gérer le contenu du site (projets, articles, messages reçus, CV) **sans toucher au code**.

Les deux parties communiquent via une **API REST** (`/api/...`) fournie par un petit serveur Express. Les données (projets, articles, messages) sont stockées dans un simple fichier `data/db.json` plutôt que dans une base de données classique (MySQL, MongoDB, etc.), ce qui simplifie énormément l'installation : il n'y a rien à configurer ni à héberger séparément.

---

## 2. Architecture générale

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Navigateur (site)  │  fetch  │   Serveur Express (Node)  │
│  public/index.html   │ ──────► │       server/index.js     │
│  public/blog.html    │ ◄────── │                            │
│  public/admin/...    │  JSON   │  Routes API (/api/...)    │
└─────────────────────┘         └───────────┬──────────────┘
                                              │ lit / écrit
                                              ▼
                                  ┌───────────────────────┐
                                  │   data/db.json          │
                                  │ (projets, articles,     │
                                  │  messages, réglages)    │
                                  └───────────────────────┘
```

**Principe clé :** les pages HTML ne contiennent quasiment pas de contenu en dur (sauf les infos personnelles fixes comme le nom ou l'e-mail). Tout le contenu dynamique (projets, articles) est chargé **au moment de l'affichage** via des appels `fetch()` vers l'API. C'est ce qui permet de modifier le contenu depuis `/admin` sans jamais éditer un fichier HTML.

---

## 3. Structure des fichiers

```
portfolio/
├── data/
│   └── db.json                # Toutes les données du site (voir §5.2)
├── public/                    # Tout ce qui est servi au navigateur
│   ├── index.html               # Page d'accueil
│   ├── blog.html                # Liste des articles
│   ├── post.html                # Page d'un article
│   ├── 404.html                 # Page d'erreur
│   ├── css/
│   │   ├── tokens.css            # Variables de couleurs, typographies, thème
│   │   ├── nav.css               # Barre de navigation
│   │   ├── hero.css              # Section d'accueil (hero)
│   │   ├── about.css             # Section "à propos" + compétences
│   │   ├── projects.css          # Grille de projets
│   │   └── sections.css          # Blog, contact, footer, notifications
│   ├── js/
│   │   ├── main.js               # Thème, menu mobile, animations au scroll
│   │   ├── toast.js               # Petites notifications ("toasts")
│   │   ├── projects.js            # Chargement + filtrage des projets (API)
│   │   ├── blog.js                # Chargement des articles (API)
│   │   ├── post.js                # Affichage d'un article précis
│   │   ├── contact.js             # Envoi du formulaire de contact
│   │   └── cv.js                  # Lien de téléchargement du CV
│   ├── admin/
│   │   ├── index.html            # Interface d'administration (SPA)
│   │   ├── css/admin.css          # Styles du tableau de bord
│   │   └── js/admin.js            # Toute la logique admin (CRUD, upload...)
│   ├── images/                  # Photos, logos, visuels des projets
│   ├── uploads/                 # Images ajoutées depuis /admin (générées)
│   └── cv/                      # CV PDF uploadé depuis /admin (généré)
├── server/                    # Le backend
│   ├── index.js                  # Point d'entrée : configure et lance le serveur
│   ├── db.js                     # Mini "moteur de base de données" en JSON
│   ├── middleware/
│   │   └── auth.js                # Vérifie qu'une requête admin est bien connectée
│   ├── routes/
│   │   ├── auth.js                # Connexion / déconnexion admin
│   │   ├── projects.js            # API des projets
│   │   ├── blog.js                # API des articles
│   │   ├── contact.js             # API du formulaire de contact
│   │   ├── messages.js            # API des messages reçus (admin)
│   │   ├── upload.js              # Upload d'images et du CV
│   │   └── settings.js            # Réglages publics (ex : lien du CV)
│   └── utils/
│       └── mailer.js              # Envoi d'e-mails (via SMTP)
├── scripts/
│   └── seed.js                  # Crée le compte admin à partir du .env
├── package.json                # Liste des dépendances et scripts npm
├── .env.example                 # Modèle des variables d'environnement
└── README.md                    # Guide de démarrage rapide
```

---

## 4. Fonctionnalités du site public

### 4.1 Thème sombre / clair

- **Où :** `public/css/tokens.css`, `public/js/main.js`.
- **Comment ça marche :** toutes les couleurs du site sont définies sous forme de *variables CSS* (ex. `--bg`, `--text`, `--accent`) dans `:root` (thème sombre, par défaut) et redéfinies dans un bloc `[data-theme="light"]` (thème clair). Le bouton en haut à droite de la navigation appelle `toggleTheme()`, qui :
  1. lit l'attribut `data-theme` actuel sur la balise `<html>` ;
  2. bascule entre `"dark"` et `"light"` ;
  3. sauvegarde le choix dans `localStorage` pour que le thème choisi soit mémorisé lors de la prochaine visite.
- Le thème par défaut, si l'utilisateur n'a jamais choisi, s'aligne sur la préférence système (`prefers-color-scheme`).

### 4.2 Navigation

- Barre flottante en pilule, fixée en haut de l'écran, avec effet de flou (`backdrop-filter`).
- Sur mobile, les liens se transforment en menu déroulant ouvert par le bouton "burger" (`data-nav-burger`).
- Un `IntersectionObserver` surveille quelle section de la page est visible à l'écran et met en surbrillance le lien correspondant dans le menu (effet "scrollspy").

### 4.3 Section d'accueil (Hero)

- Effet de "machine à écrire" sur les intitulés de poste (Full-Stack Developer / Front-End Engineer / ...), géré par la fonction `tick()` dans `main.js`, qui ajoute/retire des caractères un par un.
- Cartes flottantes animées (`hero-float-card`) avec une animation CSS `float` en boucle.
- Bouton **Télécharger le CV** : son lien `href` est mis à jour dynamiquement par `cv.js`, qui interroge `/api/settings` pour savoir si un CV a été uploadé par l'admin. S'il n'y en a pas encore, le bouton redirige vers la section contact.

### 4.4 Section "À propos"

- Contenu texte fixe (modifiable directement dans `index.html`), plus une liste de compétences techniques affichées sous forme de "puces" façon tags de code (`chip`).
- Animation d'apparition au scroll (classe `.reveal`, activée par un `IntersectionObserver` qui ajoute `.is-visible` quand l'élément entre dans le viewport).

### 4.5 Section Projets (dynamique)

- **Chargement :** au chargement de la page, `public/js/projects.js` appelle `GET /api/projects`, qui renvoie la liste des projets stockés dans `data/db.json`.
- **Filtrage par technologie :** la liste des *tags* uniques (ex. React, Node, CSS...) est calculée automatiquement à partir des projets existants, et un bouton de filtre est généré pour chacun. Cliquer sur un tag filtre la grille côté client (sans nouvel appel réseau).
- **Affichage :** chaque projet devient une carte avec image, badge "Featured" (mis en avant) si activé, catégorie, description, tags, et des icônes de lien (GitHub / démo en ligne) qui n'apparaissent qu'au survol.
- **États de chargement :** pendant le chargement, des "squelettes" animés (`skeleton`) s'affichent à la place des cartes, pour éviter un effet de saut de mise en page.

### 4.6 Section Blog (dynamique)

- Fonctionne comme les projets : `public/js/blog.js` appelle `GET /api/blog`, qui ne renvoie **que les articles publiés** (`published: true`) — les brouillons restent invisibles côté public.
- Sur la page d'accueil, seuls les 3 articles les plus récents sont affichés (`data-limit="3"`). La page `/blog` les affiche tous.
- Cliquer sur un article ouvre `/blog/:slug` (ex. `/blog/welcome-to-my-blog`), qui charge le contenu complet via `GET /api/blog/:slug` et l'injecte dans la page (`public/js/post.js`).

### 4.7 Formulaire de contact

- Géré par `public/js/contact.js` : à la soumission, les champs sont envoyés en JSON à `POST /api/contact`, sans recharger la page.
- Un champ invisible ("honeypot", `name="website"`) sert de piège à robots spammeurs : un humain ne le remplit jamais, donc si ce champ contient une valeur, le message est silencieusement ignoré côté serveur.
- Le message est **toujours** enregistré dans `data/db.json` (visible ensuite dans `/admin`), et un e-mail est envoyé **en tâche de fond** si les identifiants SMTP sont configurés (voir §5.6) — la réponse à l'utilisateur ne dépend jamais de la réussite de l'envoi d'e-mail, donc le formulaire reste rapide même si l'e-mail échoue.

### 4.8 Notifications ("toasts")

- `public/js/toast.js` fournit une fonction globale `showToast(message)` qui affiche une petite bulle en bas de l'écran pendant quelques secondes (ex. "Message envoyé avec succès").

### 4.9 Accessibilité et référencement (SEO)

- Balises `<meta name="description">`, Open Graph (`og:title`, `og:image`...) et Twitter Card pour un bel aperçu lors du partage sur les réseaux sociaux.
- Attributs `aria-label` sur les boutons icône, `alt` sur toutes les images, focus visible au clavier (`:focus-visible`).
- Respect de `prefers-reduced-motion` : les animations sont désactivées pour les utilisateurs qui l'ont demandé dans leur système.

---

## 5. Le backend en détail

### 5.1 Point d'entrée — `server/index.js`

C'est le fichier qui démarre tout. Il :
1. Charge les variables d'environnement (`dotenv`) et vérifie que `JWT_SECRET` est bien défini (sinon le serveur refuse de démarrer, par sécurité).
2. Configure les middlewares globaux : `cors` (autorise les requêtes du front), `express.json()` (parse les requêtes JSON), `cookie-parser` (lit les cookies de session).
3. Branche chaque groupe de routes sur son préfixe :
   - `/api/auth` → connexion admin
   - `/api/projects` → projets
   - `/api/blog` → articles
   - `/api/contact` → formulaire de contact
   - `/api/messages` → messages reçus (protégé)
   - `/api/upload` → upload d'images/CV (protégé)
   - `/api/settings` → réglages publics
4. Sert les fichiers statiques du dossier `public/` (HTML, CSS, JS, images).
5. Définit des routes "propres" pour les URLs sans extension (`/admin`, `/blog`, `/blog/:slug`) afin qu'elles renvoient la bonne page HTML.
6. Gère les erreurs 404 et les erreurs serveur inattendues de façon centralisée.

### 5.2 Stockage des données — `server/db.js`

Plutôt qu'une vraie base de données, ce projet utilise un fichier unique `data/db.json`, structuré ainsi :

```json
{
  "users": [ ... ],      // comptes admin (email + mot de passe haché)
  "projects": [ ... ],   // projets du portfolio
  "posts": [ ... ],      // articles de blog
  "messages": [ ... ],   // messages du formulaire de contact
  "settings": { "cvFile": "/cv/cv.pdf" }
}
```

Le module `db.js` propose des fonctions génériques inspirées d'une vraie base de données :
- `getAll(collection)` — récupérer toute une liste (ex. tous les projets),
- `getById(collection, id)` — récupérer un élément par son identifiant,
- `insert(collection, item)` — ajouter un élément (un identifiant `id` est généré automatiquement),
- `update(collection, id, patch)` — modifier un élément existant,
- `remove(collection, id)` — supprimer un élément.

**Point technique important :** toutes les écritures passent par une "file d'attente" (`writeQueue`) qui les exécute une par une, dans l'ordre, plutôt qu'en parallèle. Cela évite que deux requêtes simultanées (par exemple deux messages de contact envoyés en même temps) ne se marchent dessus et corrompent le fichier JSON. L'écriture se fait aussi de façon sécurisée : les données sont d'abord écrites dans un fichier temporaire (`db.json.tmp`), puis ce fichier remplace l'ancien (`rename`) — ce qui évite un fichier à moitié écrit en cas de coupure au mauvais moment.

### 5.3 Authentification — `server/middleware/auth.js` + `server/routes/auth.js`

- **Création du compte admin :** le script `scripts/seed.js` lit `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `.env`, transforme le mot de passe en une empreinte irréversible (hachage `bcrypt`), et l'enregistre dans `data/db.json`. Le mot de passe en clair n'est jamais stocké.
- **Connexion (`POST /api/auth/login`) :** compare le mot de passe fourni avec le hachage stocké (`bcrypt.compare`). Si c'est correct, un **jeton JWT** est généré (`signToken`) contenant l'identifiant et l'e-mail de l'admin, valable 7 jours, puis posé dans un cookie **httpOnly** (donc invisible et inaccessible depuis le JavaScript du navigateur, ce qui protège contre le vol de session par un script malveillant).
- **Vérification (`requireAdmin`) :** ce middleware est ajouté devant toutes les routes réservées à l'admin (création/modification/suppression de projets, articles, lecture des messages, upload...). Il lit le cookie, vérifie que le jeton JWT est valide et non expiré ; sinon, il renvoie une erreur `401 Unauthorized`.
- **Déconnexion (`POST /api/auth/logout`) :** supprime simplement le cookie.
- **Limitation des tentatives (`loginLimiter`) :** au maximum 10 tentatives de connexion par tranche de 15 minutes et par adresse IP, pour freiner les attaques par force brute sur le mot de passe.

### 5.4 API Projets — `server/routes/projects.js`

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/projects` | public | Liste tous les projets (filtrable par `?tag=` ou `?category=`) |
| GET | `/api/projects/:id` | public | Un projet précis |
| POST | `/api/projects` | admin | Créer un projet |
| PUT | `/api/projects/:id` | admin | Modifier un projet |
| DELETE | `/api/projects/:id` | admin | Supprimer un projet |

Chaque projet possède : `title`, `description`, `image`, `tags` (tableau), `category`, `githubUrl`, `liveUrl`, `featured` (booléen), `order` (pour l'ordre d'affichage).

### 5.5 API Blog — `server/routes/blog.js`

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/blog` | public | Articles **publiés**, triés du plus récent au plus ancien |
| GET | `/api/blog/all` | admin | Tous les articles, y compris les brouillons |
| GET | `/api/blog/:slug` | public | Un article précis via son "slug" (URL lisible) |
| POST | `/api/blog` | admin | Créer un article |
| PUT | `/api/blog/:id` | admin | Modifier un article |
| DELETE | `/api/blog/:id` | admin | Supprimer un article |

Le **slug** (ex. `mon-premier-article`) est généré automatiquement à partir du titre grâce à la librairie `slugify`. Si deux articles ont le même titre, un suffixe numérique est ajouté (`-2`, `-3`...) pour garder des URLs uniques.

### 5.6 Formulaire de contact — `server/routes/contact.js` + `server/utils/mailer.js`

1. Validation des champs (nom, e-mail, message non vides ; format d'e-mail correct ; message limité à 5000 caractères).
2. Vérification du champ piège ("honeypot") pour ignorer les robots.
3. Enregistrement du message dans `data/db.json`.
4. **Réponse immédiate** envoyée au navigateur (le message est sauvegardé, c'est l'essentiel).
5. **Envoi d'e-mail en arrière-plan**, sans bloquer la réponse : `mailer.js` utilise `nodemailer` pour se connecter au serveur SMTP configuré dans `.env` et envoyer une notification. Si le SMTP n'est pas configuré, ou si l'envoi échoue, le message reste quand même consultable depuis `/admin` — rien n'est perdu.
6. Limité à **5 envois par heure et par IP** (`contactLimiter`) pour éviter les abus.

### 5.7 Upload de fichiers — `server/routes/upload.js`

Utilise `multer` pour gérer l'upload de fichiers :
- **Images** (`POST /api/upload/image`) : formats acceptés PNG/JPEG/WEBP/GIF/SVG, taille max 5 Mo, stockées dans `public/uploads/` avec un nom de fichier "assaini" (minuscules, sans caractères spéciaux, préfixé d'un horodatage pour éviter les doublons).
- **CV** (`POST /api/upload/cv`) : uniquement des PDF, taille max 8 Mo, stocké dans `public/cv/cv.pdf` (remplace l'ancien à chaque upload), et le chemin est enregistré dans les réglages (`settings.cvFile`).
- Ces deux routes sont protégées par `requireAdmin`.

### 5.8 Réglages publics — `server/routes/settings.js`

Expose uniquement les informations non sensibles nécessaires au site public (actuellement : le lien du CV). Sert d'intermédiaire pour ne jamais exposer publiquement l'ensemble des réglages internes.

---

## 6. Le tableau de bord admin

Accessible à l'adresse **`/admin`**. C'est une application à page unique (SPA) : une seule page HTML (`public/admin/index.html`), dont le contenu change dynamiquement selon l'état (connecté / non connecté, onglet sélectionné...) grâce à `public/admin/js/admin.js`.

### 6.1 Écran de connexion

Formulaire e-mail / mot de passe qui appelle `POST /api/auth/login`. En cas de succès, l'interface bascule automatiquement vers le tableau de bord.

### 6.2 Onglet Projets

- Tableau listant tous les projets (image, titre, catégorie, tags, mise en avant).
- Bouton **"+ New project"** qui ouvre une fenêtre modale avec un formulaire complet : titre, description, catégorie, tags (séparés par des virgules), lien GitHub, lien de démo, image de couverture (upload direct), case "Mis en avant".
- Icônes **Modifier** / **Supprimer** sur chaque ligne (la suppression demande une confirmation).

### 6.3 Onglet Blog

- Tableau listant tous les articles (y compris les brouillons), avec leur statut (**Published** / **Draft**) et leur date.
- Bouton **"+ New post"** : formulaire titre, extrait (résumé, généré automatiquement si laissé vide), image de couverture, contenu (texte brut ou HTML simple), case "Published" pour choisir s'il est visible sur le site.

### 6.4 Onglet Messages

- Liste de tous les messages reçus via le formulaire de contact, les plus récents en premier.
- Un message non lu est mis en évidence (bordure colorée) et affiche un bouton "Mark as read".
- Bouton "Delete" pour supprimer un message traité.
- Un badge sur l'onglet indique le nombre de messages non lus.

### 6.5 Onglet Réglages

- Upload du CV (PDF), avec affichage du fichier actuellement en ligne.
- Rappel de la procédure pour changer l'e-mail/mot de passe admin (modifier `.env` puis relancer `npm run seed`).

---

## 7. Sécurité

Résumé des mesures mises en place :

| Mesure | Où | Pourquoi |
|---|---|---|
| Mots de passe hachés (bcrypt) | `scripts/seed.js` | Le mot de passe en clair n'est jamais stocké |
| Session via JWT + cookie httpOnly | `middleware/auth.js` | Le jeton de session est inaccessible au JavaScript du navigateur (protection contre le vol par script malveillant / XSS) |
| Limitation de débit (rate limiting) | `routes/auth.js`, `routes/contact.js` | Freine les attaques par force brute et le spam |
| Champ honeypot | Formulaire de contact | Piège les robots spammeurs basiques |
| Validation stricte des entrées | `routes/contact.js`, `routes/projects.js`, `routes/blog.js` | Évite les données invalides ou malformées |
| Filtrage des types de fichiers uploadés | `routes/upload.js` | Empêche l'upload de fichiers dangereux (seuls images et PDF sont acceptés) |
| `.env` exclu du dépôt Git | `.gitignore` | Les secrets (mots de passe, clés) ne sont jamais publiés |

---

## 8. Variables d'environnement

Fichier `.env` (voir `.env.example` pour le modèle) :

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute du serveur (par défaut 3000) |
| `NODE_ENV` | `development` en local, `production` une fois déployé (active les cookies sécurisés HTTPS) |
| `SITE_URL` | URL publique du site déployé |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Utilisés uniquement par `npm run seed` pour créer le compte admin |
| `JWT_SECRET` | Clé secrète servant à signer les sessions de connexion — doit rester privée |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Identifiants du serveur d'envoi d'e-mails, pour que le formulaire de contact vous notifie par mail |
| `CONTACT_TO_EMAIL` | Adresse qui recevra les notifications du formulaire de contact |

---

## 9. Installation et lancement en local

```bash
npm install                 # installe les dépendances
cp .env.example .env        # crée votre fichier de configuration
# → éditer .env : JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (et SMTP_* si besoin)
npm run seed                 # crée le compte administrateur
npm start                     # démarre le serveur
```

Le site est alors disponible sur `http://localhost:3000`, et l'admin sur `http://localhost:3000/admin`.

---

## 10. Hébergement / déploiement

Ce projet est un serveur **Node.js classique** (pas de fonctions "serverless", pas de build front à compiler) : il tourne sur n'importe quel hébergeur capable d'exécuter du Node, à condition de pouvoir **conserver des fichiers entre les déploiements** (voir point d'attention ci-dessous).

### 10.1 Option recommandée : Render

1. Créez un dépôt Git (GitHub/GitLab) contenant le projet (`.env` ne doit **pas** être poussé, il est déjà ignoré par `.gitignore`).
2. Sur [render.com](https://render.com), créez un nouveau **Web Service**, connecté à votre dépôt.
3. Paramètres de build :
   - **Build command :** `npm install`
   - **Start command :** `npm start`
4. Dans l'onglet **Environment**, ajoutez toutes les variables listées au §8 (`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_*`...).
5. Ajoutez un **disque persistant** (Render → "Disks") monté par exemple sur `/opt/render/project/src/data` et `/opt/render/project/src/public/uploads` — sinon vos projets/articles/messages/CV disparaîtront à chaque nouveau déploiement, puisque le système de fichiers est réinitialisé.
6. Une fois le premier déploiement terminé, ouvrez le **Shell** de Render et lancez `npm run seed` pour créer votre compte admin.
7. Votre site est en ligne à l'URL fournie par Render (ex. `https://votre-site.onrender.com`).

### 10.2 Alternatives équivalentes

- **Railway** ([railway.app](https://railway.app)) : même principe, avec des "Volumes" persistants à attacher au service.
- **Fly.io** ([fly.io](https://fly.io)) : utilise des "Volumes" également ; nécessite un `fly.toml` (non fourni par défaut, à générer avec `fly launch`).
- **VPS classique** (ex. un serveur Ubuntu chez OVH, Hetzner, DigitalOcean...) :
  1. Installez Node.js 18+ sur le serveur.
  2. Copiez le projet (`git clone` ou `scp`).
  3. `npm install`, configurez `.env`, `npm run seed`.
  4. Lancez le serveur en tâche de fond avec un gestionnaire de process comme **PM2** (`pm2 start server/index.js --name portfolio`) pour qu'il redémarre automatiquement en cas de crash ou de reboot du serveur.
  5. Mettez un reverse proxy devant (Nginx ou Caddy) pour gérer le nom de domaine et le certificat HTTPS (Let's Encrypt, gratuit).

### 10.3 Point d'attention : la persistance des données

Comme les données (`data/db.json`, `public/uploads/`, `public/cv/`) sont de simples fichiers sur le disque, il faut s'assurer qu'ils **survivent aux redéploiements** :
- Sur les hébergeurs modernes (Render, Railway, Fly.io) : attacher un **disque/volume persistant** à ces trois emplacements.
- Sur un VPS classique : aucun souci, le disque est déjà permanent.
- **À éviter :** les plateformes purement "serverless" (comme Vercel en configuration par défaut), où le système de fichiers est réinitialisé à chaque exécution — ce projet ne conviendrait pas tel quel à ce type d'hébergement sans migrer vers une vraie base de données externe.

### 10.4 Nom de domaine et HTTPS

La plupart des hébergeurs cités (Render, Railway, Fly.io) fournissent HTTPS automatiquement, y compris pour un nom de domaine personnalisé que vous pointez vers eux (via un enregistrement DNS `CNAME` ou `A`). Sur un VPS, HTTPS est géré via Nginx/Caddy + Let's Encrypt comme indiqué ci-dessus.

---

## 11. Maintenance et dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le serveur refuse de démarrer avec une erreur sur `JWT_SECRET` | Variable absente du `.env` | Ajouter une valeur (voir §8) |
| Impossible de se connecter sur `/admin` | Mauvais e-mail/mot de passe, ou `npm run seed` jamais lancé | Relancer `npm run seed` après avoir vérifié `.env` |
| Le formulaire de contact ne m'envoie pas d'e-mail | Variables `SMTP_*` non configurées ou incorrectes | Voir §5.6 et le README (section Gmail) — les messages restent visibles dans `/admin` dans tous les cas |
| Après un redéploiement, mes projets/articles ont disparu | Pas de disque persistant configuré chez l'hébergeur | Voir §10.3 |
| Modifier mon nom / ma bio / mes liens de contact | Ces informations sont écrites en dur dans `public/index.html` (volontairement, car elles changent rarement) | Éditer directement le fichier, puis redéployer |
| Changer le mot de passe admin | — | Modifier `ADMIN_PASSWORD` dans `.env` puis relancer `npm run seed` |

---

## 12. Évolutions possibles

Pistes pour faire grandir le projet si besoin :

- **Base de données réelle** (PostgreSQL, MongoDB...) si le trafic ou le volume de contenu devient important — `server/db.js` est conçu comme une couche isolée, remplaçable sans toucher aux routes.
- **Éditeur de texte enrichi** (type WYSIWYG) pour les articles de blog, à la place du champ texte/HTML brut actuel.
- **Recherche** dans les articles ou les projets.
- **Pagination** si le nombre de projets/articles devient élevé.
- **Multi-langue** (FR/EN) si le public visé est international.
- **Statistiques de visite** (ex. Plausible, Umami — solutions respectueuses de la vie privée) pour savoir qui consulte le site.
