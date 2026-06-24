import { store } from '../store.js';
import { getFolders, getFolder, createFolder, updateFolder, deleteFolder, uploadDocument, addDocumentToFolder, removeDocumentFromFolder } from '../api.js';
import { icons, getStatusBadge, formatDate, formatFileSize, toast, debounce, showModal, closeModal } from '../utils.js';
import { navigate } from '../router.js';
import { renderSidebar, renderBottomNav, setupLayoutListeners, updateNotifBadge } from './dashboard.js';

// ===== FOLDER LIST =====
export async function renderFolderList() {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/dossiers')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <h2 style="font-size:18px;font-weight:600;margin-left:8px">Mes dossiers</h2>
          <div style="flex:1"></div>
          <button class="btn btn-primary btn-sm" data-href="/dossiers/nouveau">${icons.plus} Nouveau</button>
        </div>
        <div class="page">
          <div class="search-bar">
            <div class="search-input">
              ${icons.search}
              <input type="text" id="search-input" placeholder="Rechercher un dossier..." style="padding-left:38px">
            </div>
          </div>
          <div class="filter-tabs" id="filter-tabs">
            <button class="filter-tab active" data-filter="all">Tous</button>
            <button class="filter-tab" data-filter="in_progress">En cours</button>
            <button class="filter-tab" data-filter="additional_information_required">À compléter</button>
            <button class="filter-tab" data-filter="completed">Terminés</button>
            <button class="filter-tab" data-filter="draft">Brouillons</button>
          </div>
          <div class="card" style="padding:0;overflow:hidden" id="folders-container">
            ${[1,2,3].map(() => `<div class="folder-item"><div class="skeleton" style="width:40px;height:40px;border-radius:10px"></div><div style="flex:1;margin-left:12px"><div class="skeleton" style="height:14px;width:60%;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:40%"></div></div></div>`).join('')}
          </div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/dossiers')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  let allFolders = await getFolders(user.uid);
  let currentFilter = 'all';

  function renderList(folders) {
    const container = document.getElementById('folders-container');
    if (folders.length === 0) {
      container.innerHTML = `<div class="empty-state"><div>${icons.folder}</div><h3>Aucun dossier</h3><p>Créez votre premier dossier administratif.</p><button class="btn btn-primary mt-3" data-href="/dossiers/nouveau">Nouveau dossier</button></div>`;
      return;
    }
    container.innerHTML = folders.map(f => `
      <div class="folder-item" data-href="/dossiers/${f.id}">
        <div class="folder-icon">${icons.folder}</div>
        <div class="folder-info">
          <div class="folder-title">${f.title}</div>
          <div class="folder-meta">
            <span>${f.category}</span>
            <span>·</span>
            <span>${formatDate(f.createdAt)}</span>
            <span>·</span>
            <span>${(f.documents || []).length} doc${(f.documents || []).length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${getStatusBadge(f.status)}
          <span class="folder-arrow">${icons.arrow_right}</span>
        </div>
      </div>
    `).join('');
  }

  function applyFilters() {
    const q = document.getElementById('search-input').value.toLowerCase();
    let filtered = allFolders.filter(f => {
      const matchStatus = currentFilter === 'all' || f.status === currentFilter;
      const matchSearch = !q || f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    renderList(filtered);
  }

  renderList(allFolders);

  document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 250));

  document.getElementById('filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilters();
  });
}

// ===== FOLDER DETAIL =====
export async function renderFolderDetail({ id }) {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/dossiers')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
          <div style="flex:1"></div>
        </div>
        <div class="page" id="detail-content">
          <div class="skeleton" style="height:24px;width:200px;margin-bottom:12px"></div>
          <div class="skeleton" style="height:14px;width:300px"></div>
        </div>
      </main>
    </div>
    ${renderBottomNav('/dossiers')}
  `;

  setupLayoutListeners();

  const folder = await getFolder(id);
  if (!folder) {
    document.getElementById('detail-content').innerHTML = `<div class="empty-state"><h3>Dossier introuvable</h3></div>`;
    return;
  }

  const docs = folder.documents || [];
  const history = folder.history || [];

  document.getElementById('detail-content').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px">
      <div>
        <h1 class="page-title">${folder.title}</h1>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          ${getStatusBadge(folder.status)}
          <span class="text-secondary" style="font-size:13px">${folder.category}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" data-href="/dossiers/${id}/modifier">${icons.edit} Modifier</button>
        <button class="btn btn-danger btn-sm" id="delete-folder-btn">${icons.trash} Supprimer</button>
      </div>
    </div>

    ${folder.description ? `<div class="card mb-4"><p style="font-size:14px;color:var(--text-secondary)">${folder.description}</p></div>` : ''}

    <div class="card mb-4">
      <div class="section-title">Informations</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><span class="text-secondary">Créé le</span><br><strong>${formatDate(folder.createdAt)}</strong></div>
        <div><span class="text-secondary">Modifié le</span><br><strong>${formatDate(folder.updatedAt)}</strong></div>
        <div><span class="text-secondary">Catégorie</span><br><strong>${folder.category}</strong></div>
        <div><span class="text-secondary">Statut</span><br>${getStatusBadge(folder.status)}</div>
      </div>
    </div>

    <div class="card mb-4">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="section-title" style="margin:0">Documents (${docs.length})</div>
        <button class="btn btn-secondary btn-sm" id="add-doc-btn">${icons.upload} Ajouter</button>
      </div>
      <input type="file" id="doc-file-input" style="display:none" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">
      <div id="docs-list">
        ${docs.length === 0 ? `<div class="empty-state" style="padding:20px"><p>Aucun document ajouté.</p></div>` : docs.map((d, i) => `
          <div class="file-item" id="doc-${i}">
            <div class="file-icon">${icons.file}</div>
            <div class="file-info">
              <div class="file-name">${d.name}</div>
              <div class="file-size">${formatFileSize(d.size)}</div>
            </div>
            <div style="display:flex;gap:6px">
              <a href="${d.url}" target="_blank" class="btn btn-ghost btn-icon btn-sm">${icons.download}</a>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="removeDoc(${i})">${icons.trash}</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    ${history.length > 0 ? `
    <div class="card">
      <div class="section-title">Historique</div>
      ${history.map(h => `
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary)">${icons.history}</div>
          <div><div style="font-size:13px;font-weight:600">${h.action}</div><div style="font-size:12px;color:var(--text-secondary)">${h.description}</div></div>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  // Delete folder
  document.getElementById('delete-folder-btn').addEventListener('click', () => {
    const overlay = showModal('Supprimer le dossier', `<p>Êtes-vous sûr de vouloir supprimer <strong>${folder.title}</strong> ?</p>`,
      `<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
       <button class="btn btn-danger" id="confirm-delete">Supprimer</button>`
    );
    document.getElementById('confirm-delete').addEventListener('click', async () => {
      await deleteFolder(id);
      toast('Dossier supprimé.', 'success');
      closeModal();
      navigate('/dossiers');
    });
  });

  // Add document
  document.getElementById('add-doc-btn').addEventListener('click', () => document.getElementById('doc-file-input').click());
  document.getElementById('doc-file-input').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast(`${file.name} dépasse 10 Mo.`, 'error'); continue; }
      try {
        const docData = await uploadDocument(file, user.uid, id, null);
        const updated = await addDocumentToFolder(id, docData, folder.documents || []);
        folder.documents = updated;
        toast(`${file.name} ajouté.`, 'success');
        renderDocsList(folder.documents);
      } catch (err) {
        toast(`Erreur upload: ${file.name}`, 'error');
      }
    }
  });

  function renderDocsList(docs) {
    document.getElementById('docs-list').innerHTML = docs.length === 0
      ? `<div class="empty-state" style="padding:20px"><p>Aucun document ajouté.</p></div>`
      : docs.map((d, i) => `
        <div class="file-item">
          <div class="file-icon">${icons.file}</div>
          <div class="file-info">
            <div class="file-name">${d.name}</div>
            <div class="file-size">${formatFileSize(d.size)}</div>
          </div>
          <div style="display:flex;gap:6px">
            <a href="${d.url}" target="_blank" class="btn btn-ghost btn-icon btn-sm">${icons.download}</a>
            <button class="btn btn-ghost btn-icon btn-sm" data-doc-idx="${i}" data-action="remove-doc">${icons.trash}</button>
          </div>
        </div>
      `).join('');
    
    document.querySelectorAll('[data-action="remove-doc"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.docIdx);
        const updated = await removeDocumentFromFolder(id, idx, folder.documents);
        folder.documents = updated;
        renderDocsList(updated);
        toast('Document supprimé.', 'success');
      });
    });
  }
}

// ===== NEW FOLDER =====
export function renderNewFolder() {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  const categories = ['Fiscalité','Comptabilité','URSSAF','Contrat','Assurance','Ressources humaines','Juridique','Banque','Immobilier','Autre'];
  let pendingFiles = [];

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/dossiers')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
          <div style="flex:1"></div>
        </div>
        <div class="page">
          <h1 class="page-title">Nouveau dossier</h1>
          <p class="page-subtitle">Créez un nouveau dossier administratif</p>
          <form id="new-folder-form">
            <div class="card mb-4">
              <div class="form-group">
                <label for="title">Titre du dossier *</label>
                <input type="text" id="title" placeholder="Ex : Déclaration URSSAF" required maxlength="150">
                <p class="form-hint"><span id="title-count">0</span>/150 caractères</p>
              </div>
              <div class="form-group">
                <label for="category">Catégorie *</label>
                <select id="category" required>
                  <option value="">Sélectionner une catégorie</option>
                  ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="description">Description <span class="optional">(optionnel)</span></label>
                <textarea id="description" placeholder="Ajoutez une description..." maxlength="2000"></textarea>
                <p class="form-hint"><span id="desc-count">0</span>/2 000 caractères</p>
              </div>
            </div>

            <div class="card mb-4">
              <div class="section-title">Ajouter des documents</div>
              <div class="drop-zone" id="drop-zone">
                <div>${icons.upload}</div>
                <p style="font-size:14px;font-weight:500;margin-bottom:4px">Glissez vos fichiers ici</p>
                <p style="font-size:12px;color:var(--text-secondary)">PDF, JPG, PNG, DOC, XLS — 10 Mo max par fichier</p>
                <div class="upload-btns">
                  <button type="button" class="btn btn-secondary btn-sm" id="gallery-btn">${icons.image} Galerie</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="pdf-btn">${icons.file} Fichier PDF</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="camera-btn">${icons.camera} Photo</button>
                </div>
              </div>
              <input type="file" id="file-input" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="display:none">
              <input type="file" id="camera-input" capture="environment" accept="image/*" style="display:none">
              <div id="file-list" style="margin-top:10px"></div>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="create-btn">${icons.folder} Créer le dossier</button>
          </form>
        </div>
      </main>
    </div>
    ${renderBottomNav('/dossiers')}
  `;

  setupLayoutListeners();
  updateNotifBadge();

  const titleEl = document.getElementById('title');
  const descEl = document.getElementById('description');
  titleEl.addEventListener('input', () => document.getElementById('title-count').textContent = titleEl.value.length);
  descEl.addEventListener('input', () => document.getElementById('desc-count').textContent = descEl.value.length);

  // File selection
  function addFiles(files) {
    Array.from(files).forEach(f => {
      if (f.size > 10 * 1024 * 1024) { toast(`${f.name} dépasse 10 Mo.`, 'error'); return; }
      if (!pendingFiles.find(pf => pf.name === f.name)) pendingFiles.push(f);
    });
    renderFileList();
  }

  function renderFileList() {
    document.getElementById('file-list').innerHTML = pendingFiles.map((f, i) => `
      <div class="file-item">
        <div class="file-icon">${icons.file}</div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-size">${formatFileSize(f.size)}</div></div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-remove="${i}">${icons.x}</button>
      </div>
    `).join('');
    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => { pendingFiles.splice(parseInt(btn.dataset.remove), 1); renderFileList(); });
    });
  }

  document.getElementById('gallery-btn').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('pdf-btn').addEventListener('click', () => { document.getElementById('file-input').accept = '.pdf'; document.getElementById('file-input').click(); });
  document.getElementById('camera-btn').addEventListener('click', () => document.getElementById('camera-input').click());
  document.getElementById('file-input').addEventListener('change', e => addFiles(e.target.files));
  document.getElementById('camera-input').addEventListener('change', e => addFiles(e.target.files));

  // Drag and drop
  const dz = document.getElementById('drop-zone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); addFiles(e.dataTransfer.files); });

  // Submit
  document.getElementById('new-folder-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('create-btn');
    btn.disabled = true; btn.textContent = 'Création en cours...';

    try {
      const folderId = await createFolder(user.uid, {
        title: titleEl.value.trim(),
        category: document.getElementById('category').value,
        description: descEl.value.trim()
      });

      // Upload documents
      for (const file of pendingFiles) {
        try {
          const docData = await uploadDocument(file, user.uid, folderId, null);
          await addDocumentToFolder(folderId, docData, [], user.uid);
        } catch (err) { /* silent */ }
      }

      await updateFolder(folderId, { history: [{ action: 'Dossier créé', date: new Date().toISOString(), description: 'Le dossier a été créé avec ' + pendingFiles.length + ' document(s).' }] });
      toast('Dossier créé avec succès !', 'success');
      navigate(`/dossiers/${folderId}`);
    } catch (err) {
      toast('Erreur lors de la création.', 'error');
      btn.disabled = false; btn.innerHTML = `${icons.folder} Créer le dossier`;
    }
  });
}

// ===== EDIT FOLDER =====
export async function renderEditFolder({ id }) {
  const app = document.getElementById('app');
  const user = store.user;
  if (!user) { navigate('/connexion'); return; }

  const folder = await getFolder(id);
  if (!folder) { navigate('/dossiers'); return; }

  const categories = ['Fiscalité','Comptabilité','URSSAF','Contrat','Assurance','Ressources humaines','Juridique','Banque','Immobilier','Autre'];

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar('/dossiers')}
      <main class="main-content">
        <div class="header-top">
          <button class="btn btn-ghost btn-icon" id="menu-btn">${icons.menu}</button>
          <button class="btn btn-ghost btn-sm" onclick="history.back()">${icons.arrow_left} Retour</button>
        </div>
        <div class="page">
          <h1 class="page-title">Modifier le dossier</h1>
          <form id="edit-folder-form">
            <div class="card mb-4">
              <div class="form-group">
                <label for="title">Titre du dossier *</label>
                <input type="text" id="title" value="${folder.title}" required maxlength="150">
              </div>
              <div class="form-group">
                <label for="category">Catégorie *</label>
                <select id="category" required>
                  ${categories.map(c => `<option value="${c}" ${c===folder.category?'selected':''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" maxlength="2000">${folder.description || ''}</textarea>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" id="save-btn">Enregistrer les modifications</button>
          </form>
        </div>
      </main>
    </div>
    ${renderBottomNav('/dossiers')}
  `;

  setupLayoutListeners();

  document.getElementById('edit-folder-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = 'Enregistrement...';
    await updateFolder(id, {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim()
    });
    toast('Dossier mis à jour.', 'success');
    navigate(`/dossiers/${id}`);
  });
}
