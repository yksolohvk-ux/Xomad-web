import { renderLogin, renderRegister, renderForgotPassword } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderFolderList, renderFolderDetail, renderNewFolder, renderEditFolder } from './pages/folders.js';
import { renderMessages, renderConversation } from './pages/messages.js';
import { renderNotifications } from './pages/notifications.js';
import { renderProfile, renderPersonalInfo, renderSecurity, renderPreferences, renderAbout, renderProfileDocuments } from './pages/profile.js';
import { renderAdminDashboard, renderAdminUsers, renderAdminFolders } from './pages/admin.js';
import { registerRoute, initRouter, navigate, getRoutePath } from './router.js';
import { store } from './store.js';
import { getUserProfile, seedDemoData, listenNotifications } from './api.js';
import { auth } from './firebase-config.js';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const AUTH_TIMEOUT_MS = 10000;
let stopNotifications = null;

function buildFallbackProfile(user) {
  const nameParts = (user?.displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    uid: user.uid,
    firstName: nameParts[0] || user.email?.split('@')[0] || 'Utilisateur',
    lastName: nameParts.slice(1).join(' '),
    email: user.email || '',
    phone: user.phoneNumber || '',
    photoURL: user.photoURL || null,
    siret: null,
    role: 'user',
    preferences: { theme: 'light' },
    isFallbackProfile: true
  };
}

function ensureLocalSession(user) {
  if (!user) return null;
  store.setUser(user);

  if (!store.userProfile || store.userProfile.uid !== user.uid) {
    const fallback = buildFallbackProfile(user);
    store.setUserProfile(fallback);
    store.setTheme(fallback.preferences.theme);
  }

  return user;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} a dépassé ${timeoutMs} ms`)), timeoutMs);
    })
  ]);
}

function startNotificationListener(user) {
  if (stopNotifications) {
    try { stopNotifications(); } catch (_) { /* listener already stopped */ }
    stopNotifications = null;
  }

  if (!user) {
    store.setUnreadNotifications(0);
    return;
  }

  try {
    stopNotifications = listenNotifications(user.uid, notifs => {
      const unread = notifs.filter(n => !n.isRead).length;
      store.setUnreadNotifications(unread);
      document.querySelectorAll('[id$="notif-badge"]').forEach(el => {
        el.textContent = unread;
        el.style.display = unread > 0 ? 'inline-block' : 'none';
      });
    });
  } catch (error) {
    console.warn('[notifications] Listener indisponible :', error);
  }
}

async function hydrateUserProfile(user) {
  try {
    const profile = await withTimeout(
      getUserProfile(user.uid),
      AUTH_TIMEOUT_MS,
      'Le chargement du profil'
    );

    if (!profile || auth.currentUser?.uid !== user.uid) return;

    store.setUserProfile(profile);
    store.setTheme(profile.preferences?.theme || 'light');

    // Les données de démonstration ne doivent jamais bloquer le démarrage.
    seedDemoData(user.uid, profile).catch(error => {
      console.warn('[seed] Données de démonstration ignorées :', error);
    });
  } catch (error) {
    // Une règle Firestore, un index absent ou une coupure réseau ne doit pas
    // maintenir l'utilisateur indéfiniment sur l'écran de chargement.
    console.warn('[profile] Profil Firestore indisponible, profil local utilisé :', error);
  }
}

async function initialiseAuthentication() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.warn('[auth] Persistance locale indisponible :', error);
  }

  return new Promise(resolve => {
    let initialStateResolved = false;

    const finishInitialState = user => {
      if (initialStateResolved) return;
      initialStateResolved = true;
      clearTimeout(timeoutId);
      resolve(user || null);
    };

    const timeoutId = setTimeout(() => {
      const user = auth.currentUser || store.user || null;
      if (user) ensureLocalSession(user);
      finishInitialState(user);
    }, AUTH_TIMEOUT_MS);

    onAuthStateChanged(
      auth,
      user => {
        if (user) {
          ensureLocalSession(user);
          startNotificationListener(user);
          finishInitialState(user);
          hydrateUserProfile(user);
        } else {
          store.setUser(null);
          store.setUserProfile(null);
          startNotificationListener(null);
          finishInitialState(null);
        }
      },
      error => {
        console.error('[auth] Impossible de restaurer la session :', error);
        const user = auth.currentUser || null;
        if (user) ensureLocalSession(user);
        finishInitialState(user);
      }
    );
  });
}

// Auth guard helper. Firebase peut déjà avoir restauré l'utilisateur avant
// que le profil Firestore soit disponible : un profil local évite la boucle
// connexion -> chargement -> connexion.
function requireAuth(renderFn) {
  return params => {
    const user = store.user || auth.currentUser;
    if (!user) {
      navigate('/connexion');
      return;
    }

    ensureLocalSession(user);
    return renderFn(params);
  };
}

// Register all routes
registerRoute('/connexion', renderLogin);
registerRoute('/inscription', renderRegister);
registerRoute('/mot-de-passe-oublie', renderForgotPassword);

registerRoute('/', requireAuth(renderDashboard));
registerRoute('/dossiers', requireAuth(renderFolderList));
registerRoute('/dossiers/nouveau', requireAuth(renderNewFolder));
registerRoute('/dossiers/:id', requireAuth(renderFolderDetail));
registerRoute('/dossiers/:id/modifier', requireAuth(renderEditFolder));
registerRoute('/messages', requireAuth(renderMessages));
registerRoute('/messages/:id', requireAuth(renderConversation));
registerRoute('/notifications', requireAuth(renderNotifications));
registerRoute('/profil', requireAuth(renderProfile));
registerRoute('/profil/informations', requireAuth(renderPersonalInfo));
registerRoute('/profil/securite', requireAuth(renderSecurity));
registerRoute('/profil/documents', requireAuth(renderProfileDocuments));
registerRoute('/profil/preferences', requireAuth(renderPreferences));
registerRoute('/a-propos', requireAuth(renderAbout));
registerRoute('/admin', requireAuth(renderAdminDashboard));
registerRoute('/admin/utilisateurs', requireAuth(renderAdminUsers));
registerRoute('/admin/dossiers', requireAuth(renderAdminFolders));

function renderLoadingScreen() {
  document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
      <div style="text-align:center">
        <img src="assets/icon.png" alt="Xomad" style="width:64px;height:64px;border-radius:16px;margin-bottom:16px">
        <div style="width:32px;height:32px;border:3px solid var(--primary-light);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto"></div>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
}

function renderStartupError(error) {
  console.error('[startup]', error);
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card" style="text-align:center">
        <img src="assets/icon.png" alt="Xomad" style="width:64px;height:64px;border-radius:16px;margin-bottom:16px">
        <h1 style="font-size:20px;margin-bottom:8px">Impossible de démarrer l'application</h1>
        <p style="color:var(--text-secondary);margin-bottom:20px">
          Vérifiez votre connexion Internet puis relancez l'application.
        </p>
        <button class="btn btn-primary btn-full" id="startup-retry">Réessayer</button>
      </div>
    </div>
  `;
  document.getElementById('startup-retry')?.addEventListener('click', () => location.reload());
}

async function main() {
  renderLoadingScreen();

  const user = await initialiseAuthentication();
  initRouter();

  const path = getRoutePath();
  const publicPaths = ['/connexion', '/inscription', '/mot-de-passe-oublie'];

  if (!user && !publicPaths.includes(path)) {
    navigate('/connexion');
  } else if (user && publicPaths.includes(path)) {
    navigate('/');
  }
}

main().catch(renderStartupError);
