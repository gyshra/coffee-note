/**
 * src/ui/global-search.js
 * 전역 검색 & OCR 바텀 시트 (Singleton)
 * (feature-global-search.js의 ES Module 버전)
 *
 * window.CoffeeNote.openGlobalSearch / closeGlobalSearch 로 노출됨
 */

import { showToast } from '../modules/utils.js';
import { compressImage } from '../modules/image-compress.js';

const SHEET_ID    = 'globalSearchSheet';
const BACKDROP_ID = 'globalSearchBackdrop';
const ANIM_MS     = 280;

let _isOpen     = false;
let _isOcrFlow  = false;
let _sheetEl    = null;
let _backdropEl = null;

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

function _ensureDOM() {
  if (document.getElementById(SHEET_ID)) {
    _sheetEl    = document.getElementById(SHEET_ID);
    _backdropEl = document.getElementById(BACKDROP_ID);
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id        = BACKDROP_ID;
  backdrop.className = 'gs-backdrop';
  backdrop.addEventListener('click', _close);

  const sheet = document.createElement('div');
  sheet.id        = SHEET_ID;
  sheet.className = 'gs-sheet';
  sheet.innerHTML = `
    <div class="gs-sheet__handle"><span></span></div>

    <div class="gs-sheet__header">
      <h2 class="gs-sheet__title">원두 검색</h2>
      <button class="gs-sheet__close" type="button" aria-label="닫기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="gs-search-wrap">
      <svg class="gs-search-wrap__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        type="text"
        class="gs-search-wrap__input"
        placeholder="원두명, 로스터리, 산지…"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button class="gs-search-wrap__camera" type="button" aria-label="카메라 검색">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
    </div>

    <div class="gs-results" id="gsResults">
      <p class="gs-results__empty">원두를 검색하거나 카메라로 스캔하세요</p>
    </div>

    <input type="file" id="gsFileInput" accept="image/*" style="display:none" />
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);

  _backdropEl = backdrop;
  _sheetEl    = sheet;

  qs('.gs-sheet__close', sheet).addEventListener('click', _close);

  const input = qs('.gs-search-wrap__input', sheet);
  let _debounce = null;
  input.addEventListener('input', function () {
    clearTimeout(_debounce);
    _debounce = setTimeout(function () { _doSearch(input.value.trim()); }, 350);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      clearTimeout(_debounce);
      _doSearch(input.value.trim());
    }
  });

  qs('.gs-search-wrap__camera', sheet).addEventListener('click', function () {
    document.getElementById('gsFileInput').click();
  });

  document.getElementById('gsFileInput').addEventListener('change', _handleFileSelect);

  _initSwipeToDismiss(sheet);
}

function _open(mode) {
  if (_isOpen) return;
  _ensureDOM();
  _isOpen = true;

  document.body.style.overflow = 'hidden';
  _backdropEl.classList.add('gs-backdrop--visible');
  _sheetEl.classList.add('gs-sheet--visible');

  if (mode === 'camera') {
    setTimeout(function () {
      document.getElementById('gsFileInput').click();
    }, ANIM_MS + 50);
  } else {
    setTimeout(function () {
      qs('.gs-search-wrap__input', _sheetEl).focus();
    }, ANIM_MS + 50);
  }
}

function _close() {
  if (!_isOpen) return;
  _isOpen = false;
  _isOcrFlow = false;

  document.body.style.overflow = '';
  _backdropEl.classList.remove('gs-backdrop--visible');
  _sheetEl.classList.remove('gs-sheet--visible');

  setTimeout(function () {
    if (_sheetEl) {
      qs('.gs-search-wrap__input', _sheetEl).value = '';
      qs('#gsResults', _sheetEl).innerHTML =
        '<p class="gs-results__empty">원두를 검색하거나 카메라로 스캔하세요</p>';
    }
  }, ANIM_MS);
}

async function _doSearch(query) {
  if (!query) return;
  const resultsEl = document.getElementById('gsResults');
  resultsEl.innerHTML = '<p class="gs-results__loading">검색 중…</p>';

  try {
    const cached = _searchLocal(query);
    if (cached.length > 0) {
      _renderResults(cached, resultsEl);
      return;
    }

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query })
    });

    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      _renderResults(data.results, resultsEl);
    } else {
      resultsEl.innerHTML = '<p class="gs-results__empty">검색 결과가 없습니다</p>';
    }
  } catch (err) {
    console.error('[GlobalSearch]', err);
    resultsEl.innerHTML = '';
    showToast('검색 중 오류가 발생했습니다');
  }
}

function _searchLocal(query) {
  try {
    const coffees = JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
    const q = query.toLowerCase();
    return coffees.filter(function (c) {
      return (c.name && c.name.toLowerCase().includes(q))
        || (c.roaster && c.roaster.toLowerCase().includes(q))
        || (c.country && c.country.toLowerCase().includes(q));
    }).slice(0, 10);
  } catch (e) {
    return [];
  }
}

function _renderResults(items, container) {
  container.innerHTML = items.map(function (c, i) {
    const notes = (c.cup_notes || c.cupNotes || []).slice(0, 3).join(', ');
    return `<div class="gs-result-card" data-index="${i}">
      <div class="gs-result-card__name">${_esc(c.name || '이름 없음')}</div>
      <div class="gs-result-card__meta">
        ${c.roaster ? _esc(c.roaster) + ' · ' : ''}${_esc(c.country || '')} ${_esc(c.region || '')}
      </div>
      ${notes ? '<div class="gs-result-card__notes">' + _esc(notes) + '</div>' : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('.gs-result-card').forEach(function (el) {
    el.addEventListener('click', function () {
      const idx = parseInt(el.dataset.index, 10);
      _onSelectCoffee(items[idx]);
    });
  });
}

function _onSelectCoffee(coffee) {
  _close();
  if (_isOcrFlow) {
    _isOcrFlow = false;
    try {
      sessionStorage.setItem('ocr_result', JSON.stringify(coffee));
      window.location.href = 'register-coffee.html?from=ocr';
    } catch (e) {
      showToast('OCR 결과 전달 실패');
    }
    return;
  }
  const ns = window.CoffeeNote || {};
  if (typeof ns._onCoffeeSelected === 'function') {
    ns._onCoffeeSelected(coffee);
  } else {
    sessionStorage.setItem('gs_selected_coffee', JSON.stringify(coffee));
    window.location.href = 'index.html?fromSearch=1';
  }
}

async function _handleFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  e.target.value = '';
  _isOcrFlow = true;

  const resultsEl = document.getElementById('gsResults');
  resultsEl.innerHTML = '<p class="gs-results__loading">이미지 분석 중…</p>';

  try {
    let base64 = await compressImage(file, { maxSize: 1600, quality: 0.85 });
    let raw = base64.includes(',') ? base64.split(',')[1] : base64;

    // 페이로드 크기 가드: 2MB 초과 시 재압축
    if (raw.length > 2 * 1024 * 1024) {
      base64 = await compressImage(file, { maxSize: 1200, quality: 0.75 });
      raw = base64.includes(',') ? base64.split(',')[1] : base64;
    }

    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: raw, mimeType: 'image/jpeg' })
    });

    if (!res.ok) throw new Error('OCR API ' + res.status);
    const data = await res.json();

    const coffee = data.coffee;
    if (coffee?.name) {
      _renderResults([coffee], resultsEl);
    } else {
      _isOcrFlow = false;
      resultsEl.innerHTML = '<p class="gs-results__empty">원두 정보를 인식하지 못했습니다</p>';
    }
  } catch (err) {
    _isOcrFlow = false;
    console.error('[GlobalSearch:OCR]', err);
    resultsEl.innerHTML = '';
    showToast('이미지 분석 중 오류가 발생했습니다');
  }
}

function _initSwipeToDismiss(sheet) {
  let startY = 0, currentY = 0, dragging = false;
  const handle = qs('.gs-sheet__handle', sheet);

  handle.addEventListener('touchstart', function (e) {
    startY   = e.touches[0].clientY;
    dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    currentY = e.touches[0].clientY;
    const dy = Math.max(0, currentY - startY);
    sheet.style.transform = 'translateY(' + dy + 'px)';
  }, { passive: true });

  handle.addEventListener('touchend', function () {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform  = '';
    if (currentY - startY > 100) _close();
  });
}

function _esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── 공개 API ──
export { _open as openGlobalSearch, _close as closeGlobalSearch };

// window.CoffeeNote 에 등록 (HTML onclick="CoffeeNote.openGlobalSearch(...)" 호환)
const ns = (window.CoffeeNote = window.CoffeeNote || {});
ns.openGlobalSearch  = _open;
ns.closeGlobalSearch = _close;
