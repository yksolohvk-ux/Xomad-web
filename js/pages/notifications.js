import { store } from '../store.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api.js';
import { icons, formatRelative, toast } from '../utils.js';
import { navigate } from '../router.js';
import { renderSidebar, renderBottomNav, setupLayoutListeners, updateNotifBadge } from './dashboard.js';

export async function renderNotifications() {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/notifications')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Notifications</h2>
          <div style="flex:1"></div>
          <button class="btn btn-ghost btn-sm" id="read-all-btn">Tout marquer lu</button>
        </div>
        <div class="page">
          <div class="card" style="padding:0;overflow:hidden" id="notif-list">
            ${[1,2,3].map(() => `
              <div class="notif-item">
                <div class="skeleton" style="width:36px;height:36px;border-radius:10px;flex-shrink:0"></div>
                <div style="flex:1;margin-left:12px">
                  <div class="skeleton" style="height:13px;width:60%;margin-bottom:6px"></div>
                  <div class="skeleton" style="height:12px;width:80%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/')}
  `;

  setupLayoutListeners();

  const typeIcons = {
    message: { icon: icons.message, bg: '#DBEAFE', color: '#1D4ED8' },
    document: { icon: icons.file, bg: '#FFF3DF', color: '#92400E' },
    folder: { icon: icons.folder, bg: '#E8F5E7', color: '#166534' },
    info: { icon: icons.info, bg: '#EDE9FE', color: '#6D28D9' },
  };

  let notifs = await getNotifications(user.uid);
  const unread = notifs.filter(n => !n.isRead).length;
  store.setUnreadNotifications(unread);
  updateNotifBadge();

  function renderList(list) {
    const container = document.getElementById('notif-list');
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div>${icons.bell}</div><h3>Aucune notification</h3><p>Vous êtes à jour !</p></div>`;
      return;
    }
    container.innerHTML = list.map(n => {
      const cfg = typeIcons[n.type] || typeIcons.info;
      return `
        <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" data-read="${n.isRead}">
          <div class="notif-icon" style="background:${cfg.bg};color:${cfg.color}">${cfg.icon}</div>
          <div style="flex:1">
            <div class="notif-title">${n.title}</div>
            <div class="notif-content">${n.content}</div>
            <div class="notif-time">${formatRelative(n.createdAt)}</div>
          </div>
          ${!n.isRead ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>` : ''}
        </div>
      `;
    }).join('');

    document.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        if (el.dataset.read === 'false') {
          await markNotificationRead(el.dataset.id);
          el.classList.remove('unread');
          el.dataset.read = 'true';
          el.querySelector('[style*="border-radius:50%"]')?.remove();
          const newUnread = store.unreadNotifications - 1;
          store.setUnreadNotifications(Math.max(0, newUnread));
          updateNotifBadge();
        }
      });
    });
  }

  renderList(notifs);

  document.getElementById('read-all-btn').addEventListener('click', async () => {
    await markAllNotificationsRead(user.uid);
    notifs = notifs.map(n => ({ ...n, isRead: true }));
    store.setUnreadNotifications(0);
    updateNotifBadge();
    renderList(notifs);
    toast('Toutes les notifications marquées comme lues.', 'success');
  });
}
