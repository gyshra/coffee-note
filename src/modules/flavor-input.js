/**
 * src/modules/flavor-input.js
 * 예상/실제 맛 입력 공통 컴포넌트 (4-Layer)
 *
 * Layer 1: 전체 평가 버튼 + 별점 (필수)
 * Layer 2: 5축 슬라이더 — 산미/쓴맛/단맛/바디감/여운 (2회차+)
 * Layer 3: 향미 태그 + 결함 태그 (3회차+)
 * Layer 4: 수기 메모 무제한 + 자동 저장 (항상 노출, 선택)
 *
 * 사용법:
 *   import { FlavorInput } from '/src/modules/flavor-input.js';
 *   const fi = new FlavorInput({ container, brewCount: 1, prevAvgScores, onSave });
 *   fi.init();
 *   const data = fi.getData(); // 저장 시 호출
 */

// ── 정적 데이터 ──────────────────────────────────────────
const OVERALL_OPTIONS = [
  { value: 4, emoji: '✦', label: '아주 맛있다' },
  { value: 3, emoji: '○', label: '괜찮다'      },
  { value: 2, emoji: '△', label: '아쉽다'      },
  { value: 1, emoji: '✕', label: '실패다'      },
];

const AXES = [
  { key: 'acidity',    label: '산미',  desc: '밝고 상큼한 정도' },
  { key: 'bitterness', label: '쓴맛',  desc: '쌉싸름한 정도'   },
  { key: 'sweetness',  label: '단맛',  desc: '달콤한 여운'     },
  { key: 'body',       label: '바디감', desc: '무게감·질감'    },
  { key: 'finish',     label: '여운',  desc: '마신 후 지속 시간' },
];

const FLAVOR_TAGS = [
  { group: '과일',   tags: ['블루베리','체리','복숭아','레몬','사과','파인애플','포도'] },
  { group: '꽃향',   tags: ['자스민','장미','캐모마일'] },
  { group: '단맛',   tags: ['꿀','카라멜','바닐라','설탕'] },
  { group: '초콜릿', tags: ['다크초콜릿','밀크초콜릿','코코아'] },
  { group: '견과류', tags: ['헤이즐넛','아몬드','땅콩'] },
  { group: '기타',   tags: ['허브','흙내음','스모키','와인향','발효'] },
];

const DEFECT_TAGS = ['떫음', '잡맛', '쓴뒷맛', '밍밍함', '탄맛', '식초맛', '과발효'];

// ── CSS inject ────────────────────────────────────────────
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
.fi-layer{margin-bottom:28px}
.fi-layer-title{font-size:11px;letter-spacing:.08em;color:#888;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.fi-layer-title::after{content:'';flex:1;height:.5px;background:#E0E0E0}
/* Layer 1 */
.fi-overall{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px}
.fi-overall-btn{padding:10px 4px;border:1.5px solid #E0E0E0;background:#fff;cursor:pointer;text-align:center;font-family:inherit}
.fi-overall-btn .fi-ob-emoji{font-size:18px;display:block;margin-bottom:4px}
.fi-overall-btn .fi-ob-label{font-size:11px;color:#888}
.fi-overall-btn.selected{border-color:#121212;background:#121212}
.fi-overall-btn.selected .fi-ob-label{color:#fff}
/* 별점 */
.fi-stars{display:flex;gap:4px;justify-content:center;margin-top:8px}
.fi-star{font-size:28px;cursor:pointer;color:#E0E0E0;transition:color .1s;user-select:none}
.fi-star.filled{color:#121212}
/* Layer 2 슬라이더 */
.fi-slider-row{margin-bottom:14px}
.fi-slider-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.fi-slider-label{font-size:13px;font-weight:600;color:#121212}
.fi-slider-desc{font-size:11px;color:#AAAAAA}
.fi-slider-val{font-size:15px;font-weight:700;color:#8C7355;min-width:24px;text-align:right}
.fi-range{-webkit-appearance:none;width:100%;height:3px;background:#E0E0E0;outline:none}
.fi-range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:#121212;cursor:pointer}
.fi-range::-moz-range-thumb{width:20px;height:20px;background:#121212;border:none;cursor:pointer}
/* Layer 3 태그 */
.fi-tag-group{margin-bottom:10px}
.fi-tag-group-label{font-size:11px;color:#AAAAAA;margin-bottom:6px;letter-spacing:.04em}
.fi-tags{display:flex;flex-wrap:wrap;gap:6px}
.fi-tag{padding:5px 12px;border:0.5px solid #E0E0E0;background:#fff;font-size:13px;color:#888;cursor:pointer;font-family:inherit}
.fi-tag.selected{border-color:#121212;background:#121212;color:#fff}
.fi-defect-wrap{margin-top:12px}
.fi-defect-label{font-size:11px;color:#E53935;letter-spacing:.04em;margin-bottom:6px}
.fi-tag.defect{border-color:#FFCDD2}
.fi-tag.defect.selected{background:#E53935;border-color:#E53935;color:#fff}
/* Layer 4 메모 */
.fi-memo{width:100%;min-height:90px;padding:12px;box-sizing:border-box;border:0.5px solid #E0E0E0;font-size:14px;font-family:inherit;color:#121212;resize:vertical;outline:none;line-height:1.6}
.fi-memo:focus{border-color:#8C7355}
.fi-memo-hint{font-size:11px;color:#AAAAAA;margin-top:4px}
/* 저장 버튼 */
.fi-save-btn{width:100%;padding:16px;background:#121212;color:#fff;border:none;font-size:15px;font-family:inherit;font-weight:600;cursor:pointer;margin-top:8px;letter-spacing:.02em}
.fi-save-btn:disabled{background:#E0E0E0;color:#AAA;cursor:default}
/* 이전 평균 표시 */
.fi-prev-line{height:3px;background:#D4A96A;opacity:.5;position:absolute;top:0;left:0;pointer-events:none}
.fi-range-wrap{position:relative}
`;
  document.head.appendChild(s);
}

// ── 컴포넌트 ─────────────────────────────────────────────
export class FlavorInput {
  /**
   * @param {{
   *   container: HTMLElement,
   *   brewCount?: number,       // 1=첫추출, 2=두번째, 3+=상세 (기본 1)
   *   prevAvgScores?: object,   // { acidity:7, ... } 이전 평균 (2회차+ 기본값)
   *   prevFlavors?: string[],   // 이전 향미 태그 (3회차+ 기본 선택)
   *   mode?: 'expected'|'actual', // 예상맛 or 실제맛 (기본 actual)
   *   onSave?: (data)=>void,
   * }}
   */
  constructor({ container, brewCount = 1, prevAvgScores = null, prevFlavors = [], mode = 'actual', onSave }) {
    this.container      = container;
    this.brewCount      = brewCount;
    this.prevAvgScores  = prevAvgScores;
    this.prevFlavors    = prevFlavors;
    this.mode           = mode;
    this.onSave         = onSave;

    // 상태
    this._overall       = 0;      // 1-4
    this._star          = 0;      // 0-5 (0.5 단위)
    this._scores        = { acidity: 5, bitterness: 5, sweetness: 5, body: 5, finish: 5 };
    this._flavors       = new Set(prevFlavors.slice(0, 5));
    this._defects       = new Set();
    this._memo          = '';
    this._memoTimer     = null;

    // 이전 평균값 초기화
    if (prevAvgScores) {
      for (const key of Object.keys(this._scores)) {
        if (prevAvgScores[key] != null) this._scores[key] = prevAvgScores[key];
      }
    }
  }

  init() {
    injectCSS();
    this._render();
    this._restoreMemo();
  }

  _render() {
    const showLayer2 = this.brewCount >= 2;
    const showLayer3 = this.brewCount >= 3;
    const modeLabel  = this.mode === 'expected' ? '예상 맛' : '실제 맛';

    this.container.innerHTML = `
      <!-- Layer 1: 전체 평가 + 별점 -->
      <div class="fi-layer" id="fi-l1">
        <div class="fi-layer-title">전체 평가</div>
        ${this._buildOverallHtml()}
        <div class="fi-stars" id="fi-stars">${this._buildStarsHtml()}</div>
      </div>

      <!-- Layer 2: 5축 슬라이더 (2회차+) -->
      ${showLayer2 ? `
      <div class="fi-layer" id="fi-l2">
        <div class="fi-layer-title">맛 강도</div>
        ${this._buildSlidersHtml()}
      </div>` : `<div id="fi-l2-hint" style="font-size:12px;color:#AAAAAA;text-align:center;padding:8px 0 20px">2회차부터 세부 슬라이더가 나타납니다</div>`}

      <!-- Layer 3: 향미 + 결함 태그 (3회차+) -->
      ${showLayer3 ? `
      <div class="fi-layer" id="fi-l3">
        <div class="fi-layer-title">향미 태그 <span id="fi-tag-hint" style="font-size:11px;color:#E53935;margin-left:8px;opacity:0;transition:opacity .3s">최대 8개</span></div>
        ${this._buildFlavorTagsHtml()}
        <div class="fi-defect-wrap">
          <div class="fi-defect-label">결함 (있을 경우만)</div>
          <div class="fi-tags" id="fi-defects">${this._buildDefectTagsHtml()}</div>
        </div>
      </div>` : ''}

      <!-- Layer 4: 메모 (항상) -->
      <div class="fi-layer" id="fi-l4">
        <div class="fi-layer-title">메모</div>
        <textarea class="fi-memo" id="fi-memo" placeholder="이 잔의 문제는... / 다음엔... / 오늘의 느낌은...">${this._memo}</textarea>
        <div class="fi-memo-hint">자동 저장됩니다</div>
      </div>

      <button class="fi-save-btn" id="fi-save" disabled>${modeLabel} 저장</button>
    `;

    this._attachListeners();
    this._validateSaveBtn();
  }

  // ── HTML 빌더 ───────────────────────────────────────
  _buildOverallHtml() {
    return `<div class="fi-overall" id="fi-overall">
      ${OVERALL_OPTIONS.map(o => `
        <button class="fi-overall-btn${this._overall === o.value ? ' selected' : ''}" data-val="${o.value}">
          <span class="fi-ob-emoji">${o.emoji}</span>
          <span class="fi-ob-label">${o.label}</span>
        </button>`).join('')}
    </div>`;
  }

  _buildStarsHtml() {
    return [1,2,3,4,5].map(i => {
      const full = this._star >= i;
      const half = !full && this._star >= i - 0.5;
      return `<span class="fi-star${full ? ' filled' : ''}" data-star="${i}" data-half="${i - 0.5}">
        ${full ? '★' : half ? '⯨' : '☆'}
      </span>`;
    }).join('');
  }

  _buildSlidersHtml() {
    return AXES.map(({ key, label, desc }) => {
      const val  = this._scores[key];
      const prev = this.prevAvgScores?.[key];
      const prevPct = prev != null ? `${((prev - 1) / 9 * 100).toFixed(1)}%` : null;
      return `
        <div class="fi-slider-row">
          <div class="fi-slider-head">
            <span class="fi-slider-label">${label}</span>
            <span class="fi-slider-desc">${desc}</span>
            <span class="fi-slider-val" id="fi-sv-${key}">${val}</span>
          </div>
          <div class="fi-range-wrap">
            <input type="range" class="fi-range" id="fi-r-${key}" min="1" max="10" step="1" value="${val}">
            ${prevPct ? `<div class="fi-prev-line" style="left:calc(${prevPct} - 1px);width:3px;top:-1px;height:5px;opacity:.8"></div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  _buildFlavorTagsHtml() {
    return FLAVOR_TAGS.map(({ group, tags }) => `
      <div class="fi-tag-group">
        <div class="fi-tag-group-label">${group}</div>
        <div class="fi-tags">
          ${tags.map(t => `<button class="fi-tag${this._flavors.has(t) ? ' selected' : ''}" data-flavor="${t}">${t}</button>`).join('')}
        </div>
      </div>`).join('');
  }

  _buildDefectTagsHtml() {
    return DEFECT_TAGS.map(t =>
      `<button class="fi-tag defect${this._defects.has(t) ? ' selected' : ''}" data-defect="${t}">${t}</button>`
    ).join('');
  }

  // ── 이벤트 ─────────────────────────────────────────
  _attachListeners() {
    // Overall 버튼
    this.container.querySelector('#fi-overall')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.fi-overall-btn');
      if (!btn) return;
      this._overall = Number(btn.dataset.val);
      this.container.querySelectorAll('.fi-overall-btn').forEach(b =>
        b.classList.toggle('selected', b.dataset.val === btn.dataset.val));
      this._validateSaveBtn();
    });

    // 별점 (full / half 탭)
    this.container.querySelector('#fi-stars')?.addEventListener('click', (e) => {
      const star = e.target.closest('.fi-star');
      if (!star) return;
      const rect   = star.getBoundingClientRect();
      const isLeft = e.clientX < rect.left + rect.width / 2;
      this._star   = isLeft ? Number(star.dataset.half) : Number(star.dataset.star);
      this.container.querySelector('#fi-stars').innerHTML = this._buildStarsHtml();
    });

    // 슬라이더
    AXES.forEach(({ key }) => {
      const range = this.container.querySelector(`#fi-r-${key}`);
      if (!range) return;
      range.addEventListener('input', () => {
        this._scores[key] = Number(range.value);
        const valEl = this.container.querySelector(`#fi-sv-${key}`);
        if (valEl) valEl.textContent = this._scores[key];
      });
    });

    // 향미 태그
    this.container.querySelector('#fi-l3')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.fi-tag');
      if (!btn) return;
      if (btn.dataset.flavor) {
        const t = btn.dataset.flavor;
        if (this._flavors.has(t)) { this._flavors.delete(t); btn.classList.remove('selected'); }
        else if (this._flavors.size < 8) { this._flavors.add(t); btn.classList.add('selected'); }
        else {
          const hint = this.container.querySelector('#fi-tag-hint');
          if (hint) { hint.style.opacity = '1'; clearTimeout(this._tagHintTimer); this._tagHintTimer = setTimeout(() => { hint.style.opacity = '0'; }, 1500); }
        }
      }
      if (btn.dataset.defect) {
        const t = btn.dataset.defect;
        if (this._defects.has(t)) { this._defects.delete(t); btn.classList.remove('selected'); }
        else { this._defects.add(t); btn.classList.add('selected'); }
      }
    });

    // 메모 자동 저장
    const memoEl = this.container.querySelector('#fi-memo');
    if (memoEl) {
      memoEl.addEventListener('input', () => {
        this._memo = memoEl.value;
        clearTimeout(this._memoTimer);
        this._memoTimer = setTimeout(() => {
          try { sessionStorage.setItem('fi_memo_draft', this._memo); } catch {}
        }, 800);
      });
    }

    // 저장 버튼
    this.container.querySelector('#fi-save')?.addEventListener('click', () => {
      this.onSave?.(this.getData());
    });
  }

  _validateSaveBtn() {
    const btn = this.container.querySelector('#fi-save');
    if (btn) btn.disabled = this._overall === 0;
  }

  _restoreMemo() {
    try {
      const draft = sessionStorage.getItem('fi_memo_draft');
      if (draft && !this._memo) {
        this._memo = draft;
        const memoEl = this.container.querySelector('#fi-memo');
        if (memoEl) memoEl.value = draft;
      }
    } catch {}
  }

  // ── 데이터 추출 ─────────────────────────────────────
  getData() {
    return {
      overall:    this._overall,
      starRating: this._star,
      baseScores: this.brewCount >= 2 ? { ...this._scores } : null,
      flavors:    this.brewCount >= 3 ? [...this._flavors] : [],
      defects:    this.brewCount >= 3 ? [...this._defects] : [],
      memo:       this._memo,
      brewCount:  this.brewCount,
      mode:       this.mode,
    };
  }

  /** 외부에서 메모 값 세팅 (brew_result 편차 요약 주입 등) */
  setMemo(text) {
    this._memo = text;
    const memoEl = this.container.querySelector('#fi-memo');
    if (memoEl) memoEl.value = text;
  }
}
