import { store } from '../store.js';
import { getConversations, getMessages, listenMessages, sendMessage } from '../api.js';
import { icons, formatRelative, formatTime, getInitials, avatarColors, debounce, toast } from '../utils.js';
import { navigate } from '../router.js';
import { renderSidebar, renderBottomNav, setupLayoutListeners, updateNotifBadge } from './dashboard.js';

export async function renderMessages() {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/messages')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Messages</h2>
        </div>
        <div class="page">
          <div class="search-bar">
            <div class="search-input">
              ${icons.search}
              <input type="text" id="search-conv" placeholder="Rechercher une conversation..." style="padding-left:38px">
            </div>
          </div>
          <div class="card" style="padding:0;overflow:hidden" id="conv-list">
            ${[1,2,3,4].map(() => `
              <div class="conversation-item">
                <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>
                <div style="flex:1;margin-left:12px">
                  <div class="skeleton" style="height:14px;width:40%;margin-bottom:6px"></div>
                  <div class="skeleton" style="height:12px;width:70%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/messages')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  const convs = await getConversations(user.uid);

  function renderConvList(list) {
    const container = document.getElementById('conv-list');
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div>${icons.message}</div><h3>Aucune conversation</h3><p>Vous n'avez pas encore de messages.</p></div>`;
      return;
    }
    container.innerHTML = list.map(c => {
      const otherId = c.participants?.find(p => p !== user.uid);
      const otherName = c.participantNames?.[otherId] || 'Inconnu';
      const initials = getInitials(...otherName.split(' '));
      const color = avatarColors(otherId || '');
      const unread = c.unreadCounts?.[user.uid] || 0;
      return `
        <div class="conversation-item" data-href="/messages/${c.id}">
          <div class="avatar" style="background:${color}">${initials}</div>
          <div class="conv-info">
            <div class="conv-name">${otherName}</div>
            <div class="conv-last">${c.lastMessage || 'Aucun message'}</div>
          </div>
          <div class="conv-meta">
            <span class="conv-time">${formatRelative(c.lastMessageAt)}</span>
            ${unread > 0 ? `<span class="conv-unread">${unread}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  renderConvList(convs);

  document.getElementById('search-conv').addEventListener('input', debounce(e => {
    const q = e.target.value.toLowerCase();
    const filtered = q ? convs.filter(c => {
      const otherId = c.participants?.find(p => p !== user.uid);
      const name = c.participantNames?.[otherId] || '';
      return name.toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q);
    }) : convs;
    renderConvList(filtered);
  }, 250));
}

export function renderConversation({ id }) {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/messages')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left}</button>
          <div style="display:flex;align-items:center;gap:10px;margin-left:8px" id="conv-header-info">
            <div class="skeleton" style="width:36px;height:36px;border-radius:50%"></div>
            <div class="skeleton" style="width:120px;height:14px"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;height:calc(100vh - 61px)">
          <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px">
            <div class="date-sep">Chargement...</div>
          </div>
          <div class="chat-input-area">
            <input type="text" id="msg-input" placeholder="Écrire un message..." style="border-radius:24px;padding:10px 16px">
            <button class="btn btn-primary btn-icon" id="send-btn">${icons.send}</button>
          </div>
        </div>
      </main>
    </div>
  `;

  setupLayoutListeners();

  let convData = null;
  let otherName = '';
  let otherId = '';

  // Load conversation info
  import('../api.js').then(({ getConversation }) => {
    getConversation(id).then(c => {
      if (!c) return;
      convData = c;
      otherId = c.participants?.find(p => p !== user.uid) || '';
      otherName = c.participantNames?.[otherId] || 'Inconnu';
      const initials = getInitials(...otherName.split(' '));
      const color = avatarColors(otherId);
      document.getElementById('conv-header-info').innerHTML = `
        <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
        <span style="font-size:15px;font-weight:600">${otherName}</span>
      `;
    });
  });

  // Listen to messages
  const unsubscribe = listenMessages(id, msgs => {
    const container = document.getElementById('chat-messages');
    if (msgs.length === 0) {
      container.innerHTML = `<div class="date-sep">Aucun message. Soyez le premier à écrire !</div>`;
      return;
    }
    container.innerHTML = msgs.map(m => {
      const isSent = m.senderId === user.uid;
      return `
        <div class="message-bubble ${isSent ? 'sent' : 'received'}">
          <div class="bubble">${escapeHtml(m.content)}</div>
          <div class="bubble-time">${formatTime(m.createdAt)}</div>
        </div>
      `;
    }).join('');
    container.scrollTop = container.scrollHeight;
  });

  // Send message
  async function doSend() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content) return;
    input.value = '';
    try {
      await sendMessage(id, user.uid, content);
    } catch (err) {
      toast('Erreur lors de l\'envoi.', 'error');
    }
  }

  document.getElementById('send-btn').addEventListener('click', doSend);
  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  return { cleanup: () => unsubscribe && unsubscribe() };
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
