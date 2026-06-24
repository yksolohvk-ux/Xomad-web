# Plateforme Administrative — Version HTML/JS/CSS

Application web complète en HTML, JavaScript (ES Modules) et CSS pur.

## Démarrage

### Option 1 : Serveur local (recommandé)

Cette app utilise les **ES Modules** (`type="module"`) qui nécessitent un serveur HTTP.

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Node.js (http-server)
npx http-server -p 8080
```

Puis ouvrez : **http://localhost:8080**

> ⚠️ **Ne pas ouvrir index.html directement** avec `file://` — les modules ES ne fonctionnent pas sans serveur HTTP.

### Option 2 : Extension VS Code

Utilisez l'extension **Live Server** dans VS Code, clic droit sur `index.html` → "Open with Live Server".

---

## Structure

```
plateforme-admin-vanilla/
├── index.html              ← Point d'entrée
├── css/
│   └── style.css           ← Tous les styles
├── js/
│   ├── app.js              ← Point d'entrée JS, routes
│   ├── firebase-config.js  ← Configuration Firebase
│   ├── store.js            ← État global
│   ├── router.js           ← Routing côté client
│   ├── api.js              ← Firestore / Storage
│   ├── utils.js            ← Utilitaires, icônes, toast
│   └── pages/
│       ├── auth.js         ← Connexion, inscription, mot de passe oublié
│       ├── dashboard.js    ← Tableau de bord, sidebar, bottom nav
│       ├── folders.js      ← Dossiers (liste, détail, nouveau, modifier)
│       ├── messages.js     ← Conversations et messagerie
│       ├── notifications.js← Notifications
│       ├── profile.js      ← Profil, sécurité, préférences
│       └── admin.js        ← Panel d'administration
└── assets/
    └── icon.png            ← Icône de l'app
```

## Technologies

- **HTML5** — Structure sémantique
- **CSS3** — Variables CSS, Flexbox, Grid, animations
- **JavaScript ES2022** — Modules natifs, async/await
- **Firebase v10** (CDN) — Auth, Firestore, Storage

## Fonctionnalités

- ✅ Authentification Firebase (email/mot de passe)
- ✅ Inscription avec champ SIRET
- ✅ Tableau de bord épuré (stats dossiers)
- ✅ Gestion des dossiers (CRUD complet)
- ✅ Upload de documents vers Firebase Storage
- ✅ Messagerie en temps réel (Firestore)
- ✅ Notifications en temps réel
- ✅ Profil utilisateur complet
- ✅ Mode sombre / clair
- ✅ Responsive (mobile + desktop)
- ✅ Navigation mobile (barre du bas) + Sidebar desktop
- ✅ Panel d'administration (rôle admin)
- ✅ Données de démonstration automatiques
- ✅ Recherche et filtres
- ✅ Toast notifications
- ✅ Squelettes de chargement

## Comptes de démonstration

Créez un compte via la page d'inscription, les données de démonstration seront ajoutées automatiquement.

Pour un compte **admin**, créez un compte puis modifiez manuellement le champ `role` à `"admin"` dans Firebase Console → Firestore → collection `users`.

## Déploiement

Ce projet peut être déployé sur n'importe quel hébergement statique :

- **Netlify** : glissez le dossier dans netlify.com/drop
- **Vercel** : `npx vercel`
- **GitHub Pages** : activez dans les paramètres du repo
- **Firebase Hosting** : `firebase deploy`
