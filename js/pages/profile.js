import { store } from '../store.js';
import { updateUserProfile, getUserProfile } from '../api.js';
import { icons, toast, getInitials, avatarColors } from '../utils.js';
import { navigate } from '../router.js';
import { logout } from './auth.js';
import { renderSidebar, renderBottomNav, setupLayoutListeners, updateNotifBadge } from './dashboard.js';
import { auth } from '../firebase-config.js';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function renderProfile() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user || !profile) { navigate('/connexion'); return; }

  const initials = getInitials(profile.firstName, profile.lastName);
  const color = avatarColors(user.uid);

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/profil')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Mon profil</h2>
        </div>
        <div class="page">
          <div class="profile-card mb-4">
            <div class="avatar avatar-xl" style="background:${color}">${initials}</div>
            <div>
              <div style="font-size:18px;font-weight:700">${profile.firstName} ${profile.lastName}</div>
              <div style="font-size:14px;color:var(--text-secondary)">${profile.email}</div>
              ${profile.phone ? `<div style="font-size:13px;color:var(--text-secondary)">${profile.phone}</div>` : ''}
              <span class="badge badge-blue" style="margin-top:6px">${profile.role || 'user'}</span>
            </div>
          </div>

          <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
            <div class="profile-menu-item" data-href="/profil/informations">
              <div class="menu-icon">${icons.user}</div>
              <span class="menu-label">Informations personnelles</span>
              <span class="menu-arrow">${icons.chevron_right}</span>
            </div>
            <div class="profile-menu-item" data-href="/profil/securite">
              <div class="menu-icon">${icons.shield}</div>
              <span class="menu-label">Sécurité</span>
              <span class="menu-arrow">${icons.chevron_right}</span>
            </div>
            <div class="profile-menu-item" data-href="/profil/documents">
              <div class="menu-icon">${icons.file}</div>
              <span class="menu-label">Mes documents</span>
              <span class="menu-arrow">${icons.chevron_right}</span>
            </div>
            <div class="profile-menu-item" data-href="/profil/preferences">
              <div class="menu-icon">${icons.settings}</div>
              <span class="menu-label">Préférences</span>
              <span class="menu-arrow">${icons.chevron_right}</span>
            </div>
            <div class="profile-menu-item" data-href="/a-propos">
              <div class="menu-icon">${icons.info}</div>
              <span class="menu-label">À propos</span>
              <span class="menu-arrow">${icons.chevron_right}</span>
            </div>
          </div>

          <div class="card" style="padding:8px">
            <button class="logout-btn" id="logout-btn">
              ${icons.logout}
              Déconnexion
            </button>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
  });
}

export function renderPersonalInfo() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user || !profile) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/profil')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <h1 class="page-title">Informations personnelles</h1>
          <form id="info-form">
            <div class="card mb-4">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Prénom</label>
                  <input type="text" id="firstName" value="${profile.firstName || ''}" required>
                </div>
                <div class="form-group">
                  <label for="lastName">Nom</label>
                  <input type="text" id="lastName" value="${profile.lastName || ''}" required>
                </div>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" value="${profile.email || ''}" disabled style="opacity:0.6">
                <p class="form-hint">L'email ne peut pas être modifié ici.</p>
              </div>
              <div class="form-group">
                <label for="phone">Téléphone</label>
                <input type="tel" id="phone" value="${profile.phone || ''}">
              </div>
              ${profile.siret ? `<div class="form-group"><label>SIRET</label><input type="text" value="${profile.siret}" disabled style="opacity:0.6"></div>` : ''}
              <div class="form-row">
                <div class="form-group">
                  <label for="address">Adresse</label>
                  <input type="text" id="address" value="${profile.address || ''}">
                </div>
                <div class="form-group">
                  <label for="postalCode">Code postal</label>
                  <input type="text" id="postalCode" value="${profile.postalCode || ''}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="city">Ville</label>
                  <input type="text" id="city" value="${profile.city || ''}">
                </div>
                <div class="form-group">
                  <label for="country">Pays</label>
                  <input type="text" id="country" value="${profile.country || 'France'}">
                </div>
              </div>
              <div class="form-group">
                <label for="birthDate">Date de naissance</label>
                <input type="date" id="birthDate" value="${profile.birthDate || ''}">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="save-btn">Enregistrer</button>
          </form>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;

  setupLayoutListeners();

  document.getElementById('info-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = 'Enregistrement...';
    const data = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      postalCode: document.getElementById('postalCode').value.trim(),
      city: document.getElementById('city').value.trim(),
      country: document.getElementById('country').value.trim(),
      birthDate: document.getElementById('birthDate').value,
    };
    await updateUserProfile(user.uid, data);
    Object.assign(store.userProfile, data);
    store.setUserProfile({ ...store.userProfile, ...data });
    toast('Profil mis à jour.', 'success');
    btn.disabled = false; btn.textContent = 'Enregistrer';
  });
}

export function renderSecurity() {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/profil')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <h1 class="page-title">Sécurité</h1>
          <div class="card mb-4">
            <div class="section-title">Modifier le mot de passe</div>
            <form id="pw-form">
              <div class="form-group">
                <label for="current-pw">Mot de passe actuel</label>
                <input type="password" id="current-pw" required>
              </div>
              <div class="form-group">
                <label for="new-pw">Nouveau mot de passe</label>
                <input type="password" id="new-pw" required minlength="6">
              </div>
              <div class="form-group">
                <label for="confirm-pw">Confirmer le nouveau mot de passe</label>
                <input type="password" id="confirm-pw" required minlength="6">
              </div>
              <button type="submit" class="btn btn-primary" id="pw-btn">Modifier le mot de passe</button>
            </form>
          </div>
          <div class="card" style="padding:16px">
            <div class="section-title">Compte</div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Email connecté : <strong>${user.email}</strong></p>
            <button class="btn btn-danger btn-sm" id="logout-all-btn">${icons.logout} Déconnecter tous les appareils</button>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;

  setupLayoutListeners();

  document.getElementById('pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const currentPw = document.getElementById('current-pw').value;
    const newPw = document.getElementById('new-pw').value;
    const confirmPw = document.getElementById('confirm-pw').value;
    if (newPw !== confirmPw) { toast('Les mots de passe ne correspondent pas.', 'error'); return; }
    const btn = document.getElementById('pw-btn');
    btn.disabled = true; btn.textContent = 'Modification...';
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      toast('Mot de passe modifié avec succès.', 'success');
      document.getElementById('pw-form').reset();
    } catch (err) {
      toast(err.code === 'auth/wrong-password' ? 'Mot de passe actuel incorrect.' : 'Erreur de modification.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Modifier le mot de passe';
    }
  });

  document.getElementById('logout-all-btn').addEventListener('click', async () => {
    await logout();
  });
}

export function renderPreferences() {
  const app = document.getElementById('app');
  const user = store.user;
  const profile = store.userProfile;
  if (!user) { navigate('/connexion'); return; }

  const currentTheme = store.theme;

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/profil')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <h1 class="page-title">Préférences</h1>
          <div class="card mb-4">
            <div class="section-title">Apparence</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${[
                { id: 'light', label: 'Mode clair', icon: icons.sun },
                { id: 'dark', label: 'Mode sombre', icon: icons.moon },
                { id: 'system', label: 'Système', icon: icons.settings },
              ].map(t => `
                <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:2px solid ${currentTheme===t.id?'var(--primary)':'var(--border)'};border-radius:12px;cursor:pointer;transition:all 200ms">
                  <input type="radio" name="theme" value="${t.id}" ${currentTheme===t.id?'checked':''} style="accent-color:var(--primary)">
                  <span style="color:var(--primary)">${t.icon}</span>
                  <span style="font-size:14px;font-weight:500">${t.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="card mb-4">
            <div class="section-title">Langue</div>
            <select id="lang-select">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <button class="btn btn-primary" id="save-prefs-btn">Enregistrer les préférences</button>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;

  setupLayoutListeners();

  // Live theme preview
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', e => {
      const theme = e.target.value === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : e.target.value;
      store.setTheme(theme);
      // Update border styles
      document.querySelectorAll('input[name="theme"]').forEach(r => {
        r.closest('label').style.borderColor = r.checked ? 'var(--primary)' : 'var(--border)';
      });
    });
  });

  document.getElementById('save-prefs-btn').addEventListener('click', async () => {
    const theme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
    await updateUserProfile(user.uid, { preferences: { theme } });
    toast('Préférences enregistrées.', 'success');
  });
}

export function renderAbout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/a-propos')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <div class="card" style="text-align:center;padding:40px">
            <img src="assets/icon.png" style="width:80px;height:80px;border-radius:20px;margin-bottom:20px">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Plateforme Administrative</h1>
            <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px">Version 1.0.0</p>
            <p style="font-size:14px;color:var(--text-secondary);max-width:400px;margin:0 auto;line-height:1.6">
              Une plateforme complète pour gérer vos dossiers administratifs, vos documents, et communiquer avec votre équipe administrative.
            </p>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;
  setupLayoutListeners();
}

export function renderProfileDocuments() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/profil')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <h1 class="page-title">Mes documents</h1>
          <div class="card">
            <div class="empty-state">
              <div>${icons.file}</div>
              <h3>Aucun document personnel</h3>
              <p>Ajoutez des documents personnels à votre profil.</p>
              <button class="btn btn-primary mt-3">${icons.upload} Ajouter un document</button>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/profil')}
  `;
  setupLayoutListeners();
}
