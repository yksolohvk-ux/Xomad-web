import { store } from '../store.js';
import { getAllUsers, getFolders } from '../api.js';
import { icons, getStatusBadge, formatDate, getInitials, avatarColors, toast } from '../utils.js';
import { navigate } from '../router.js';
import { renderSidebar, renderBottomNav, setupLayoutListeners, updateNotifBadge } from './dashboard.js';

export async function renderAdminDashboard() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user || !profile) { navigate('/connexion'); return; }
  if (profile.role !== 'admin') { navigate('/'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/admin')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Administration</h2>
        </div>
        <div class="page">
          <div class="stats-grid" id="admin-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
            ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton" style="height:36px;width:60px;margin:0 auto 8px"></div><div class="skeleton" style="height:12px;width:80%;margin:0 auto"></div></div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="card" style="cursor:pointer" data-href="/admin/utilisateurs">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:48px;height:48px;border-radius:14px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary)">${icons.users}</div>
                <div><div style="font-size:15px;font-weight:600">Utilisateurs</div><div style="font-size:13px;color:var(--text-secondary)">Gérer les comptes</div></div>
                <span class="menu-arrow" style="margin-left:auto">${icons.arrow_right}</span>
              </div>
            </div>
            <div class="card" style="cursor:pointer" data-href="/admin/dossiers">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:48px;height:48px;border-radius:14px;background:var(--green-bg);display:flex;align-items:center;justify-content:center;color:var(--green)">${icons.folder}</div>
                <div><div style="font-size:15px;font-weight:600">Dossiers</div><div style="font-size:13px;color:var(--text-secondary)">Tous les dossiers</div></div>
                <span class="menu-arrow" style="margin-left:auto">${icons.arrow_right}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  const [users, folders] = await Promise.all([getAllUsers(), getAllFolders()]);
  const inProgress = folders.filter(f => f.status === 'in_progress').length;
  const completed = folders.filter(f => f.status === 'completed').length;

  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-card stat-blue"><div class="stat-number">${users.length}</div><div class="stat-label">Utilisateurs</div></div>
    <div class="stat-card"><div class="stat-number" style="font-size:24px">${folders.length}</div><div class="stat-label">Dossiers total</div></div>
    <div class="stat-card stat-orange"><div class="stat-number">${inProgress}</div><div class="stat-label">En cours</div></div>
    <div class="stat-card stat-green"><div class="stat-number">${completed}</div><div class="stat-label">Terminés</div></div>
  `;
}

async function getAllFolders() {
  const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const { db } = await import('../firebase-config.js');
  const snap = await getDocs(collection(db, 'folders'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function renderAdminUsers() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user || profile?.role !== 'admin') { navigate('/'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/admin')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Utilisateurs</h2>
        </div>
        <div class="page" style="max-width:100%">
          <div class="card" style="padding:0;overflow:hidden">
            <div style="overflow-x:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Inscription</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="users-table">
                  <tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-secondary)">Chargement...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/')}
  `;

  setupLayoutListeners();

  const users = await getAllUsers();

  document.getElementById('users-table').innerHTML = users.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-secondary)">Aucun utilisateur.</td></tr>`
    : users.map(u => {
      const initials = getInitials(u.firstName, u.lastName);
      const color = avatarColors(u.uid || u.id);
      const roleBadge = u.role === 'admin' ? 'badge-red' : u.role === 'agent' ? 'badge-purple' : 'badge-blue';
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${u.firstName || ''} ${u.lastName || ''}</div>
              </div>
            </div>
          </td>
          <td style="font-size:13px;color:var(--text-secondary)">${u.email}</td>
          <td><span class="badge ${roleBadge}">${u.role || 'user'}</span></td>
          <td style="font-size:13px;color:var(--text-secondary)">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" title="Voir le profil">${icons.eye}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
}

export async function renderAdminFolders() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user || profile?.role !== 'admin') { navigate('/'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/admin')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Dossiers (Admin)</h2>
        </div>
        <div class="page" style="max-width:100%">
          <div class="search-bar">
            <div class="search-input">
              ${icons.search}
              <input type="text" id="admin-search" placeholder="Rechercher..." style="padding-left:38px">
            </div>
          </div>
          <div class="card" style="padding:0;overflow:hidden">
            <div style="overflow-x:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Docs</th>
                  </tr>
                </thead>
                <tbody id="admin-folders-table">
                  <tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-secondary)">Chargement...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/')}
  `;

  setupLayoutListeners();

  const folders = await getAllFolders();

  function renderTable(list) {
    document.getElementById('admin-folders-table').innerHTML = list.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-secondary)">Aucun dossier.</td></tr>`
      : list.map(f => `
        <tr style="cursor:pointer" data-href="/dossiers/${f.id}">
          <td style="font-weight:600;font-size:13px">${f.title}</td>
          <td style="font-size:13px;color:var(--text-secondary)">${f.category}</td>
          <td>${getStatusBadge(f.status)}</td>
          <td style="font-size:13px;color:var(--text-secondary)">${formatDate(f.createdAt)}</td>
          <td style="font-size:13px">${(f.documents||[]).length}</td>
        </tr>
      `).join('');
  }

  renderTable(folders);

  document.getElementById('admin-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(q ? folders.filter(f => f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)) : folders);
  });
}
