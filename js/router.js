import { store } from './store.js';

const routes = {};
let currentPath = null;
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  history.pushState(null, '', path);
  render(path);
}

function render(path) {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  const app = document.getElementById('app');

  // Match exact or parameterized routes
  let handler = routes[path];
  let params = {};

  if (!handler) {
    for (const [pattern, h] of Object.entries(routes)) {
      if (pattern.includes(':')) {
        const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
        const match = path.match(regex);
        if (match) {
          handler = h;
          const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          keys.forEach((k, i) => { params[k] = match[i + 1]; });
          break;
        }
      }
    }
  }

  if (!handler) {
    app.innerHTML = renderNotFound();
    return;
  }

  currentPath = path;
  const result = handler(params);
  if (result && result.cleanup) {
    currentCleanup = result.cleanup;
  }
  
  // Update bottom nav active state
  updateNavActive(path);
}

function updateNavActive(path) {
  document.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.classList.remove('active');
    const href = el.dataset.href;
    if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
      el.classList.add('active');
    }
  });
  document.querySelectorAll('.sidebar-nav a').forEach(el => {
    el.classList.remove('active');
    const href = el.getAttribute('href');
    if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
      el.classList.add('active');
    }
  });
}

function renderNotFound() {
  return `<div class="empty-state" style="margin-top:80px">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <h3>Page introuvable</h3>
    <p>Cette page n'existe pas.</p>
    <button class="btn btn-primary mt-3" onclick="navigate('/')">Retour à l'accueil</button>
  </div>`;
}

export function initRouter() {
  window.addEventListener('popstate', () => render(location.pathname));
  
  // Intercept link clicks
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-href]');
    if (link) {
      e.preventDefault();
      navigate(link.dataset.href);
    }
  });

  render(location.pathname === '/' ? location.pathname : location.pathname);
}

export function getCurrentPath() { return currentPath; }
