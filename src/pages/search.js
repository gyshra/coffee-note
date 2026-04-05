/**
 * src/pages/search.js
 * index.html (탐색) 인라인 스크립트 → ES Module
 */

import { esc, escAttr, toast } from '../modules/utils.js';
import { getAll as recentGetAll, add as recentAdd, remove as recentRemove, clearAll as recentClearAll } from '../modules/storage-recent.js';
import { getLocalCoffees, filterByKeyword, filterByCategory, searchAPI, saveToLocalIfNew } from '../modules/search.js';
import { processImage as ocrProcessImage, buildGridData as ocrBuildGridData, reset as ocrReset, confirm as ocrConfirm } from '../modules/ocr.js';
import { buildCardHTML, buildDetailHTML, fetchStory, prepareGoTasting, prepareGoRecipe } from '../ui/coffee-card.js';

// ── 전역 상태 ──
let activeFilter = 'all', results = [], expandedIdx = -1, searchTimer = null;

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
  if (window.CoffeeNote && window.CoffeeNote.renderBottomNav) window.CoffeeNote.renderBottomNav("search");
  renderRecent();
  const p = new URLSearchParams(location.search);
  const q = p.get('q') || p.get('query');
  const cid = p.get('coffeeId');
  if (q) {
    document.getElementById('searchInput').value = q;
    syncClear();
    doSearch();
  } else if (cid !== null) {
    const list = localDB();
    const idx = parseInt(cid);
    if (list[idx]) showResults([list[idx]], idx, p.get('expand') === '1');
    else showRecent();
  } else {
    showRecent();
  }
});

function localDB() { return getLocalCoffees(); }

window.onInput = function () { syncClear(); clearTimeout(searchTimer); const v = document.getElementById('searchInput').value.trim(); if (!v) { showRecent(); return; } if (v.length >= 2) searchTimer = setTimeout(doSearch, 550); };
function syncClear() { document.getElementById('clearBtn').style.display = document.getElementById('searchInput').value ? 'block' : 'none'; }
window.clearSearch = function () { document.getElementById('searchInput').value = ''; syncClear(); showRecent(); document.getElementById('searchInput').focus(); };
window.setFilter = function (v, el) { document.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); el.classList.add('active'); activeFilter = v; if (results.length) renderList(applyFilter(results)); };
function applyFilter(arr) { return filterByCategory(arr, activeFilter); }
function hideAll() { document.getElementById('recentSection').style.display = 'none'; document.getElementById('resultsSection').style.display = 'none'; document.getElementById('emptyWrap').classList.remove('show'); document.getElementById('loadingWrap').classList.remove('show'); }
function showRecent() { hideAll(); results = []; expandedIdx = -1; document.getElementById('recentSection').style.display = 'block'; }
function setLoad(on, txt) { const w = document.getElementById('loadingWrap'); if (on) { w.classList.add('show'); if (txt) document.getElementById('loadingTxt').textContent = txt; } else w.classList.remove('show'); }
function showEmpty() { hideAll(); document.getElementById('emptyWrap').classList.add('show'); }
function showResults(arr, autoIdx = -1, autoOpen = false) { hideAll(); results = arr; document.getElementById('resultsSection').style.display = 'block'; document.getElementById('resultsMeta').textContent = arr.length === 1 ? '1개의 원두' : `${arr.length}개의 원두`; renderList(applyFilter(arr), autoIdx, autoOpen); }

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { showRecent(); return; }
  saveRecent(q);
  hideAll();
  setLoad(true, 'AI가 검색 중...');
  const local = filterByKeyword(getLocalCoffees(), q);
  if (local.length) { setLoad(false); showResults(local); return; }
  try {
    setLoad(true, 'AI가 원두 정보를 찾는 중...');
    const data = await searchAPI(q);
    if (data.coffee) { saveToLocalIfNew(data.coffee); setLoad(false); showResults([data.coffee], 0, true); }
    else { setLoad(false); showEmpty(); }
  } catch (err) { setLoad(false); showEmpty(); toast('검색에 실패했습니다. 잠시 후 다시 시도해주세요.'); }
}

function renderList(arr, autoIdx = -1, autoOpen = false) {
  const el = document.getElementById('resultsList');
  el.innerHTML = '';
  if (!arr.length) { showEmpty(); return; }
  arr.forEach((c, i) => el.appendChild(buildCard(c, i)));
  if (autoIdx >= 0 && autoOpen) expandCard(autoIdx);
}

function buildCard(coffee, idx) {
  var wrap = document.createElement('div');
  wrap.className = 'coffee-card';
  wrap.id = 'card-' + idx;
  wrap.innerHTML = buildCardHTML(coffee, idx, isFav(idx));
  return wrap;
}

window.toggleCard = function (idx) { if (expandedIdx === idx) { collapseCard(idx); return; } if (expandedIdx >= 0) collapseCard(expandedIdx); expandCard(idx); };
function collapseCard(idx) { document.getElementById(`card-${idx}`)?.classList.remove('open'); const p = document.getElementById(`detail-${idx}`); if (p) p.classList.remove('open'); expandedIdx = -1; }
function expandCard(idx) {
  const card = document.getElementById(`card-${idx}`);
  const panel = document.getElementById(`detail-${idx}`);
  if (!card || !panel) return;
  card.classList.add('open');
  expandedIdx = idx;
  if (panel.dataset.built) { panel.classList.add('open'); panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  const coffee = results[idx] || localDB()[idx];
  if (!coffee) return;
  panel.innerHTML = buildDetailHTML(coffee, idx);
  panel.dataset.built = '1';
  panel.classList.add('open');
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  if (!coffee.story && !coffee.description) loadStory(coffee, panel, idx);
}

window.toggleMore = function (idx) { const el = document.getElementById(`more-${idx}`); if (!el) return; const open = el.classList.toggle('open'); const t = el.previousElementSibling; if (t) t.textContent = open ? '상세 정보 접기 ↑' : '상세 정보 더보기 ↓'; };
function loadStory(c, panel, idx) { fetchStory(c.name, c.country, function (story) { var el = panel.querySelector('#story-' + idx); if (el) el.textContent = story; }, function () { var el = panel.querySelector('#story-' + idx); if (el) el.innerHTML = '<span style="color:var(--text-sub);font-style:italic">정보를 불러올 수 없습니다</span>'; }); }

window.goTasting = function (idx) { var c = results[idx] || localDB()[idx]; if (!c) return; var nav = prepareGoTasting(c, localDB()); nav.sessionItems.forEach(function (si) { sessionStorage.setItem(si.key, si.value); }); location.href = nav.url; };
window.goRecipe = function (idx) { var c = results[idx] || localDB()[idx]; if (!c) return; var nav = prepareGoRecipe(c, localDB()); nav.sessionItems.forEach(function (si) { sessionStorage.setItem(si.key, si.value); }); location.href = nav.url; };

function isFav(idx) { return window.CoffeeNote.isFavorite(idx); }
window.toggleFavBtn = function (idx, btn) { var nowFav = window.CoffeeNote.toggleFavorite(idx); btn.textContent = nowFav ? '♥' : '♡'; toast(nowFav ? '즐겨찾기 추가' : '즐겨찾기 제거'); };

function getRecent() { return recentGetAll(); }
function saveRecent(q) { recentAdd(q); renderRecent(); }
window.deleteRecent = function (q) { recentRemove(q); renderRecent(); };
window.clearAllRecent = function () { recentClearAll(); renderRecent(); };

function renderRecent() {
  const list = getRecent();
  const sec = document.getElementById('recentSection');
  if (!list.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  document.getElementById('recentList').innerHTML = list.map(function (q) {
    var safe = escAttr(q);
    var display = esc(q);
    return '<div class="recent-item"><div class="recent-q" onclick="clickRecent(\'' + safe + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>' + display + '</div><button class="btn-del" onclick="deleteRecent(\'' + safe + '\')">×</button></div>';
  }).join('');
}

window.clickRecent = function (q) { document.getElementById('searchInput').value = q; syncClear(); doSearch(); };

window.openOcr = function () { document.getElementById('ocrOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; };
window.closeOcr = function () { document.getElementById('ocrOverlay').classList.remove('open'); document.body.style.overflow = ''; };
window.overlayTap = function (e) { if (e.target === document.getElementById('ocrOverlay')) window.closeOcr(); };
window.triggerCam = function () { document.getElementById('camInput').click(); };
window.triggerGallery = function () { document.getElementById('galInput').click(); };

function compressImage(dataUrl, maxSize, quality) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * (maxSize / w)); w = maxSize; }
        else { w = Math.round(w * (maxSize / h)); h = maxSize; }
      }
      var cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      cvs.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(cvs.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

window.handleFile = async function (input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = async function (e) {
    var raw = e.target.result;
    var b64;
    try { b64 = await compressImage(raw, 1600, 0.85); } catch (err) { b64 = raw; }
    document.getElementById('ocrPreview').src = b64;
    document.getElementById('ocrPick').style.display = 'none';
    document.getElementById('ocrLoading').style.display = 'block';
    try {
      await ocrProcessImage(b64, function (payload, rawText) {
        renderOcrGrid(payload, rawText);
        document.getElementById('ocrLoading').style.display = 'none';
      }, function () {
        resetOcr();
        toast('인식 실패. 다시 시도해주세요.');
        document.getElementById('ocrLoading').style.display = 'none';
      });
    } catch (err) {
      document.getElementById('ocrLoading').style.display = 'none';
      resetOcr();
      toast('서버 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };
  reader.readAsDataURL(file);
};

function renderOcrGrid(c, raw) {
  const gd = ocrBuildGridData(c, raw);
  document.getElementById('ocrGrid').innerHTML = gd.cells.map(function (cell) {
    return '<div class="ocr-cell ok"><div class="ocr-cell-k">' + cell.label + '</div><div class="ocr-cell-v">' + cell.value + '</div></div>';
  }).join('') + (gd.rawText ? '<div class="ocr-cell na" style="grid-column:1/-1"><div class="ocr-cell-k">원본</div><div class="ocr-cell-v" style="font-size:11px;color:var(--text-sub)">' + gd.rawText + '</div></div>' : '');
  document.getElementById('ocrResult').classList.add('show');
}

window.resetOcr = function () { ocrReset(); document.getElementById('ocrResult').classList.remove('show'); document.getElementById('ocrPick').style.display = 'block'; ['camInput', 'galInput'].forEach(id => document.getElementById(id).value = ''); };
window.confirmOcr = function () { const result = ocrConfirm(); if (!result) return; sessionStorage.setItem('ocr_result', JSON.stringify(result.payload)); window.closeOcr(); location.href = 'register-coffee.html?from=ocr'; };
