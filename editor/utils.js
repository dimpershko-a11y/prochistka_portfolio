export const DRAFT_KEY = 'prochistka-portfolio-editor-v02';
export const DB_NAME = 'prochistka-portfolio-editor';
export const DB_STORE = 'media';
export const state = { works: [], selectedId: null, saveTimer: null, objectUrls: new Map() };
export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export const els = {
  status: $('#status'), list: $('#work-list'), count: $('#works-count'), form: $('#work-form'), empty: $('#empty-state'),
  formTitle: $('#form-title'), preview: $('#preview-card'), modal: $('#details-modal'), importFile: $('#import-file')
};

export function setStatus(message, type = '') {
  els.status.textContent = message;
  els.status.className = `ed-status${type ? ` is-${type}` : ''}`;
}

export function uid(prefix = 'id') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
export function slugify(value) {
  const map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
  return String(value || '').toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || `work-${Date.now()}`;
}
export function fileSlug(value) { return slugify(String(value || 'image').replace(/\.[^.]+$/, '')); }
export function escapeHtml(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
export function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
export function selectedWork() { return state.works.find(w => w.id === state.selectedId) || null; }
export function emptyWork(order = 1) {
  return { id: `work-${Date.now()}`, order, published: true, featured: true, title: 'Новая работа', type: 'После ремонта', location: '', area: '', duration: '', team: '', summary: '', description: '', challenge: '', result: '', tasks: [], note: '', cover: '', assets: { before: [], after: [], gallery: [] }, video: { type: '', url: '', poster: '' } };
}
export function ensureUniqueId(candidate, currentId) {
  let base = slugify(candidate); let next = base; let n = 2;
  while (state.works.some(w => w.id === next && w.id !== currentId)) next = `${base}-${n++}`;
  return next;
}
export function normalizeDriveUrl(url) {
  const value = String(url || '').trim();
  const match = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000` : value;
}
export function assetPreview(asset) {
  if (!asset) return '';
  if (asset.source === 'blob') return state.objectUrls.get(asset.id) || '';
  return normalizeDriveUrl(asset.url || asset.path || '');
}
