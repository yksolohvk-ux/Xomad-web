import { initAuth } from './pages/auth.js';
import { renderLogin, renderRegister, renderForgotPassword } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderFolderList, renderFolderDetail, renderNewFolder, renderEditFolder } from './pages/folders.js';
import { renderMessages, renderConversation } from './pages/messages.js';
import { renderNotifications } from './pages/notifications.js';
import { renderProfile, renderPersonalInfo, renderSecurity, renderPreferences, renderAbout, renderProfileDocuments } from './pages/profile.js';
import { renderAdminDashboard, renderAdminUsers, renderAdminFolders } from './pages/admin.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { store } from './store.js';
import { listenNotifications } from './api.js';

// Auth guard helper
function requireAuth(renderFn) {
  return (params) => {
    if (!store.user) { navigate('/connexion'); return; }
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

// Initialize app
async function main() {
  // Show loading screen
  document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
      <div style="text-align:center">
        <img src="assets/icon.png" style="width:64px;height:64px;border-radius:16px;margin-bottom:16px">
        <div style="width:32px;height:32px;border:3px solid var(--primary-light);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto"></div>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  // Wait for auth state
  const user = await initAuth();

  // Set up real-time notification listener
  if (user) {
    listenNotifications(user.uid, (notifs) => {
      const unread = notifs.filter(n => !n.isRead).length;
      store.setUnreadNotifications(unread);
      // Update badges if visible
      document.querySelectorAll('[id$="notif-badge"]').forEach(el => {
        el.textContent = unread;
        el.style.display = unread > 0 ? 'inline-block' : 'none';
      });
    });
  }

  // Handle initial route
  const path = location.pathname;
  const publicPaths = ['/connexion', '/inscription', '/mot-de-passe-oublie'];

  if (!user && !publicPaths.includes(path)) {
    navigate('/connexion');
  } else if (user && publicPaths.includes(path)) {
    navigate('/');
  } else {
    initRouter();
  }
}

main().catch(console.error);
