import { store } from '../store.js';
import { getFolders } from '../api.js';
import { icons, getStatusBadge, formatDate, getInitials, avatarColors } from '../utils.js';
import { navigate } from '../router.js';

export async function renderDashboard() {
  const app = document.getElementById('app');
  const profile = store.userProfile;
  const user = store.user;

  if (!user || !profile) { navigate('/connexion'); return; }

  const initials = getInitials(profile.firstName, profile.lastName);
  const color = avatarColors(user.uid);

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon mobile-menu-btn" id="menu-btn">${icons.menu}</button>
          <div style="flex:1"></div>
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-ghost btn-icon" id="notif-btn" style="position:relative">
              ${icons.bell}
              <span class="bottom-nav-badge" id="notif-badge" style="display:none"></span>
            </button>
            <div class="avatar avatar-sm" style="background:${color};cursor:pointer" id="profile-btn">${initials}</div>
          </div>
        </div>
        <div class="page">
          <div class="card mb-4" style="background:linear-gradient(135deg,#1464E8 0%,#3b7ff5 100%);border:none">
            <div style="display:flex;align-items:center;gap:14px">
              <div class="avatar avatar-lg" style="background:rgba(255,255,255,0.2);color:#fff;font-size:22px">${initials}</div>
              <div style="color:#fff">
                <div style="font-size:14px;opacity:.8">Bonjour !</div>
                <div style="font-size:22px;font-weight:700">${profile.firstName} ${profile.lastName}</div>
                <div style="font-size:13px;opacity:.75">${profile.email}</div>
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="section-title">Statut des dossiers</div>
            <div class="stats-grid" id="stats-grid">
              <div class="stat-card"><div class="skeleton" style="height:36px;width:60px;margin:0 auto 8px"></div><div class="stat-label">En cours</div></div>
              <div class="stat-card"><div class="skeleton" style="height:36px;width:60px;margin:0 auto 8px"></div><div class="stat-label">À compléter</div></div>
              <div class="stat-card"><div class="skeleton" style="height:36px;width:60px;margin:0 auto 8px"></div><div class="stat-label">Terminés</div></div>
            </div>
          </div>

          <div class="card">
            <div class="page-header">
              <div class="section-title" style="margin:0">Derniers dossiers</div>
              <button class="btn btn-ghost btn-sm" data-href="/dossiers">Voir tout →</button>
            </div>
            <div id="recent-folders">
              ${[1,2,3].map(() => `<div class="folder-item"><div class="skeleton" style="width:40px;height:40px;border-radius:10px"></div><div style="flex:1;margin-left:12px"><div class="skeleton" style="height:14px;width:60%;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:40%"></div></div></div>`).join('')}
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  // Load folders
  const folders = await getFolders(user.uid);
  const inProgress = folders.filter(f => f.status === 'in_progress').length;
  const toComplete = folders.filter(f => f.status === 'additional_information_required').length;
  const completed = folders.filter(f => f.status === 'completed').length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card stat-blue"><div class="stat-number">${inProgress}</div><div class="stat-label">En cours</div></div>
    <div class="stat-card stat-orange"><div class="stat-number">${toComplete}</div><div class="stat-label">À compléter</div></div>
    <div class="stat-card stat-green"><div class="stat-number">${completed}</div><div class="stat-label">Terminés</div></div>
  `;

  const recent = folders.slice(0, 3);
  document.getElementById('recent-folders').innerHTML = recent.length === 0
    ? `<div class="empty-state" style="padding:24px"><p>Aucun dossier pour l'instant.</p></div>`
    : recent.map(f => `
      <div class="folder-item" data-href="/dossiers/${f.id}">
        <div class="folder-icon">${icons.folder}</div>
        <div class="folder-info">
          <div class="folder-title">${f.title}</div>
          <div class="folder-meta"><span>${formatDate(f.createdAt)}</span><span>${f.category}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${getStatusBadge(f.status)}
          <span class="folder-arrow">${icons.arrow_right}</span>
        </div>
      </div>
    `).join('');
}

// ===== SIDEBAR =====
export function renderSidebar(activePath) {
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <img src="assets/icon.png" alt="Logo">
        <span>Plateforme<br>Administrative</span>
      </div>
      <nav class="sidebar-nav">
        <a href="#" data-href="/" class="${activePath === '/' ? 'active' : ''}">${icons.home}<span class="nav-label">Accueil</span></a>
        <a href="#" data-href="/dossiers" class="${activePath.startsWith('/dossiers') ? 'active' : ''}">${icons.folder}<span class="nav-label">Mes dossiers</span></a>
        <a href="#" data-href="/messages" class="${activePath.startsWith('/messages') ? 'active' : ''}">${icons.message}<span class="nav-label">Messages</span><span class="nav-badge" id="sb-msg-badge" style="display:none"></span></a>
        <a href="#" data-href="/notifications" class="${activePath.startsWith('/notifications') ? 'active' : ''}">${icons.bell}<span class="nav-label">Notifications</span><span class="nav-badge" id="sb-notif-badge" style="display:none"></span></a>
        <a href="#" data-href="/profil" class="${activePath.startsWith('/profil') ? 'active' : ''}">${icons.user}<span class="nav-label">Mon profil</span></a>
        ${store.userProfile?.role === 'admin' ? `<div class="separator"></div><a href="#" data-href="/admin" class="${activePath.startsWith('/admin') ? 'active' : ''}">${icons.admin}<span class="nav-label">Administration</span></a>` : ''}
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-user" data-href="/profil">
          <div class="avatar avatar-sm" style="background:${avatarColors(store.user?.uid)}">${getInitials(store.userProfile?.firstName, store.userProfile?.lastName)}</div>
          <div>
            <div class="user-name">${store.userProfile?.firstName} ${store.userProfile?.lastName}</div>
            <div class="user-role">${store.userProfile?.role || 'user'}</div>
          </div>
        </div>
      </div>
    </aside>
    <div id="sidebar-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:99" id="sidebar-overlay"></div>
  `;
}

// ===== BOTTOM NAV =====
export function renderBottomNav(activePath) {
  const isHome = activePath === '/';
  const isFolders = activePath.startsWith('/dossiers');
  const isMessages = activePath.startsWith('/messages');
  const isProfile = activePath.startsWith('/profil');
  return `
    <nav class="bottom-nav">
      <button class="bottom-nav-item ${isHome?'active':''}" data-href="/">${icons.home}<span>Accueil</span><span class="nav-dot"></span></button>
      <button class="bottom-nav-item ${isFolders?'active':''}" data-href="/dossiers">${icons.folder}<span>Dossiers</span><span class="nav-dot"></span></button>
      <button class="bottom-nav-plus" data-href="/dossiers/nouveau">${icons.plus}</button>
      <button class="bottom-nav-item ${isMessages?'active':''}" data-href="/messages" style="position:relative">
        ${icons.message}<span>Messages</span><span class="nav-dot"></span>
        <span class="bottom-nav-badge" id="bottom-msg-badge" style="display:none"></span>
      </button>
      <button class="bottom-nav-item ${isProfile?'active':''}" data-href="/profil">${icons.user}<span>Profil</span><span class="nav-dot"></span></button>
    </nav>
  `;
}

export function setupLayoutListeners() {
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.style.display = 'none';
    });
  }
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) notifBtn.addEventListener('click', () => navigate('/notifications'));
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) profileBtn.addEventListener('click', () => navigate('/profil'));
}

export function updateNotifBadge() {
  const count = store.unreadNotifications;
  ['notif-badge','sb-notif-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = count; el.style.display = count > 0 ? 'inline-block' : 'none'; }
  });
}
