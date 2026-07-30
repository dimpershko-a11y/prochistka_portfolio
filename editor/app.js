import { DRAFT_KEY, state, $, $$, els, setStatus, emptyWork, ensureUniqueId, selectedWork, deepClone } from './utils.js';
import { restoreDraft, parseImported, importText, scheduleSave, dbClear, dbDelete } from './storage.js';
import { addFiles, addUrl, removeAsset, moveAsset, duplicateMedia } from './media.js';
import { exportZip } from './zip.js';
import { renderAll, renderList, renderMedia, renderPreview, renderDetails } from './render.js';

function updateWorkFromForm(event) {
  const work = selectedWork(); if (!work) return;
  const target = event.target; if (!target.name) return;
  const oldId = work.id;
  if (target.name === 'published' || target.name === 'featured') work[target.name] = target.checked;
  else if (target.name === 'tasks') work.tasks = target.value.split('\n').map(v=>v.trim()).filter(Boolean);
  else if (target.name === 'videoType') work.video.type = target.value;
  else if (target.name === 'videoUrl') work.video.url = target.value.trim();
  else if (target.name === 'videoPoster') work.video.poster = target.value.trim();
  else if (target.name === 'order' || target.name === 'area') work[target.name] = target.value === '' ? '' : Number(target.value);
  else if (target.name === 'id') { const next = ensureUniqueId(target.value, oldId); work.id = next; state.selectedId = next; if (target.value !== next) target.value = next; }
  else work[target.name] = target.value;
  if (target.name === 'title' && (!work.id || /^work-\w+/.test(work.id))) { const next = ensureUniqueId(target.value, work.id); work.id = next; state.selectedId = next; els.form.elements.id.value = next; }
  if (target.name === 'title') els.formTitle.textContent = work.title || 'Новая работа';
  renderList(); renderPreview(); scheduleSave();
}

$('#add-work').addEventListener('click', () => { const work=emptyWork(state.works.length+1); work.id=ensureUniqueId(work.id); state.works.push(work); state.selectedId=work.id; renderAll(); scheduleSave(); });
els.list.addEventListener('click', e => { const button=e.target.closest('[data-select-work]'); if(!button)return; state.selectedId=button.dataset.selectWork; renderAll(); scheduleSave(); });
els.form.addEventListener('input', updateWorkFromForm); els.form.addEventListener('change', updateWorkFromForm);
$$('[data-media-input]').forEach(input=>input.addEventListener('change', async e=>{ try { await addFiles(input.dataset.mediaInput,[...e.target.files]); renderMedia(); renderPreview(); } catch(error) { setStatus(`Ошибка обработки изображения: ${error.message}`,'error'); } input.value=''; }));
$$('[data-add-url]').forEach(button=>button.addEventListener('click',()=>{ const section=button.dataset.addUrl; const input=$(`[data-url-input="${section}"]`); addUrl(section,input.value); input.value=''; renderMedia(); renderPreview(); }));
$$('.ed-media-list').forEach(list=>list.addEventListener('click', async e=>{ const item=e.target.closest('.ed-media-item'); if(!item)return; const work=selectedWork(); const section=item.dataset.section; const id=item.dataset.assetId; const asset=work.assets[section].find(a=>a.id===id); if(e.target.closest('[data-remove-asset]')) await removeAsset(section,id); else if(e.target.closest('[data-set-cover]')) { work.cover=asset.path; scheduleSave(); } else if(e.target.closest('[data-move]')) moveAsset(section,id,Number(e.target.closest('[data-move]').dataset.move)); renderMedia(); renderPreview(); }));
$('#delete-work').addEventListener('click', async()=>{ const work=selectedWork(); if(!work||!confirm(`Удалить «${work.title}» из черновика?`))return; for(const section of ['before','after','gallery']) for(const asset of work.assets[section]||[]) if(asset.source==='blob') await dbDelete(asset.blobKey); state.works=state.works.filter(w=>w.id!==work.id); state.selectedId=state.works[0]?.id||null; renderAll(); scheduleSave(); });
$('#duplicate-work').addEventListener('click', async () => { const work=selectedWork(); if(!work)return; const copy=deepClone(work); copy.id=ensureUniqueId(`${work.id}-copy`); copy.title=`${work.title} — копия`; copy.order=state.works.length+1; await duplicateMedia(copy); state.works.push(copy); state.selectedId=copy.id; renderAll(); scheduleSave(); });
$('#preview-details').addEventListener('click',renderDetails); els.modal.addEventListener('click',e=>{if(e.target.closest('[data-close-details]'))els.modal.innerHTML='';}); document.addEventListener('keydown',e=>{if(e.key==='Escape')els.modal.innerHTML='';});
els.importFile.addEventListener('change', async e=>{ const file=e.target.files[0]; if(!file)return; try{if(await importText(await file.text(),file.name))renderAll();}catch(error){setStatus(`Ошибка импорта: ${error.message}`,'error');} e.target.value=''; });
$('#load-site-data').addEventListener('click', async()=>{ try{ const response=await fetch('../data/works.json',{cache:'no-store'}); if(!response.ok)throw new Error(`HTTP ${response.status}`); if(await importText(await response.text(),'works.json'))renderAll(); }catch(error){setStatus(`Не удалось загрузить текущие данные: ${error.message}`,'error');} });
$('#export-zip').addEventListener('click',()=>exportZip().catch(error=>{console.error(error);setStatus(`Ошибка экспорта: ${error.message}`,'error');}));
$('#clear-draft').addEventListener('click',async()=>{if(!confirm('Удалить локальный черновик и загруженные в редактор изображения?'))return;localStorage.removeItem(DRAFT_KEY);await dbClear();state.works=[];state.selectedId=null;renderAll();setStatus('Локальный черновик очищен.','success');});

(async function boot(){
  const restored=await restoreDraft();
  if(!restored){ try{ const response=await fetch('../data/works.json',{cache:'no-store'}); if(response.ok){state.works=parseImported(await response.text(),'works.json');state.selectedId=state.works[0]?.id||null;} }catch(_){} }
  renderAll(); setStatus(restored?'Локальный черновик восстановлен.':'Текущие работы загружены. Редактирование остаётся локальным.','success');
})();
