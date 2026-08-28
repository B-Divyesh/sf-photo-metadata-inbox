import './styles.css';
import { addChanges, clearCatalog, getAssets, getChanges, getSettings, putAssets, putSettings } from './db';
import { assetsFromFiles, assetsFromList, importChange } from './importer';
import { buildBundle, downloadBlob, parseCatalog, writeSidecarsWithBackups } from './exporter';
import { captureLicenseFromUrl, checkoutUrl, hasOptimisticLicense, removeLicense, saveLicense, verifyLicense } from './license';
import { DEFAULT_SETTINGS, snapshot, type ChangeEntry, type MetadataTemplate, type PhotoAsset, type Settings } from './types';
import { unique } from './xmp';

interface AppState {
  assets: PhotoAsset[];
  changes: ChangeEntry[];
  settings: Settings;
  selectedId: string;
  licensed: boolean;
  online: boolean;
  loading: boolean;
  error: string;
}

const appNode = document.querySelector<HTMLDivElement>('#app');
if (!appNode) throw new Error('App root is missing.');
const app: HTMLDivElement = appNode;

const state: AppState = {
  assets: [], changes: [], settings: { ...DEFAULT_SETTINGS }, selectedId: '',
  licensed: false, online: navigator.onLine, loading: true, error: ''
};

let saveTimer = 0;

void boot();

async function boot(): Promise<void> {
  captureLicenseFromUrl();
  state.licensed = hasOptimisticLicense();
  try {
    [state.assets, state.changes, state.settings] = await Promise.all([getAssets(), getChanges(), getSettings()]);
    chooseVisibleAsset();
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'The local catalog could not be opened.';
  } finally {
    state.loading = false;
    render();
  }
  bindGlobalEvents();
  void refreshLicense();
  registerServiceWorker();
}

function bindGlobalEvents(): void {
  window.addEventListener('online', () => { state.online = true; renderStatus(); toast('Back online. Your catalog stayed on this device.'); });
  window.addEventListener('offline', () => { state.online = false; renderStatus(); toast('Offline mode. Editing and exports still work.'); });
  window.addEventListener('beforeunload', () => saveDraft());
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && currentAsset()) {
      event.preventDefault();
      void markCurrentDone();
    }
  });
  app.addEventListener('click', handleClick);
  app.addEventListener('change', handleChange);
  app.addEventListener('input', handleInput);
  app.addEventListener('keydown', handleQueueKeys);
}

function render(): void {
  if (state.loading) return;
  app.innerHTML = `
    <header class="masthead">
      <a class="brand" href="/" aria-label="Photo Metadata Inbox home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><small>Local catalog line</small><h1>Photo Metadata Inbox</h1></span>
      </a>
      <nav aria-label="Catalog actions">
        <span id="network-status" class="network ${state.online ? '' : 'offline'}"><span aria-hidden="true"></span>${state.online ? 'On device' : 'Offline · on device'}</span>
        <button class="button ghost" data-action="open-import">Import</button>
        ${state.assets.length ? '<button class="button brass" data-action="export">Export XMP</button>' : ''}
        <button class="icon-button" data-action="open-settings" aria-label="Open settings and license"><span aria-hidden="true">◆</span></button>
      </nav>
    </header>
    ${state.error ? errorView() : state.assets.length ? catalogView() : emptyView()}
    <footer>
      <span>Private by design · nothing is uploaded</span>
      <span><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><button class="link-button" data-action="open-license">${state.licensed ? 'Line pass active' : 'Get the full line'}</button></span>
      <span class="generated-note">Poster artwork generated for this product.</span>
    </footer>
    ${importDialog()}
    ${settingsDialog()}
    ${licenseDialog()}
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;
}

function emptyView(): string {
  return `<main id="main" class="welcome">
    <section class="welcome-copy">
      <p class="eyebrow">A finite route through the backlog</p>
      <h2>Every photograph deserves a destination.</h2>
      <p class="lede">Bring in filenames and XMP sidecars. Work event by event, keep every original, and leave with portable metadata—not another photo library.</p>
      <div class="welcome-actions">
        <button class="button brass large" data-action="open-import">Open a local folder</button>
        <button class="button ghost large" data-action="load-sample">Try a 6-photo sample</button>
      </div>
      <ul class="promise-list" aria-label="Product guarantees">
        <li><strong>01</strong><span>No images uploaded</span></li>
        <li><strong>02</strong><span>Original XMP preserved</span></li>
        <li><strong>03</strong><span>Works without a connection</span></li>
      </ul>
    </section>
    <figure class="hero-frame">
      <picture><source srcset="/assets/archive-line.webp" type="image/webp" />
      <img src="/assets/archive-line.png" width="1536" height="1024" fetchpriority="high" alt="Art-deco illustration of film-strip rails carrying archive cards toward an illuminated catalog." /></picture>
      <figcaption><span>Terminus</span> A cleared metadata archive</figcaption>
    </figure>
  </main>`;
}

function errorView(): string {
  return `<main id="main" class="state-page"><div class="state-emblem danger" aria-hidden="true">!</div><p class="eyebrow">Catalog delayed</p><h2>Your local catalog did not open.</h2><p>${escapeHtml(state.error)}</p><button class="button brass" data-action="retry">Try again</button></main>`;
}

function catalogView(): string {
  const selected = currentAsset();
  const events = eventStats();
  const done = state.assets.filter((asset) => asset.status === 'done').length;
  const percent = Math.round((done / state.assets.length) * 100);
  const visible = visibleAssets();
  return `<main id="main" class="station">
    <aside class="route-panel" aria-label="Events">
      <div class="route-heading"><p class="eyebrow">Events</p><span>${events.length - 1} platforms</span></div>
      <div class="event-list" role="list">
        ${events.map((event, index) => `<button role="listitem" class="event-stop ${state.settings.activeEvent === event.name ? 'active' : ''}" data-event="${attr(event.name)}">
          <span class="stop-marker" aria-hidden="true">${String(index).padStart(2, '0')}</span><span><strong>${escapeHtml(event.name)}</strong><small>${event.done} of ${event.total} complete</small></span>
        </button>`).join('')}
      </div>
      <button class="button rail-import" data-action="open-import"><span aria-hidden="true">＋</span> Add a folder</button>
    </aside>
    <section class="workbench" aria-labelledby="workbench-title">
      <header class="workbench-top">
        <div><p class="eyebrow">Now at the desk</p><h2 id="workbench-title">${selected ? escapeHtml(selected.filename) : 'Platform cleared'}</h2>${selected ? `<p class="path">${escapeHtml(selected.relativePath)}</p>` : ''}</div>
        <div class="counter" aria-label="${visible.length} assets in this view"><strong>${visible.length}</strong><span>on route</span></div>
      </header>
      ${selected ? editorView(selected) : clearedView()}
      ${queueView(visible)}
    </section>
    <aside class="inspector" aria-label="Progress and vocabulary">
      <section class="progress-block">
        <div class="sunburst" aria-hidden="true"><span>${percent}%</span></div>
        <p class="eyebrow">Whole catalog</p><h2>${done} arrived</h2><p>${state.assets.length - done} still in the inbox</p>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Catalog completion"><i style="width:${percent}%"></i></div>
      </section>
      ${vocabularyView()}
      ${templatesView()}
    </aside>
  </main>`;
}

function editorView(asset: PhotoAsset): string {
  const hasOriginal = Boolean(asset.originalCaption || asset.originalKeywords.length);
  return `<div class="catalog-card">
    <div class="card-band"><span>Asset ${String(state.assets.indexOf(asset) + 1).padStart(4, '0')}</span><span class="status-seal ${asset.status}">${asset.status === 'done' ? '✓ Complete' : '● In inbox'}</span></div>
    ${hasOriginal ? `<div class="original-note"><strong>Imported metadata</strong><span>Changes will be recorded; the original sidecar is included untouched in every bundle.</span></div>` : ''}
    <label class="field"><span><strong>Caption</strong><small>Describe what someone should know later.</small></span><textarea id="caption" rows="4" maxlength="2000" placeholder="A clear, factual caption…">${escapeHtml(asset.caption)}</textarea><span class="field-foot"><span id="caption-count">${asset.caption.length} / 2000</span><span>Saved locally</span></span></label>
    <label class="field"><span><strong>Keywords</strong><small>Separate terms with commas. Suggestions come from your vocabulary.</small></span><input id="keywords" list="vocabulary-list" value="${attr(asset.keywords.join(', '))}" autocomplete="off" placeholder="people, place, subject" /><datalist id="vocabulary-list">${state.settings.vocabulary.map((word) => `<option value="${attr(word)}"></option>`).join('')}</datalist></label>
    <div class="keyword-chips" aria-label="Current keywords">${asset.keywords.map((word) => `<button data-remove-keyword="${attr(word)}" aria-label="Remove keyword ${attr(word)}">${escapeHtml(word)} <span aria-hidden="true">×</span></button>`).join('') || '<span>No keywords yet</span>'}</div>
    <div class="card-actions">
      <button class="button ghost paper" data-action="previous">← Previous</button>
      ${asset.status === 'done' ? '<button class="button coral" data-action="reopen">Return to inbox</button>' : '<button class="button brass dark" data-action="complete">Mark complete <kbd>⌘↵</kbd></button>'}
      <button class="button ghost paper" data-action="next">Next →</button>
    </div>
  </div>`;
}

function clearedView(): string {
  const allDone = state.assets.every((asset) => asset.status === 'done');
  return `<div class="cleared"><div class="state-emblem" aria-hidden="true">✓</div><p class="eyebrow">${allDone ? 'Terminus reached' : 'No stops here'}</p><h3>${allDone ? 'The whole catalog is clear.' : 'This event has no open items.'}</h3><p>${allDone ? 'Export your XMP bundle and change log, or reopen any asset.' : 'Show completed assets or choose another event.'}</p><div><button class="button brass dark" data-action="export">Export XMP bundle</button><button class="button ghost paper" data-action="show-completed">Show completed</button></div></div>`;
}

function queueView(assets: PhotoAsset[]): string {
  const filtered = state.settings.showCompleted ? assets : assets.filter((asset) => asset.status !== 'done');
  return `<section class="queue" aria-labelledby="queue-title"><div class="queue-title"><h3 id="queue-title">Route queue</h3><label class="switch"><input type="checkbox" id="show-completed" ${state.settings.showCompleted ? 'checked' : ''}/><span>Show completed</span></label></div>
    <div class="queue-strip" role="listbox" aria-label="Photo queue" tabindex="0">${filtered.map((asset, index) => `<button role="option" aria-selected="${asset.id === state.selectedId}" class="queue-ticket ${asset.id === state.selectedId ? 'selected' : ''} ${asset.status}" data-select="${asset.id}" data-queue-index="${index}"><span class="ticket-no">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(asset.filename)}</strong><small>${escapeHtml(asset.event)} · ${asset.keywords.length} keywords</small></span><span class="ticket-status">${asset.status === 'done' ? '✓' : '○'}</span></button>`).join('') || '<p class="queue-empty">No items match this view.</p>'}</div></section>`;
}

function vocabularyView(): string {
  return `<section class="inspector-section"><div class="inspector-heading"><div><p class="eyebrow">Controlled vocabulary</p><h3>Tag drawer</h3></div><span>${state.settings.vocabulary.length}</span></div>
    <form id="vocabulary-form" class="add-row"><label class="sr-only" for="new-vocabulary">New vocabulary term</label><input id="new-vocabulary" maxlength="60" placeholder="Add a term"/><button class="icon-button light" type="submit" aria-label="Add vocabulary term">＋</button></form>
    <div class="tag-drawer">${state.settings.vocabulary.slice(0, 18).map((word) => `<button data-add-keyword="${attr(word)}">${escapeHtml(word)}</button>`).join('') || '<p>Add reusable people, places, and subjects.</p>'}</div>
  </section>`;
}

function templatesView(): string {
  return `<section class="inspector-section templates"><div class="inspector-heading"><div><p class="eyebrow">Line pass</p><h3>Templates</h3></div><span>${state.licensed ? 'Active' : 'Full'}</span></div>
    ${state.licensed ? `<div class="template-list">${state.settings.templates.map((template) => `<button data-template="${template.id}"><strong>${escapeHtml(template.name)}</strong><small>${template.keywords.length} keywords</small></button>`).join('') || '<p>Save the current fields as a reusable template.</p>'}</div><button class="button small ghost" data-action="save-template">Save current as template</button>` : '<p>Save and bulk-apply event templates with the one-time full-line pass.</p><button class="button small brass" data-action="open-license">See the full line</button>'}
  </section>`;
}

function importDialog(): string {
  return `<dialog id="import-dialog" class="modal"><form method="dialog" class="modal-shell" id="import-form">
    <div class="modal-top"><div><p class="eyebrow">New arrivals</p><h2>Import a local batch</h2></div><button class="icon-button light" value="cancel" aria-label="Close import dialog">×</button></div>
    <p class="privacy-note"><span aria-hidden="true">◆</span><span><strong>Files stay on this device.</strong> The app reads names and XMP text only; image bytes are never stored or sent.</span></p>
    <label class="drop-zone" for="folder-files"><span class="folder-mark" aria-hidden="true"></span><strong>Choose photos and sidecars</strong><span>Select a folder or multiple files. Matching .xmp files are read alongside photo names.</span><input id="folder-files" type="file" multiple webkitdirectory /></label>
    <div class="or"><span>or paste a manifest</span></div>
    <label class="field dark-field"><span><strong>One path per line</strong><small>Optional tab-separated caption and comma-separated keywords.</small></span><textarea id="manifest" rows="5" placeholder="2026-08-ceremony/IMG_0001.CR3&#10;2026-08-ceremony/IMG_0002.CR3&#9;First dance&#9;wedding, dance"></textarea></label>
    <label class="catalog-restore">Restore a catalog JSON <input id="catalog-file" type="file" accept="application/json,.json" /></label>
    <div id="import-errors" class="form-error" role="alert"></div>
    <div class="modal-actions"><button class="button ghost" value="cancel">Cancel</button><button class="button brass" type="button" data-action="run-import">Import to inbox</button></div>
  </form></dialog>`;
}

function settingsDialog(): string {
  return `<dialog id="settings-dialog" class="modal"><div class="modal-shell settings-shell">
    <div class="modal-top"><div><p class="eyebrow">Station office</p><h2>Catalog controls</h2></div><button class="icon-button light" data-close="settings-dialog" aria-label="Close settings">×</button></div>
    <section><h3>Own your data</h3><p>Export is always available, including on the free line.</p><div class="action-grid"><button class="button brass" data-action="export">Download XMP bundle</button><button class="button ghost" data-action="download-json">Catalog JSON only</button></div></section>
    <section><h3>Direct folder writing <span class="pass-label">Full line</span></h3><p>Choose a destination. Existing sidecars are copied to a timestamped <code>.metadata-inbox-backups</code> folder before writing.</p><button class="button ${state.licensed ? 'ghost' : 'disabled'}" data-action="direct-write">${state.licensed ? 'Choose destination folder' : 'Unlock direct writing'}</button></section>
    <section class="danger-zone"><h3>Clear this device</h3><p>Removes the local queue and history. Export first if you may need them.</p><button class="button coral" data-action="clear-catalog">Clear local catalog</button></section>
  </div></dialog>`;
}

function licenseDialog(): string {
  return `<dialog id="license-dialog" class="modal"><div class="modal-shell license-shell">
    <div class="modal-top"><div><p class="eyebrow">Full-line pass</p><h2>${state.licensed ? 'Your pass is active' : 'Clear large catalogs faster'}</h2></div><button class="icon-button light" data-close="license-dialog" aria-label="Close license">×</button></div>
    <p class="price"><strong>US$12</strong><span>one-time purchase</span></p>
    <ul class="feature-list"><li>Reusable caption and keyword templates</li><li>Bulk template application by event</li><li>Direct sidecar writing with timestamped backups</li><li>All future v1 updates</li></ul>
    <p>The free line keeps manual editing, vocabulary, offline use, XMP export, and catalog backup. Sociobot/Dodo is the merchant of record; refunds are handled there.</p>
    ${state.licensed ? '<button class="button coral" data-action="remove-license">Remove pass from this device</button>' : `<a class="button brass buy" href="${checkoutUrl}">Buy the full-line pass</a>`}
    <form id="license-form" class="license-restore"><label for="license-token">Have a license? Paste its token</label><div><input id="license-token" autocomplete="off" spellcheck="false"/><button class="button ghost" type="submit">Verify pass</button></div><p id="license-error" class="form-error" role="alert"></p></form>
    <small>By purchasing, you agree to the <a href="/terms/">terms</a>. See how verification works in our <a href="/privacy/">privacy notice</a>.</small>
  </div></dialog>`;
}

async function handleClick(event: MouseEvent): Promise<void> {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action],[data-event],[data-select],[data-add-keyword],[data-remove-keyword],[data-template],[data-close]');
  if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.close) closeDialog(target.dataset.close);
  if (target.dataset.event) { saveDraft(); state.settings.activeEvent = target.dataset.event; chooseVisibleAsset(); await saveSettingsAndRender(); }
  if (target.dataset.select) { saveDraft(); state.selectedId = target.dataset.select; render(); focusCaption(); }
  if (target.dataset.addKeyword) addKeyword(target.dataset.addKeyword);
  if (target.dataset.removeKeyword) removeKeyword(target.dataset.removeKeyword);
  if (target.dataset.template) await applyTemplate(target.dataset.template);
  switch (action) {
    case 'open-import': openDialog('import-dialog'); break;
    case 'open-settings': openDialog('settings-dialog'); break;
    case 'open-license': openDialog('license-dialog'); break;
    case 'run-import': await runImport(); break;
    case 'load-sample': await loadSample(); break;
    case 'complete': await markCurrentDone(); break;
    case 'reopen': await reopenCurrent(); break;
    case 'next': navigateAsset(1); break;
    case 'previous': navigateAsset(-1); break;
    case 'show-completed': state.settings.showCompleted = true; await saveSettingsAndRender(); break;
    case 'export': exportBundle(); break;
    case 'download-json': downloadCatalogJson(); break;
    case 'direct-write': await directWrite(); break;
    case 'save-template': await saveTemplate(); break;
    case 'clear-catalog': await clearLocalCatalog(); break;
    case 'remove-license': removeLicense(); state.licensed = false; render(); openDialog('license-dialog'); break;
    case 'retry': location.reload(); break;
  }
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.id === 'show-completed') {
    saveDraft(); state.settings.showCompleted = target.checked; chooseVisibleAsset(); void saveSettingsAndRender();
  }
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (target.id === 'caption') {
    const count = document.querySelector('#caption-count');
    if (count) count.textContent = `${target.value.length} / 2000`;
  }
  if (target.id === 'caption' || target.id === 'keywords') {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveDraft(), 500);
  }
}

function handleQueueKeys(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-queue-index]');
  if (!target) return;
  event.preventDefault();
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
  const buttons = [...document.querySelectorAll<HTMLElement>('[data-queue-index]')];
  const next = buttons[Math.max(0, Math.min(buttons.length - 1, buttons.indexOf(target) + direction))];
  next?.focus();
}

async function runImport(): Promise<void> {
  const filesInput = document.querySelector<HTMLInputElement>('#folder-files');
  const manifest = document.querySelector<HTMLTextAreaElement>('#manifest')?.value ?? '';
  const catalogFile = document.querySelector<HTMLInputElement>('#catalog-file')?.files?.[0];
  const errorNode = document.querySelector('#import-errors');
  if (errorNode) errorNode.textContent = '';
  try {
    if (catalogFile) {
      const backup = parseCatalog(await catalogFile.text());
      await clearCatalog();
      await Promise.all([putAssets(backup.assets), addChanges(backup.changes), putSettings(backup.settings)]);
      state.assets = backup.assets; state.changes = backup.changes; state.settings = backup.settings;
      chooseVisibleAsset(); closeDialog('import-dialog'); render(); toast(`Restored ${backup.assets.length} assets.`); return;
    }
    const fromFiles = filesInput?.files?.length ? await assetsFromFiles([...filesInput.files]) : { assets: [], errors: [] };
    const fromList = assetsFromList(manifest);
    const existing = new Set(state.assets.map((asset) => asset.relativePath.toLowerCase()));
    const additions = [...fromFiles.assets, ...fromList].filter((asset) => {
      const key = asset.relativePath.toLowerCase();
      if (existing.has(key)) return false;
      existing.add(key); return true;
    });
    if (!additions.length) throw new Error('Choose a folder or paste at least one new filename.');
    const changes = additions.map(importChange);
    await Promise.all([putAssets(additions), addChanges(changes)]);
    state.assets.push(...additions); state.changes.push(...changes);
    state.settings.vocabulary = unique([...state.settings.vocabulary, ...additions.flatMap((asset) => asset.keywords)]).sort();
    state.settings.activeEvent = additions[0]?.event ?? 'All events';
    await putSettings(state.settings);
    state.selectedId = additions.find((asset) => asset.status === 'inbox')?.id ?? additions[0]?.id ?? '';
    closeDialog('import-dialog'); render();
    toast(`Imported ${additions.length} asset${additions.length === 1 ? '' : 's'}${fromFiles.errors.length ? `; ${fromFiles.errors.length} sidecar warning${fromFiles.errors.length === 1 ? '' : 's'}` : ''}.`);
  } catch (error) {
    if (errorNode) errorNode.textContent = error instanceof Error ? error.message : 'Import failed.';
  }
}

async function loadSample(): Promise<void> {
  const sample = ['Lisbon-2026/DSC_1042.NEF', 'Lisbon-2026/DSC_1043.NEF', 'Lisbon-2026/DSC_1051.NEF', 'Studio-portraits/IMG_8821.CR3', 'Studio-portraits/IMG_8826.CR3', 'Studio-portraits/IMG_8834.CR3'].join('\n');
  const assets = assetsFromList(sample);
  const changes = assets.map(importChange);
  await Promise.all([putAssets(assets), addChanges(changes)]);
  state.assets = assets; state.changes = changes; state.settings.activeEvent = 'Lisbon-2026'; state.selectedId = assets[0]?.id ?? '';
  render(); toast('Sample route ready. It is stored only in this browser.');
}

function saveDraft(): void {
  const asset = currentAsset();
  const captionInput = document.querySelector<HTMLTextAreaElement>('#caption');
  const keywordInput = document.querySelector<HTMLInputElement>('#keywords');
  if (!asset || !captionInput || !keywordInput) return;
  const before = snapshot(asset);
  const caption = captionInput.value.trim();
  const keywords = unique(keywordInput.value.split(/[,;]/));
  if (caption === asset.caption && keywords.join('\0') === asset.keywords.join('\0')) return;
  asset.caption = caption; asset.keywords = keywords; asset.updatedAt = new Date().toISOString();
  const change = changeFor(asset, 'edit', before, ['caption', 'keywords']);
  state.changes.push(change);
  void Promise.all([putAssets([asset]), addChanges([change])]);
}

async function markCurrentDone(): Promise<void> {
  saveDraft();
  const asset = currentAsset();
  if (!asset) return;
  if (!asset.caption || !asset.keywords.length) { toast('Add both a caption and at least one keyword before marking complete.', true); document.querySelector<HTMLElement>(!asset.caption ? '#caption' : '#keywords')?.focus(); return; }
  const changedOriginal = (asset.originalCaption && asset.caption !== asset.originalCaption) || (asset.originalKeywords.length && asset.keywords.join() !== asset.originalKeywords.join());
  if (changedOriginal && !confirm(`Replace imported caption or keywords for ${asset.filename} in the exported copy?\n\nThe original XMP will remain in the originals folder and the change log will show both values.`)) return;
  const before = snapshot(asset); asset.status = 'done'; asset.updatedAt = new Date().toISOString();
  const change = changeFor(asset, 'complete', before, ['status']); state.changes.push(change);
  await Promise.all([putAssets([asset]), addChanges([change])]);
  const next = visibleAssets().find((item) => item.status === 'inbox' && item.id !== asset.id);
  state.selectedId = next?.id ?? asset.id; render(); toast(`${asset.filename} marked complete.`);
}

async function reopenCurrent(): Promise<void> {
  const asset = currentAsset(); if (!asset) return;
  const before = snapshot(asset); asset.status = 'inbox'; asset.updatedAt = new Date().toISOString();
  const change = changeFor(asset, 'reopen', before, ['status']); state.changes.push(change);
  await Promise.all([putAssets([asset]), addChanges([change])]); render(); toast(`${asset.filename} returned to the inbox.`);
}

function changeFor(asset: PhotoAsset, action: ChangeEntry['action'], before: ChangeEntry['before'], fields: string[]): ChangeEntry {
  return { id: crypto.randomUUID(), assetId: asset.id, filename: asset.filename, at: new Date().toISOString(), action, fields, before, after: snapshot(asset) };
}

function navigateAsset(direction: number): void {
  saveDraft(); const assets = visibleAssets(); const index = assets.findIndex((asset) => asset.id === state.selectedId);
  state.selectedId = assets[(index + direction + assets.length) % assets.length]?.id ?? state.selectedId; render(); focusCaption();
}

function addKeyword(word: string): void {
  const input = document.querySelector<HTMLInputElement>('#keywords'); if (!input) return;
  input.value = unique([...input.value.split(/[,;]/), word]).join(', '); saveDraft(); render();
}

function removeKeyword(word: string): void {
  const input = document.querySelector<HTMLInputElement>('#keywords'); if (!input) return;
  input.value = unique(input.value.split(/[,;]/)).filter((value) => value !== word).join(', '); saveDraft(); render();
}

async function saveTemplate(): Promise<void> {
  if (!state.licensed) { openDialog('license-dialog'); return; }
  saveDraft(); const asset = currentAsset(); if (!asset) return;
  const name = prompt('Template name', asset.event); if (!name?.trim()) return;
  const template: MetadataTemplate = { id: crypto.randomUUID(), name: name.trim(), caption: asset.caption, keywords: [...asset.keywords] };
  state.settings.templates.push(template); await putSettings(state.settings); render(); toast(`Template “${template.name}” saved.`);
}

async function applyTemplate(id: string): Promise<void> {
  const template = state.settings.templates.find((item) => item.id === id); const asset = currentAsset();
  if (!template || !asset) return;
  const scope = confirm(`Apply “${template.name}” to every incomplete asset in ${asset.event}?\n\nChoose Cancel to apply it only to ${asset.filename}.`);
  const targets = scope ? state.assets.filter((item) => item.event === asset.event && item.status === 'inbox') : [asset];
  const changes = targets.map((item) => { const before = snapshot(item); item.caption = template.caption || item.caption; item.keywords = unique([...item.keywords, ...template.keywords]); item.updatedAt = new Date().toISOString(); return changeFor(item, 'template', before, ['caption', 'keywords']); });
  state.changes.push(...changes); await Promise.all([putAssets(targets), addChanges(changes)]); render(); toast(`Applied “${template.name}” to ${targets.length} asset${targets.length === 1 ? '' : 's'}.`);
}

function exportBundle(): void {
  saveDraft();
  try { const bytes = buildBundle(state.assets, state.changes, state.settings); downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), `metadata-inbox-${dateStamp()}.zip`); toast(`Exported ${state.assets.length} sidecars with originals and change log.`); }
  catch (error) { toast(error instanceof Error ? error.message : 'Export failed.', true); }
}

function downloadCatalogJson(): void {
  saveDraft(); const catalog = { version: 1, exportedAt: new Date().toISOString(), assets: state.assets, changes: state.changes, settings: state.settings };
  downloadBlob(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' }), `metadata-inbox-catalog-${dateStamp()}.json`);
}

async function directWrite(): Promise<void> {
  if (!state.licensed) { closeDialog('settings-dialog'); openDialog('license-dialog'); return; }
  if (!confirm(`Write ${state.assets.length} XMP sidecars to a folder you choose?\n\nExisting matching files will be backed up before they are replaced.`)) return;
  try { const count = await writeSidecarsWithBackups(state.assets); toast(`Wrote ${count} sidecars; existing files were backed up first.`); }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; toast(error instanceof Error ? error.message : 'Folder writing failed.', true); }
}

async function clearLocalCatalog(): Promise<void> {
  if (!confirm(`Clear ${state.assets.length} assets and ${state.changes.length} history entries from this device?\n\nThis cannot be undone unless you exported a catalog JSON.`)) return;
  await clearCatalog(); state.assets = []; state.changes = []; state.selectedId = ''; closeDialog('settings-dialog'); render(); toast('Local catalog cleared.');
}

async function saveSettingsAndRender(): Promise<void> { await putSettings(state.settings); render(); }

function currentAsset(): PhotoAsset | undefined { return state.assets.find((asset) => asset.id === state.selectedId); }

function visibleAssets(): PhotoAsset[] {
  const all = state.settings.activeEvent === 'All events' ? state.assets : state.assets.filter((asset) => asset.event === state.settings.activeEvent);
  return all.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function chooseVisibleAsset(): void {
  const visible = visibleAssets();
  if (!visible.some((asset) => asset.id === state.selectedId)) state.selectedId = visible.find((asset) => asset.status === 'inbox')?.id ?? visible[0]?.id ?? '';
}

function eventStats(): { name: string; total: number; done: number }[] {
  const names = unique(state.assets.map((asset) => asset.event)).sort();
  return ['All events', ...names].map((name) => { const assets = name === 'All events' ? state.assets : state.assets.filter((asset) => asset.event === name); return { name, total: assets.length, done: assets.filter((asset) => asset.status === 'done').length }; });
}

function openDialog(id: string): void { document.querySelector<HTMLDialogElement>(`#${id}`)?.showModal(); }
function closeDialog(id: string): void { document.querySelector<HTMLDialogElement>(`#${id}`)?.close(); }
function focusCaption(): void { requestAnimationFrame(() => document.querySelector<HTMLElement>('#caption')?.focus()); }

function toast(message: string, error = false): void {
  const node = document.querySelector<HTMLElement>('#toast'); if (!node) return;
  node.textContent = message; node.className = `toast visible${error ? ' error' : ''}`;
  window.setTimeout(() => node.classList.remove('visible'), 4200);
}

function renderStatus(): void {
  const node = document.querySelector<HTMLElement>('#network-status'); if (!node) return;
  node.className = `network ${state.online ? '' : 'offline'}`; node.innerHTML = `<span aria-hidden="true"></span>${state.online ? 'On device' : 'Offline · on device'}`;
}

async function refreshLicense(): Promise<void> {
  if (!state.online || !hasOptimisticLicense()) return;
  try { const valid = await verifyLicense(); if (valid !== state.licensed) { state.licensed = valid; render(); if (!valid) toast('This license is no longer active.', true); } }
  catch { /* Cached access remains available when verification is unreachable. */ }
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register('/sw.js').then((registration) => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          toast('A fresh timetable is ready. Refresh to update.');
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(() => { /* The app remains usable without installation support. */ });
}

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id === 'vocabulary-form') {
    event.preventDefault(); const input = form.querySelector<HTMLInputElement>('#new-vocabulary'); const word = input?.value.trim(); if (!word) return;
    state.settings.vocabulary = unique([...state.settings.vocabulary, word]).sort(); void putSettings(state.settings); render(); toast(`Added “${word}” to the vocabulary.`);
  }
  if (form.id === 'license-form') {
    event.preventDefault(); const input = form.querySelector<HTMLInputElement>('#license-token'); const error = form.querySelector<HTMLElement>('#license-error');
    try { saveLicense(input?.value ?? ''); state.licensed = true; if (error) error.textContent = ''; render(); openDialog('license-dialog'); void refreshLicense(); toast('License saved on this device.'); }
    catch (reason) { if (error) error.textContent = reason instanceof Error ? reason.message : 'Could not save license.'; }
  }
});

function dateStamp(): string { return new Date().toISOString().slice(0, 10); }
function escapeHtml(value: string): string { return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character); }
function attr(value: string): string { return escapeHtml(value).replaceAll("'", '&#39;'); }
