(function () {
  'use strict';

  const scriptEl = document.currentScript;
  let scriptBase;
  try {
    scriptBase = scriptEl && scriptEl.src
      ? new URL('.', scriptEl.src).href
      : new URL('.', document.baseURI || window.location.href).href;
  } catch (_) {
    scriptBase = document.baseURI || window.location.href;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-prochistka-portfolio-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('widget.css', scriptBase).href;
    link.dataset.prochistkaPortfolioStyle = 'true';
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((s) => s.src === src);
      if (existing) {
        if (window.PROCHISTKA_WORKS) resolve();
        else existing.addEventListener('load', resolve, { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Не удалось загрузить данные портфолио'));
      document.head.appendChild(s);
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name) {
    const map = {
      area: '↗',
      duration: '◷',
      team: '♙',
      location: '⌖'
    };
    return map[name] || '•';
  }

  function trackGoal(container, goal, payload) {
    const id = Number(container.dataset.metrikaId || 0);
    if (id && typeof window.ym === 'function') {
      try { window.ym(id, 'reachGoal', goal, payload || {}); } catch (_) {}
    }
  }

  function getPopupHref(container) {
    return container.dataset.popup || '#popup:prolead';
  }

  function normalizeSource(container) {
    const raw = container.dataset.source || new URL('data/works-data.js', scriptBase).href;
    return new URL(raw, window.location.href).href;
  }

  function normalizeAssetUrl(value) {
    if (!value || typeof value !== 'string') return value || '';
    try { return new URL(value, scriptBase).href; } catch (_) { return value; }
  }

  function normalizeWorkAssets(work) {
    const copy = { ...work };
    copy.cover = normalizeAssetUrl(copy.cover);
    copy.media = {
      before: (copy.media?.before || []).map(normalizeAssetUrl),
      after: (copy.media?.after || []).map(normalizeAssetUrl),
      gallery: (copy.media?.gallery || []).map(normalizeAssetUrl)
    };
    if (copy.video) {
      copy.video = {
        ...copy.video,
        url: normalizeAssetUrl(copy.video.url),
        poster: normalizeAssetUrl(copy.video.poster)
      };
    }
    return copy;
  }

  function cardTemplate(work) {
    const before = work.media?.before?.[0] || work.cover || '';
    const after = work.media?.after?.[0] || work.cover || '';
    const facts = [
      work.area ? `${icon('area')} ${escapeHtml(work.area)} м²` : '',
      work.duration ? `${icon('duration')} ${escapeHtml(work.duration)}` : '',
      work.team ? `${icon('team')} ${escapeHtml(work.team)}` : ''
    ].filter(Boolean);

    return `
      <article class="pc-card" data-work-id="${escapeHtml(work.id)}">
        <div class="pc-compare" data-compare>
          <img class="pc-compare__image" src="${escapeHtml(before)}" alt="До: ${escapeHtml(work.title)}" loading="lazy">
          <div class="pc-compare__after-wrap" data-after-wrap>
            <img class="pc-compare__image" src="${escapeHtml(after)}" alt="После: ${escapeHtml(work.title)}" loading="lazy" data-after-image>
          </div>
          <span class="pc-compare__label pc-compare__label--before">До</span>
          <span class="pc-compare__label pc-compare__label--after">После</span>
          <div class="pc-compare__line" data-compare-line></div>
          <div class="pc-compare__handle" data-compare-handle aria-hidden="true">↔</div>
          <input class="pc-compare__range" type="range" min="0" max="100" value="50" aria-label="Сравнить фотографии до и после">
        </div>
        <div class="pc-card__body">
          <div class="pc-card__type">${escapeHtml(work.type || 'Наши работы')}</div>
          <h3 class="pc-card__title">${escapeHtml(work.title)}</h3>
          <p class="pc-card__summary">${escapeHtml(work.summary || '')}</p>
          <div class="pc-card__facts">
            ${facts.map((f) => `<span class="pc-card__fact">${f}</span>`).join('')}
          </div>
          <button class="pc-card__action" type="button" data-open-work="${escapeHtml(work.id)}">Посмотреть объект</button>
        </div>
      </article>`;
  }

  function modalTemplate(work, popupHref) {
    const gallery = [
      ...(work.media?.before || []),
      ...(work.media?.after || []),
      ...(work.media?.gallery || [])
    ];
    const hero = work.cover || gallery[0] || '';
    const tasks = Array.isArray(work.tasks) ? work.tasks : [];
    const result = work.result || work.summary || '';
    const facts = [
      work.location ? `${icon('location')} ${escapeHtml(work.location)}` : '',
      work.area ? `${icon('area')} ${escapeHtml(work.area)} м²` : '',
      work.duration ? `${icon('duration')} ${escapeHtml(work.duration)}` : '',
      work.team ? `${icon('team')} ${escapeHtml(work.team)}` : ''
    ].filter(Boolean);

    const video = work.video?.url
      ? `<div class="pc-modal__video">${work.video.type === 'file'
          ? `<video controls preload="metadata" poster="${escapeHtml(work.video.poster || hero)}"><source src="${escapeHtml(work.video.url)}"></video>`
          : `<iframe src="${escapeHtml(work.video.url)}" title="Видео объекта" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
        }</div>`
      : '';

    return `
      <div class="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-modal-title">
        <div class="pc-modal__backdrop" data-close-modal></div>
        <div class="pc-modal__dialog" role="document">
          <button class="pc-modal__close" type="button" aria-label="Закрыть" data-close-modal>×</button>
          <div class="pc-modal__media"><img class="pc-modal__hero" src="${escapeHtml(hero)}" alt="${escapeHtml(work.title)}"></div>
          <div class="pc-modal__content">
            <p class="pc-modal__eyebrow">${escapeHtml(work.type || 'Наши работы')}</p>
            <h3 class="pc-modal__title" id="pc-modal-title">${escapeHtml(work.title)}</h3>
            <p class="pc-modal__lead">${escapeHtml(work.description || work.summary || '')}</p>
            <div class="pc-modal__facts">${facts.map((f) => `<span class="pc-modal__fact">${f}</span>`).join('')}</div>
            <div class="pc-modal__columns">
              <section class="pc-modal__panel">
                <h4>Задача</h4>
                <p>${escapeHtml(work.challenge || 'Подготовить объект и выполнить уборку по согласованному перечню работ.')}</p>
              </section>
              <section class="pc-modal__panel">
                <h4>Результат</h4>
                <p>${escapeHtml(result)}</p>
              </section>
              ${tasks.length ? `<section class="pc-modal__panel"><h4>Что сделали</h4><ul class="pc-modal__list">${tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></section>` : ''}
              ${work.note ? `<section class="pc-modal__panel"><h4>Особенности объекта</h4><p>${escapeHtml(work.note)}</p></section>` : ''}
            </div>
            ${video}
            ${gallery.length ? `<div class="pc-modal__gallery">${gallery.map((src, i) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(work.title)} — фото ${i + 1}" loading="lazy">`).join('')}</div>` : ''}
            <div class="pc-modal__footer">
              <span>Нужна похожая уборка?</span>
              <a class="pc-modal__cta" href="${escapeHtml(popupHref)}" data-portfolio-lead>Получить расчёт</a>
            </div>
          </div>
        </div>
      </div>`;
  }

  function initCompare(scope) {
    scope.querySelectorAll('[data-compare]').forEach((compare) => {
      const input = compare.querySelector('.pc-compare__range');
      const afterWrap = compare.querySelector('[data-after-wrap]');
      const afterImage = compare.querySelector('[data-after-image]');
      const line = compare.querySelector('[data-compare-line]');
      const handle = compare.querySelector('[data-compare-handle]');

      const update = () => {
        const value = Number(input.value || 50);
        afterWrap.style.width = `${100 - value}%`;
        line.style.left = `${value}%`;
        handle.style.left = `${value}%`;
        const width = compare.getBoundingClientRect().width || 1;
        afterImage.style.setProperty('--pc-compare-width', `${width}px`);
      };
      input.addEventListener('input', update);
      window.addEventListener('resize', update, { passive: true });
      requestAnimationFrame(update);
    });
  }

  function initPortfolio(container, data) {
    const title = container.dataset.title || 'Наши работы';
    const subtitle = container.dataset.subtitle || 'Реальные объекты и результаты нашей работы';
    const eyebrow = container.dataset.eyebrow || 'Портфолио PRO-CHISTKA';
    const limit = Math.max(1, Number(container.dataset.limit || 6));
    const popupHref = getPopupHref(container);
    const works = (Array.isArray(data?.works) ? data.works : [])
      .filter((w) => w && w.published !== false)
      .map(normalizeWorkAssets)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const categories = ['Все работы', ...new Set(works.map((w) => w.type).filter(Boolean))];
    let activeCategory = 'Все работы';

    container.classList.add('pc-portfolio');
    container.innerHTML = `
      <div class="pc-portfolio__head">
        <div>
          <p class="pc-portfolio__eyebrow">${escapeHtml(eyebrow)}</p>
          <h2 class="pc-portfolio__title">${escapeHtml(title)}</h2>
        </div>
        <p class="pc-portfolio__subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <div class="pc-portfolio__filters" role="tablist" aria-label="Фильтр работ"></div>
      <div class="pc-portfolio__grid" aria-live="polite"></div>
      <div class="pc-portfolio__cta">
        <div><h3 class="pc-portfolio__cta-title">Нужна такая же уборка?</h3><p class="pc-portfolio__cta-text">Оставьте заявку — рассчитаем стоимость для вашего объекта.</p></div>
        <a class="pc-portfolio__cta-link" href="${escapeHtml(popupHref)}" data-portfolio-lead>Получить расчёт</a>
      </div>`;

    const filtersEl = container.querySelector('.pc-portfolio__filters');
    const gridEl = container.querySelector('.pc-portfolio__grid');

    function renderFilters() {
      filtersEl.innerHTML = categories.map((cat) => `
        <button class="pc-portfolio__filter ${cat === activeCategory ? 'is-active' : ''}" type="button" role="tab" aria-selected="${cat === activeCategory}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
      `).join('');
    }

    function renderCards() {
      const filtered = activeCategory === 'Все работы' ? works : works.filter((w) => w.type === activeCategory);
      const visible = filtered.slice(0, limit);
      gridEl.innerHTML = visible.length ? visible.map(cardTemplate).join('') : '<div class="pc-portfolio__empty">В этой категории пока нет опубликованных работ.</div>';
      initCompare(gridEl);
    }

    filtersEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      activeCategory = button.dataset.category;
      renderFilters();
      renderCards();
    });

    gridEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-work]');
      if (!button) return;
      const work = works.find((item) => item.id === button.dataset.openWork);
      if (!work) return;
      openModal(work);
    });

    function openModal(work) {
      const wrap = document.createElement('div');
      wrap.innerHTML = modalTemplate(work, popupHref);
      const modal = wrap.firstElementChild;
      document.body.appendChild(modal);
      document.body.classList.add('pc-modal-lock');
      requestAnimationFrame(() => modal.classList.add('is-open'));
      const closeButton = modal.querySelector('.pc-modal__close');
      closeButton?.focus();

      let onKey;
      const close = () => {
        modal.classList.remove('is-open');
        document.body.classList.remove('pc-modal-lock');
        if (onKey) document.removeEventListener('keydown', onKey);
        setTimeout(() => modal.remove(), 180);
      };

      modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-modal]')) close();
        if (event.target.closest('[data-portfolio-lead]')) {
          trackGoal(container, 'pro_lead_open', { source: 'portfolio', id: work.id });
          close();
        }
      });

      onKey = (event) => {
        if (event.key === 'Escape') close();
      };
      document.addEventListener('keydown', onKey);
    }

    container.addEventListener('click', (event) => {
      if (event.target.closest('[data-portfolio-lead]')) trackGoal(container, 'pro_lead_open', { source: 'portfolio' });
    });

    renderFilters();
    renderCards();
  }

  async function boot() {
    ensureStyles();
    const containers = [...document.querySelectorAll('[data-prochistka-portfolio]')];
    if (!containers.length) return;

    for (const container of containers) {
      try {
        const source = normalizeSource(container);
        if (!window.PROCHISTKA_WORKS) await loadScript(source);
        initPortfolio(container, window.PROCHISTKA_WORKS || { works: [] });
      } catch (error) {
        container.innerHTML = `<div class="pc-portfolio__empty">Не удалось загрузить портфолио. ${escapeHtml(error.message)}</div>`;
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
