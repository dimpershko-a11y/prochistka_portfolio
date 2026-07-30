import { state, els, $, selectedWork, assetPreview, escapeHtml } from './utils.js';

export function renderList() {
  els.count.textContent = state.works.length;
  els.list.innerHTML = state.works.length ? state.works.slice().sort((a,b)=>(a.order||999)-(b.order||999)).map(work => `
    <button type="button" class="ed-work-item ${work.id === state.selectedId ? 'is-active' : ''}" data-select-work="${escapeHtml(work.id)}">
      <strong>${escapeHtml(work.title || 'Без названия')}</strong><span>${escapeHtml(work.type || 'Без категории')} · ${work.published === false ? 'черновик' : 'опубликовано'}</span>
    </button>`).join('') : '<p class="ed-help">Объектов пока нет.</p>';
}

export function renderForm() {
  const work = selectedWork(); els.empty.hidden = Boolean(work); els.form.hidden = !work;
  if (!work) { els.preview.innerHTML = '<div class="ed-preview-card__placeholder">Нет выбранного объекта</div>'; return; }
  els.formTitle.textContent = work.title || 'Новая работа';
  for (const name of ['id','order','title','type','location','area','duration','team','summary','description','challenge','result','note']) if (els.form.elements[name]) els.form.elements[name].value = work[name] ?? '';
  els.form.elements.tasks.value = (work.tasks || []).join('\n');
  els.form.elements.published.checked = work.published !== false; els.form.elements.featured.checked = work.featured !== false;
  els.form.elements.videoType.value = work.video?.type || ''; els.form.elements.videoUrl.value = work.video?.url || ''; els.form.elements.videoPoster.value = work.video?.poster || '';
  renderMedia(); renderPreview();
}

export function renderMedia() {
  const work = selectedWork(); if (!work) return;
  for (const section of ['before','after','gallery']) {
    const list = $(`[data-media-list="${section}"]`); const assets = work.assets?.[section] || [];
    list.innerHTML = assets.length ? assets.map(asset => `
      <div class="ed-media-item ${work.cover === asset.path ? 'is-cover' : ''}" data-asset-id="${escapeHtml(asset.id)}" data-section="${section}">
        ${assetPreview(asset) ? `<img src="${escapeHtml(assetPreview(asset))}" alt="">` : '<div class="ed-preview-card__placeholder">Нет превью</div>'}
        <button class="ed-media-item__cover" type="button" data-set-cover="${escapeHtml(asset.id)}">${work.cover === asset.path ? 'Обложка' : 'На обложку'}</button>
        <div class="ed-media-item__controls"><button type="button" data-move="-1" title="Влево">←</button><button type="button" data-move="1" title="Вправо">→</button><button type="button" data-remove-asset title="Удалить">×</button></div>
      </div>`).join('') : '<span class="ed-help">Нет изображений</span>';
  }
}

export function renderPreview() {
  const work = selectedWork(); if (!work) return;
  const cover = [...(work.assets.before||[]), ...(work.assets.after||[]), ...(work.assets.gallery||[])].find(a => a.path === work.cover) || work.assets.after?.[0] || work.assets.before?.[0] || work.assets.gallery?.[0];
  const image = assetPreview(cover); const facts = [work.area ? `${work.area} м²` : '', work.duration || '', work.team || ''].filter(Boolean);
  els.preview.innerHTML = `<div class="ed-preview-card__image">${image ? `<img src="${escapeHtml(image)}" alt="">` : '<div class="ed-preview-card__placeholder">Добавьте обложку</div>'}</div><div class="ed-preview-card__body"><span class="ed-preview-card__type">${escapeHtml(work.type || 'Наши работы')}</span><h3>${escapeHtml(work.title || 'Без названия')}</h3><p>${escapeHtml(work.summary || 'Краткий результат появится здесь.')}</p><div class="ed-preview-card__facts">${facts.map(f=>`<span>${escapeHtml(f)}</span>`).join('')}</div></div>`;
}

export function renderDetails() {
  const work=selectedWork(); if(!work) return;
  const all=[...(work.assets.before||[]),...(work.assets.after||[]),...(work.assets.gallery||[])]; const cover=all.find(a=>a.path===work.cover)||work.assets.after?.[0]||work.assets.before?.[0]||all[0]; const hero=assetPreview(cover);
  els.modal.innerHTML=`<div class="ed-details" role="dialog" aria-modal="true"><div class="ed-details__backdrop" data-close-details></div><div class="ed-details__dialog"><button class="ed-details__close" type="button" data-close-details>×</button>${hero?`<img class="ed-details__hero" src="${escapeHtml(hero)}" alt="">`:''}<div class="ed-details__content"><span class="ed-kicker">${escapeHtml(work.type||'Наши работы')}</span><h2>${escapeHtml(work.title||'Без названия')}</h2><p class="ed-details__lead">${escapeHtml(work.description||work.summary||'')}</p><div class="ed-details__grid"><section class="ed-details__panel"><h3>Задача</h3><p>${escapeHtml(work.challenge||'—')}</p></section><section class="ed-details__panel"><h3>Результат</h3><p>${escapeHtml(work.result||work.summary||'—')}</p></section>${work.tasks?.length?`<section class="ed-details__panel"><h3>Что сделали</h3><ul>${work.tasks.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></section>`:''}${work.note?`<section class="ed-details__panel"><h3>Особенности</h3><p>${escapeHtml(work.note)}</p></section>`:''}</div>${all.length?`<div class="ed-details__gallery">${all.map(a=>`<img src="${escapeHtml(assetPreview(a))}" alt="">`).join('')}</div>`:''}</div></div></div>`;
}
export function renderAll() { renderList(); renderForm(); }
