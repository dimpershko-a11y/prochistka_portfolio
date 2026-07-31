import { DRAFT_KEY, DB_NAME, DB_STORE, state, setStatus, uid } from './utils.js';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function dbPut(key, value) { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
export async function dbGet(key) { const db = await openDb(); return new Promise((resolve, reject) => { const req = db.transaction(DB_STORE).objectStore(DB_STORE).get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
export async function dbDelete(key) { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).delete(key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
export async function dbClear() { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }

export function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, selectedId: state.selectedId, works: state.works }));
    setStatus('Черновик сохранён в браузере.', 'success');
  }, 350);
}

export async function hydrateObjectUrls() {
  for (const url of state.objectUrls.values()) URL.revokeObjectURL(url);
  state.objectUrls.clear();
  for (const work of state.works) for (const section of ['before','after','gallery']) for (const asset of work.assets?.[section] || []) {
    if (asset.source === 'blob') { const blob = await dbGet(asset.blobKey); if (blob) state.objectUrls.set(asset.id, URL.createObjectURL(blob)); }
  }
}

export async function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    state.works = Array.isArray(parsed.works) ? parsed.works : [];
    state.selectedId = parsed.selectedId && state.works.some(w => w.id === parsed.selectedId) ? parsed.selectedId : state.works[0]?.id || null;
    await hydrateObjectUrls();
    return true;
  } catch (error) {
    console.error(error); localStorage.removeItem(DRAFT_KEY); return false;
  }
}

function assetList(paths) { return paths.map(path => ({ id: uid('url'), source: 'url', url: path, path, name: String(path).split('/').pop() || 'Изображение' })); }
export function parseImported(text, filename = '') {
  let raw = text.trim();
  if (filename.endsWith('.js') || raw.startsWith('window.PROCHISTKA_WORKS')) raw = raw.replace(/^\s*window\.PROCHISTKA_WORKS\s*=\s*/, '').replace(/;\s*$/, '');
  const data = JSON.parse(raw); if (!Array.isArray(data.works)) throw new Error('Файл не содержит массив works.');
  return data.works.map((work,index) => ({
    id: work.id || `work-${index+1}`, order: work.order ?? index+1, published: work.published !== false, featured: work.featured !== false,
    title: work.title || '', type: work.type || '', location: work.location || '', area: work.area ?? '', duration: work.duration || '', team: work.team || '', summary: work.summary || '', description: work.description || '', challenge: work.challenge || '', result: work.result || '', tasks: Array.isArray(work.tasks) ? work.tasks : [], note: work.note || '', cover: work.cover || '',
    assets: { before: assetList(work.media?.before || []), after: assetList(work.media?.after || []), gallery: assetList(work.media?.gallery || []) },
    video: { type: work.video?.type || '', url: work.video?.url || '', poster: work.video?.poster || '' }
  }));
}

export async function importText(text, filename, confirmReplace = true) {
  const works = parseImported(text, filename);
  if (confirmReplace && state.works.length && !confirm('Заменить текущий черновик импортированными данными?')) return false;
  state.works = works; state.selectedId = works[0]?.id || null; await hydrateObjectUrls(); scheduleSave(); setStatus(`Импортировано объектов: ${works.length}.`, 'success'); return true;
}
