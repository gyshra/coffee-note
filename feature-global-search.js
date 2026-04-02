// ============================================================
// feature-global-search.js
// 전역 검색 & OCR 바텀 시트 (Singleton)
//
// [HTML 삽입 위치] 모든 HTML 파일의 </body> 직전, common.js 뒤에:
//   <script src="common.js"></script>
//   <script src="feature-global-search.js"></script>
//
// [호출 방법]
//   window.CoffeeNote.openGlobalSearch()          — 텍스트 검색 모드
//   window.CoffeeNote.openGlobalSearch('camera')  — OCR 카메라 모드
//
// [의존성] common.js의 showToast(), 검색 관련 함수, SCA 데이터
// ============================================================

(function () {
    'use strict';
  
    // ── 네임스페이스 ──
    const ns = (window.CoffeeNote = window.CoffeeNote || {});
  
    // ── 상수 ──
    const SHEET_ID = 'globalSearchSheet';
    const BACKDROP_ID = 'globalSearchBackdrop';
    const ANIM_MS = 280;
  
    // ── 상태 ──
    let _isOpen = false;
    let _sheetEl = null;
    let _backdropEl = null;
  
    // ── 유틸 ──
    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  
    // ── Singleton DOM 생성 ──
    function _ensureDOM() {
      // ★ 안전장치 1: 이미 존재하면 재사용
      if (document.getElementById(SHEET_ID)) {
        _sheetEl = document.getElementById(SHEET_ID);
        _backdropEl = document.getElementById(BACKDROP_ID);
        return;
      }
  
      // Backdrop
      const backdrop = document.createElement('div');
      backdrop.id = BACKDROP_ID;
      backdrop.className = 'gs-backdrop';
      backdrop.addEventListener('click', _close);
  
      // Sheet
      const sheet = document.createElement('div');
      sheet.id = SHEET_ID;
      sheet.className = 'gs-sheet';
      sheet.innerHTML = `
        <div class="gs-sheet__handle"><span></span></div>
  
        <div class="gs-sheet__header">
          <h2 class="gs-sheet__title">원두 검색</h2>
          <button class="gs-sheet__close" type="button" aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
  
        <!-- ★ 안전장치 2: 래퍼에만 테두리, input은 border/outline 없음 -->
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
  
        <!-- 결과 영역 -->
        <div class="gs-results" id="gsResults">
          <p class="gs-results__empty">원두를 검색하거나 카메라로 스캔하세요</p>
        </div>
  
        <!-- 숨겨진 카메라 input -->
        <input type="file" id="gsFileInput" accept="image/*" style="display:none" />
      `;
  
      document.body.appendChild(backdrop);
      document.body.appendChild(sheet);
  
      _backdropEl = backdrop;
      _sheetEl = sheet;
  
      // ── 이벤트 바인딩 ──
      qs('.gs-sheet__close', sheet).addEventListener('click', _close);
  
      // 검색 입력 — debounce
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
  
      // 카메라 버튼
      qs('.gs-search-wrap__camera', sheet).addEventListener('click', function () {
        document.getElementById('gsFileInput').click();
      });
  
      // 파일 선택 (카메라/갤러리)
      document.getElementById('gsFileInput').addEventListener('change', _handleFileSelect);
  
      // 스와이프 닫기 (터치)
      _initSwipeToDismiss(sheet);
    }
  
    // ── 열기 ──
    function _open(mode) {
      if (_isOpen) return;
      _ensureDOM();
      _isOpen = true;
  
      // body scroll lock
      document.body.style.overflow = 'hidden';
  
      _backdropEl.classList.add('gs-backdrop--visible');
      _sheetEl.classList.add('gs-sheet--visible');
  
      if (mode === 'camera') {
        // 카메라 모드로 열면 즉시 파일 다이얼로그
        setTimeout(function () {
          document.getElementById('gsFileInput').click();
        }, ANIM_MS + 50);
      } else {
        // 텍스트 모드 → 포커스
        setTimeout(function () {
          qs('.gs-search-wrap__input', _sheetEl).focus();
        }, ANIM_MS + 50);
      }
    }
  
    // ── 닫기 ──
    function _close() {
      if (!_isOpen) return;
      _isOpen = false;
  
      document.body.style.overflow = '';
      _backdropEl.classList.remove('gs-backdrop--visible');
      _sheetEl.classList.remove('gs-sheet--visible');
  
      // 결과 초기화
      setTimeout(function () {
        if (_sheetEl) {
          qs('.gs-search-wrap__input', _sheetEl).value = '';
          qs('#gsResults', _sheetEl).innerHTML =
            '<p class="gs-results__empty">원두를 검색하거나 카메라로 스캔하세요</p>';
        }
      }, ANIM_MS);
    }
  
    // ── 텍스트 검색 ──
    async function _doSearch(query) {
      if (!query) return;
      const resultsEl = document.getElementById('gsResults');
      resultsEl.innerHTML = '<p class="gs-results__loading">검색 중…</p>';
  
      try {
        // 1) localStorage 캐시 우선
        const cached = _searchLocal(query);
        if (cached.length > 0) {
          _renderResults(cached, resultsEl);
          return;
        }
  
        // 2) API 호출
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
        // ★ 에러 시 무한 로딩 해제 + 토스트
        if (typeof showToast === 'function') {
          showToast('검색 중 오류가 발생했습니다');
        }
      }
    }
  
    // ── localStorage 검색 (기존 common.js 호환) ──
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
  
    // ── 결과 렌더링 ──
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
  
      // 카드 클릭 이벤트
      container.querySelectorAll('.gs-result-card').forEach(function (el) {
        el.addEventListener('click', function () {
          const idx = parseInt(el.dataset.index, 10);
          const coffee = items[idx];
          _onSelectCoffee(coffee);
        });
      });
    }
  
    // ── 원두 선택 콜백 ──
    function _onSelectCoffee(coffee) {
      _close();
      // 콜백이 등록되어 있으면 호출 (tasting.html 등에서 사용)
      if (typeof ns._onCoffeeSelected === 'function') {
        ns._onCoffeeSelected(coffee);
      } else {
        // 기본 동작: index.html로 이동
        sessionStorage.setItem('gs_selected_coffee', JSON.stringify(coffee));
        window.location.href = 'index.html?fromSearch=1';
      }
    }
  
    // ── 파일 선택 (OCR) ──
    async function _handleFileSelect(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      e.target.value = ''; // 같은 파일 재선택 가능하도록
  
      const resultsEl = document.getElementById('gsResults');
      resultsEl.innerHTML = '<p class="gs-results__loading">이미지 분석 중…</p>';
  
      try {
        // ★ 이미지 압축 (모듈 3 연동)
        let base64;
        if (typeof ns.compressImage === 'function') {
          base64 = await ns.compressImage(file, { maxSize: 1024, quality: 0.7 });
        } else {
          // 폴백: 직접 base64 변환
          base64 = await _fileToBase64(file);
        }
  
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });
  
        if (!res.ok) throw new Error('OCR API ' + res.status);
        const data = await res.json();
  
        if (data.name || data.results) {
          const items = data.results || [data];
          _renderResults(items, resultsEl);
        } else {
          resultsEl.innerHTML = '<p class="gs-results__empty">원두 정보를 인식하지 못했습니다</p>';
        }
      } catch (err) {
        console.error('[GlobalSearch:OCR]', err);
        resultsEl.innerHTML = '';
        if (typeof showToast === 'function') {
          showToast('이미지 분석 중 오류가 발생했습니다');
        }
      }
    }
  
    // ── 스와이프 닫기 ──
    function _initSwipeToDismiss(sheet) {
      let startY = 0, currentY = 0, dragging = false;
      const handle = qs('.gs-sheet__handle', sheet);
  
      handle.addEventListener('touchstart', function (e) {
        startY = e.touches[0].clientY;
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
        sheet.style.transform = '';
        if (currentY - startY > 100) _close();
      });
    }
  
    // ── 헬퍼 ──
    function _esc(str) {
      var d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }
  
    function _fileToBase64(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
  
    // ── 공개 API ──
    ns.openGlobalSearch = _open;
    ns.closeGlobalSearch = _close;
    // 외부에서 콜백 등록: CoffeeNote._onCoffeeSelected = fn
  })();