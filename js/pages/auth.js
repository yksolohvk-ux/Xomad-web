import { auth, db } from '../firebase-config.js';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  signInWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { toast, icons, getPasswordStrength } from '../utils.js';
import { navigate } from '../router.js';
import { store } from '../store.js';
import { getUserProfile, seedDemoData } from '../api.js';

const googleProvider = new GoogleAuthProvider();

const googleIconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;

async function handleGoogleSignIn() {
  const btn = document.getElementById('google-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `${googleIconSVG} <span>Connexion en cours...</span>`; }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        firstName,
        lastName,
        email: user.email,
        phone: user.phoneNumber || '',
        photoURL: user.photoURL || null,
        siret: null,
        role: 'user',
        createdAt: new Date().toISOString(),
        preferences: { theme: 'light' }
      });
      toast('Compte Google créé avec succès !', 'success');
    } else {
      toast('Connexion Google réussie !', 'success');
    }
    navigate('/');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      toast(err.message || 'Erreur de connexion Google.', 'error');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = `${googleIconSVG} <span>Continuer avec Google</span>`; }
  }
}

function renderDivider(text = 'ou') {
  return `
    <div class="auth-divider">
      <span class="divider-line"></span>
      <span class="divider-text">${text}</span>
      <span class="divider-line"></span>
    </div>
  `;
}

// ===== LOGIN PAGE =====
export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <img src="assets/icon.png" alt="Logo">
          <h1>Plateforme Administrative</h1>
          <p>Connectez-vous pour accéder à vos dossiers</p>
        </div>

        <button class="btn btn-google btn-full btn-lg" id="google-btn" type="button">
          ${googleIconSVG}
          <span>Continuer avec Google</span>
        </button>

        ${renderDivider('ou avec un email')}

        <form id="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="votre@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <div class="label-row">
              <label for="password">Mot de passe</label>
              <a href="#" id="forgot-link" class="forgot-link">Oublié ?</a>
            </div>
            <div class="input-group">
              <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password">
              <span class="input-icon" id="toggle-pw">${icons.eye}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-group">
              <input type="checkbox" id="remember">
              <span>Se souvenir de moi</span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-btn">
            Se connecter
          </button>
        </form>
        <p class="auth-footer">
          Pas encore de compte ? <a href="#" id="register-link">S'inscrire</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('google-btn').addEventListener('click', handleGoogleSignIn);
  document.getElementById('register-link').addEventListener('click', e => { e.preventDefault(); navigate('/inscription'); });
  document.getElementById('forgot-link').addEventListener('click', e => { e.preventDefault(); navigate('/mot-de-passe-oublie'); });

  let pwVisible = false;
  document.getElementById('toggle-pw').addEventListener('click', () => {
    pwVisible = !pwVisible;
    const inp = document.getElementById('password');
    inp.type = pwVisible ? 'text' : 'password';
    document.getElementById('toggle-pw').innerHTML = pwVisible ? icons.eye_off : icons.eye;
  });

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Connexion...`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Aucun compte avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      };
      toast(msgs[err.code] || 'Erreur de connexion.', 'error');
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });
}

// ===== REGISTER PAGE =====
export function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page" style="padding:24px 24px 40px">
      <div class="auth-card" style="max-width:480px">
        <div class="auth-logo">
          <img src="assets/icon.png" alt="Logo">
          <h1>Créer un compte</h1>
          <p>Rejoignez la Plateforme Administrative</p>
        </div>

        <button class="btn btn-google btn-full btn-lg" id="google-btn" type="button">
          ${googleIconSVG}
          <span>S'inscrire avec Google</span>
        </button>

        ${renderDivider('ou avec un email')}

        <form id="register-form">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Prénom</label>
              <input type="text" id="firstName" required autocomplete="given-name">
            </div>
            <div class="form-group">
              <label for="lastName">Nom</label>
              <input type="text" id="lastName" required autocomplete="family-name">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="phone">Téléphone</label>
              <input type="tel" id="phone" placeholder="+33 6 00 00 00 00" required>
            </div>
          </div>
          <div class="form-group">
            <label for="siret">Numéro SIRET <span class="optional">(optionnel)</span></label>
            <input type="text" id="siret" placeholder="123 456 789 01234" maxlength="17" inputmode="numeric">
            <p class="form-hint">14 chiffres identifiant votre entreprise</p>
          </div>
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="input-group">
              <input type="password" id="password" required minlength="6" autocomplete="new-password">
              <span class="input-icon" id="toggle-pw">${icons.eye}</span>
            </div>
            <div class="pw-strength mt-1" id="pw-strength" style="display:none">
              <div class="pw-strength-bar">
                <div id="bar1"></div><div id="bar2"></div><div id="bar3"></div><div id="bar4"></div>
              </div>
              <p class="pw-strength-text" id="pw-label"></p>
            </div>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirmer le mot de passe</label>
            <input type="password" id="confirmPassword" required minlength="6" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="checkbox-group">
              <input type="checkbox" id="cgu" required>
              <span>J'accepte les <a href="#" class="link">Conditions Générales d'Utilisation</a></span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="reg-btn">S'inscrire</button>
        </form>
        <p class="auth-footer">Déjà un compte ? <a href="#" id="login-link">Se connecter</a></p>
      </div>
    </div>
  `;

  document.getElementById('google-btn').addEventListener('click', handleGoogleSignIn);
  document.getElementById('login-link').addEventListener('click', e => { e.preventDefault(); navigate('/connexion'); });

  document.getElementById('password').addEventListener('input', e => {
    const pw = e.target.value;
    const str = document.getElementById('pw-strength');
    if (pw.length > 0) {
      str.style.display = 'block';
      const { score, label } = getPasswordStrength(pw);
      ['bar1','bar2','bar3','bar4'].forEach((id, i) => {
        const el = document.getElementById(id);
        el.className = '';
        if (i < score) el.className = `active-${score}`;
      });
      document.getElementById('pw-label').textContent = label;
    } else {
      str.style.display = 'none';
    }
  });

  let pwVisible = false;
  document.getElementById('toggle-pw').addEventListener('click', () => {
    pwVisible = !pwVisible;
    document.getElementById('password').type = pwVisible ? 'text' : 'password';
    document.getElementById('toggle-pw').innerHTML = pwVisible ? icons.eye_off : icons.eye;
  });

  document.getElementById('siret').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/[^\d\s]/g, '');
  });

  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const siret = document.getElementById('siret').value.replace(/\s/g, '');
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (password !== confirm) { toast('Les mots de passe ne correspondent pas.', 'error'); return; }
    if (siret && !/^\d{14}$/.test(siret)) { toast('Le SIRET doit contenir exactement 14 chiffres.', 'error'); return; }

    const btn = document.getElementById('reg-btn');
    btn.disabled = true; btn.textContent = 'Création...';
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile = { uid: cred.user.uid, firstName, lastName, email, phone, siret: siret || null, role: 'user', createdAt: new Date().toISOString(), preferences: { theme: 'light' } };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      toast('Compte créé avec succès !', 'success');
      navigate('/');
    } catch (err) {
      const msgs = { 'auth/email-already-in-use': 'Cet email est déjà utilisé.' };
      toast(msgs[err.code] || err.message, 'error');
      btn.disabled = false; btn.textContent = "S'inscrire";
    }
  });
}

// ===== FORGOT PASSWORD =====
export function renderForgotPassword() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <img src="assets/icon.png" alt="Logo">
          <h1>Mot de passe oublié</h1>
          <p>Recevez un lien de réinitialisation par email</p>
        </div>
        <form id="forgot-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="votre@email.com" required autocomplete="email">
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="forgot-btn">Envoyer le lien</button>
        </form>
        <p class="auth-footer"><a href="#" id="back-link">← Retour à la connexion</a></p>
      </div>
    </div>
  `;
  document.getElementById('back-link').addEventListener('click', e => { e.preventDefault(); navigate('/connexion'); });
  document.getElementById('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('forgot-btn');
    btn.disabled = true; btn.textContent = 'Envoi...';
    try {
      await sendPasswordResetEmail(auth, email);
      toast('Email envoyé ! Vérifiez votre boîte de réception.', 'success');
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err) {
      toast('Erreur lors de l\'envoi. Vérifiez l\'email.', 'error');
      btn.disabled = false; btn.textContent = 'Envoyer le lien';
    }
  });
}

// ===== AUTH STATE WATCHER =====
export function initAuth() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, async user => {
      if (user) {
        store.setUser(user);
        let profile = await getUserProfile(user.uid);
        if (!profile && user.providerData?.[0]?.providerId === 'google.com') {
          const nameParts = (user.displayName || '').split(' ');
          const newProfile = {
            uid: user.uid,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: user.email,
            phone: '',
            photoURL: user.photoURL || null,
            siret: null,
            role: 'user',
            createdAt: new Date().toISOString(),
            preferences: { theme: 'light' }
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          profile = newProfile;
        }
        if (profile) {
          store.setUserProfile(profile);
          store.setTheme(profile.preferences?.theme || 'light');
          await seedDemoData(user.uid, profile);
        }
      } else {
        store.setUser(null);
        store.setUserProfile(null);
      }
      resolve(user);
    });
  });
}

export async function logout() {
  await signOut(auth);
  navigate('/connexion');
}
