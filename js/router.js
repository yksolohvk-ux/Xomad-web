const routes = {};
let currentPath = null;
let currentCleanup = null;
let routerInitialised = false;

function normalisePath(path) {
  if (!path) return '/';
  let value = decodeURIComponent(String(path)).trim();
  value = value.replace(/^#/, '');
  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/{2,}/g, '/');
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value || '/';
}

export function registerRoute(path, handler) {
  routes[normalisePath(path)] = handler;
}

export function getRoutePath() {
  const hashPath = location.hash.replace(/^#/, '');
  if (hashPath) return normalisePath(hashPath);

  const pathname = normalisePath(location.pathname);
  if (routes[pathname]) return pathname;

  // Compatibilité avec GitHub Pages : /Xomad-web/connexion devient /connexion.
  const staticRoutes = Object.keys(routes)
    .filter(route => !route.includes(':') && route !== '/')
    .sort((a, b) => b.length - a.length);

  const suffix = staticRoutes.find(route => pathname.endsWith(route));
  return suffix || '/';
}

export function navigate(path, options = {}) {
  const target = normalisePath(path);
  const url = `${location.pathname}${location.search}#${target}`;

  if (options.replace) {
    history.replaceState(null, '', url);
  } else {
    history.pushState(null, '', url);
  }

  render(target);
}

function matchRoute(path) {
  const exact = routes[path];
  if (exact) return { handler: exact, params: {} };

  for (const [pattern, handler] of Object.entries(routes)) {
    if (!pattern.includes(':')) continue;

    const keys = [...pattern.matchAll(/:([^/]+)/g)].map(match => match[1]);
    const expression = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:([^/]+)/g, '([^/]+)');
    const match = path.match(new RegExp(`^${expression}$`));

    if (match) {
      const params = {};
      keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { handler, params };
    }
  }

  return { handler: null, params: {} };
}

function renderRouteError(error) {
  console.error('[router]', error);
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="empty-state" style="margin-top:80px;padding:24px">
      <h3>Cette page n'a pas pu être chargée</h3>
      <p>Une erreur temporaire est survenue.</p>
      <button class="btn btn-primary mt-3" id="route-retry">Réessayer</button>
    </div>
  `;
  document.getElementById('route-retry')?.addEventListener('click', () => render(getRoutePath()));
}

function render(path) {
  const target = normalisePath(path);

  if (currentCleanup) {
    try { currentCleanup(); } catch (error) { console.warn('[router] Nettoyage incomplet :', error); }
    currentCleanup = null;
  }

  const app = document.getElementById('app');
  if (!app) return;

  const { handler, params } = matchRoute(target);
  if (!handler) {
    app.innerHTML = renderNotFound();
    document.getElementById('not-found-home')?.addEventListener('click', () => navigate('/'));
    return;
  }

  currentPath = target;

  try {
    const result = handler(params);

    if (result && typeof result.then === 'function') {
      result
        .then(value => {
          if (value?.cleanup) currentCleanup = value.cleanup;
        })
        .catch(renderRouteError);
    } else if (result?.cleanup) {
      currentCleanup = result.cleanup;
    }
  } catch (error) {
    renderRouteError(error);
  }

  updateNavActive(target);
}

function updateNavActive(path) {
  document.querySelectorAll('.bottom-nav-item, .sidebar-nav a').forEach(element => {
    element.classList.remove('active');
    const href = element.dataset.href;
    if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
      element.classList.add('active');
    }
  });
}

function renderNotFound() {
  return `<div class="empty-state" style="margin-top:80px">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <h3>Page introuvable</h3>
    <p>Cette page n'existe pas.</p>
    <button class="btn btn-primary mt-3" id="not-found-home">Retour à l'accueil</button>
  </div>`;
}

export function initRouter() {
  if (routerInitialised) {
    render(getRoutePath());
    return;
  }

  routerInitialised = true;
  window.addEventListener('popstate', () => render(getRoutePath()));
  window.addEventListener('hashchange', () => render(getRoutePath()));

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-href]');
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.href);
  });

  const initialPath = getRoutePath();
  if (!location.hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}#${initialPath}`);
  }
  render(initialPath);
}

export function getCurrentPath() {
  return currentPath;
}
