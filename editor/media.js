import { state, selectedWork, uid, fileSlug, slugify, normalizeDriveUrl, setStatus } from './utils.js';
import { dbPut, dbGet, dbDelete, scheduleSave } from './storage.js';

export async function optimizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const max = 1920; const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d', { alpha: true }).drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Не удалось преобразовать изображение')), 'image/webp', .82));
}

export async function addFiles(section, files) {
  const work = selectedWork(); if (!work || !files.length) return;
  setStatus(`Обрабатываю изображения: ${files.length}…`);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const blob = await optimizeImage(file); const id = uid('media');
    const base = `${fileSlug(file.name)}-${String((work.assets[section]?.length || 0) + 1).padStart(2,'0')}.webp`;
    const path = `./media/${slugify(work.id)}/${base}`;
    await dbPut(id, blob);
    work.assets[section].push({ id, source: 'blob', blobKey: id, name: file.name, path });
    state.objectUrls.set(id, URL.createObjectURL(blob));
    if (!work.cover && section === 'after') work.cover = path;
  }
  scheduleSave(); setStatus('Изображения добавлены и оптимизированы.', 'success');
}

export function addUrl(section, value) {
  const work = selectedWork(); const url = String(value || '').trim(); if (!work || !url) return;
  const normalized = normalizeDriveUrl(url);
  work.assets[section].push({ id: uid('url'), source: 'url', url: normalized, path: normalized, name: 'Ссылка' });
  if (!work.cover && section === 'after') work.cover = normalized;
  scheduleSave();
}

export async function removeAsset(section, id) {
  const work = selectedWork(); if (!work) return;
  const list = work.assets[section]; const index = list.findIndex(a=>a.id===id); if (index < 0) return;
  const [asset] = list.splice(index,1);
  if (asset.source === 'blob') { await dbDelete(asset.blobKey); const url = state.objectUrls.get(asset.id); if (url) URL.revokeObjectURL(url); state.objectUrls.delete(asset.id); }
  if (work.cover === asset.path) work.cover = work.assets.after?.[0]?.path || work.assets.before?.[0]?.path || work.assets.gallery?.[0]?.path || '';
  scheduleSave();
}

export function moveAsset(section, id, delta) {
  const list = selectedWork()?.assets?.[section]; if (!list) return;
  const from = list.findIndex(a=>a.id===id); const to = Math.max(0, Math.min(list.length-1, from+delta)); if (from < 0 || from === to) return;
  list.splice(to,0,list.splice(from,1)[0]); scheduleSave();
}

export async function duplicateMedia(copy) {
  const pathMap = new Map();
  for (const section of ['before', 'after', 'gallery']) {
    const nextAssets = [];
    for (const asset of copy.assets[section]) {
      const originalPath = asset.path; const next = { ...asset, id: uid(asset.source === 'blob' ? 'media' : 'url') };
      if (asset.source === 'blob') {
        const blob = await dbGet(asset.blobKey);
        if (blob) { next.blobKey = next.id; await dbPut(next.blobKey, blob); state.objectUrls.set(next.id, URL.createObjectURL(blob)); }
        const filename = String(asset.path || '').split('/').pop() || `${next.id}.webp`;
        next.path = `./media/${slugify(copy.id)}/${filename}`;
      }
      pathMap.set(originalPath, next.path); nextAssets.push(next);
    }
    copy.assets[section] = nextAssets;
  }
  if (pathMap.has(copy.cover)) copy.cover = pathMap.get(copy.cover);
}
