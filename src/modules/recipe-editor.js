/**
 * src/modules/recipe-editor.js
 * 레시피 에디터 + 내장 타이머 컴포넌트
 *
 * 사용법:
 *   import { RecipeEditor } from '/src/modules/recipe-editor.js';
 *   const editor = new RecipeEditor({ container, coffee, prevRecipe, onSave, onBrewFinish });
 *   editor.init();
 */

// ── 물 배분 계산 (recipe.js의 calculateWaterSteps와 동일 로직) ──
const BREW_WATER_DIST = {
  V60:          [{ action:'뜸들이기',bloom:true},{action:'1차 붓기',remFrac:.40},{action:'2차 붓기',remFrac:.35},{action:'마무리 붓기',remFrac:.25},{action:'완료',noWater:true}],
  칼리타:       [{ action:'뜸들이기',bloom:true},{action:'1차 붓기',remFrac:.45},{action:'2차 붓기',remFrac:.35},{action:'마무리 붓기',remFrac:.20},{action:'완료',noWater:true}],
  케멕스:       [{ action:'뜸들이기',bloom:true},{action:'1차 붓기',remFrac:.40},{action:'2차 붓기',remFrac:.35},{action:'마무리 붓기',remFrac:.25},{action:'완료',noWater:true}],
  에어로프레스: [{ action:'분쇄/예열',noWater:true},{action:'원두 투입',noWater:true},{action:'물 붓기',totalFrac:1.0},{action:'교반',noWater:true},{action:'프레스',noWater:true}],
  프렌치프레스: [{ action:'예열',noWater:true},{action:'원두 투입',noWater:true},{action:'물 붓기',totalFrac:1.0},{action:'대기',noWater:true},{action:'프레스',noWater:true}],
};

const STEP_DURATION = { // 각 스텝 기본 소요 시간 (초)
  뜸들이기: 45, '1차 붓기': 45, '2차 붓기': 40, '마무리 붓기': 35, 완료: 0,
  '분쇄/예열': 30, '원두 투입': 10, '물 붓기': 60, 교반: 20, 프레스: 30,
  예열: 30, 대기: 240,
};

function parseRatio(str) {
  const n = parseFloat((str || '1:15').split(':')[1]);
  return isNaN(n) ? 15 : n;
}

function buildSteps(beanG, method, ratioStr) {
  const ratioNum   = parseRatio(ratioStr);
  const totalWater = Math.round(beanG * ratioNum * 10) / 10;
  const dist       = BREW_WATER_DIST[method];
  if (!dist) return { totalWater, steps: [{ action: '추출', waterMl: totalWater, durationSec: 180 }] };

  const bloomMl = beanG * 2;
  const remainder = totalWater - bloomMl;
  let cumSec = 0;

  const steps = dist.map((d) => {
    let waterMl = null;
    if (d.bloom)       waterMl = bloomMl;
    else if (d.remFrac) waterMl = Math.round(remainder * d.remFrac);
    else if (d.totalFrac) waterMl = totalWater;

    const dur = STEP_DURATION[d.action] ?? 30;
    const startSec = cumSec;
    cumSec += dur;
    return { action: d.action, waterMl, durationSec: dur, startSec, cumSec };
  });

  return { totalWater, steps };
}

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── CSS (한 번만 inject) ─────────────────────────────────
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.re-section{margin-bottom:20px}
.re-section-title{font-size:11px;letter-spacing:.08em;color:#888;margin-bottom:10px}
.re-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.re-field{border:0.5px solid #E0E0E0;padding:12px}
.re-field-label{font-size:10px;color:#888;letter-spacing:.06em;margin-bottom:4px}
.re-field-value{font-size:16px;font-weight:700;color:#121212}
.re-field-sub{font-size:11px;color:#888;margin-top:2px}
.re-field input{width:100%;border:none;border-bottom:1.5px solid #8C7355;font-size:16px;font-weight:700;font-family:inherit;background:transparent;outline:none;color:#121212;padding:0}
.re-tip{background:#FFF8F0;border-left:3px solid #8C7355;padding:10px 14px;font-size:13px;color:#5C3D1A;line-height:1.6;margin-bottom:20px}
.re-steps{border-top:0.5px solid #E0E0E0}
.re-step-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid #E0E0E0}
.re-step-num{width:22px;height:22px;background:#121212;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.re-step-action{flex:1;font-size:14px;color:#121212;font-weight:500}
.re-step-detail{font-size:12px;color:#888;text-align:right}
.re-step-row.active-step{background:#FFFBF5}
.re-step-row.active-step .re-step-num{background:#8C7355}
.re-step-row.done-step .re-step-action{color:#BBBBBB;text-decoration:line-through}
/* 타이머 */
.re-timer-wrap{text-align:center;padding:20px 0 10px}
.re-timer-display{font-size:52px;font-weight:800;font-family:'Playfair Display',serif;color:#121212;letter-spacing:-.02em}
.re-timer-step{font-size:14px;color:#888;margin-top:4px}
.re-timer-water{font-size:20px;font-weight:700;color:#8C7355;margin-top:8px}
.re-btn{width:100%;padding:16px;font-size:15px;font-family:inherit;font-weight:600;border:none;cursor:pointer;letter-spacing:.02em;margin-top:8px}
.re-btn-primary{background:#121212;color:#fff}
.re-btn-primary:disabled{background:#E0E0E0;color:#AAA;cursor:default}
.re-btn-secondary{background:#fff;color:#121212;border:1.5px solid #121212;margin-top:8px}
.re-badge-matrix{display:inline-block;font-size:10px;padding:2px 7px;background:#E8F5E9;color:#2E7D32;margin-left:6px;vertical-align:middle}
.re-badge-ai{background:#FFF8E1;color:#E65100}
`;
  document.head.appendChild(style);
}

// ────────────────────────────────────────────────────────
export class RecipeEditor {
  /**
   * @param {{
   *   container: HTMLElement,
   *   coffee: object,            // { name, process, country, roast }
   *   prevRecipe?: object,       // 다시내리기 시 이전 레시피
   *   method?: string,           // 기본 추출법
   *   beanG?: number,            // 기본 원두 g
   *   onSave?: (recipe)=>void,
   *   onBrewFinish?: (result)=>void,
   * }}
   */
  constructor({ container, coffee = {}, prevRecipe = null, method = 'V60', beanG = 15, onSave, onBrewFinish }) {
    this.container    = container;
    this.coffee       = coffee;
    this.prevRecipe   = prevRecipe;
    this.method       = method;
    this.beanG        = beanG;
    this.onSave       = onSave;
    this.onBrewFinish = onBrewFinish;

    // 레시피 상태
    this.recipe = {
      temp:      93,
      ratio:     '1:15',
      grindDesc: '중간-가늘게',
      tip:       '',
      source:    'default',
    };
    this.steps        = [];
    this.totalWater   = 0;

    // 타이머 상태
    this._timerPhase  = 'idle'; // idle | brewing | paused | done
    this._stepIdx     = 0;
    this._stepRemSec  = 0;
    this._intervalId  = null;
    this._totalElapsedMs = 0;
    this._startMs     = 0;

    // API 응답 전에 getCurrentRecipe() 호출해도 유효한 기본값 반환
    this._calcSteps();
  }

  async init() {
    injectCSS();
    this._renderSkeleton();
    await this._loadRecipe();
    this._renderEditor();
  }

  // ── 레시피 로딩 ─────────────────────────────────────
  async _loadRecipe() {
    // 다시내리기: 이전 레시피 사용
    if (this.prevRecipe) {
      this.recipe = { ...this.prevRecipe, source: 'prev' };
      return;
    }

    try {
      const r    = await fetch('/api/recipe-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coffee: this.coffee, method: this.method }),
      });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      if (data.recipe) {
        this.recipe = data.recipe;
        return;
      }
    } catch { /* 네트워크 실패 시 기본값 유지 */ }
  }

  // ── 스텝 계산 ───────────────────────────────────────
  _calcSteps() {
    const { totalWater, steps } = buildSteps(this.beanG, this.method, this.recipe.ratio);
    this.totalWater = totalWater;
    this.steps      = steps;
  }

  // ── 스켈레톤 (로딩 중) ──────────────────────────────
  _renderSkeleton() {
    this.container.innerHTML = `<div style="padding:20px;text-align:center;color:#888;font-size:14px">레시피 불러오는 중…</div>`;
  }

  // ── 에디터 렌더링 ───────────────────────────────────
  _renderEditor() {
    if (this._timerPhase === 'brewing') return; // 타이머 진행 중 재렌더 차단
    this._calcSteps();
    const { temp, ratio, grindDesc, tip, source } = this.recipe;
    const badgeHtml = source === 'sca_matrix'
      ? '<span class="re-badge-matrix">SCA 기준</span>'
      : source === 'gemini' ? '<span class="re-badge-matrix re-badge-ai">AI 제안</span>' : '';

    this.container.innerHTML = `
      <div class="re-tip" id="re-tip">${tip || 'SCA Golden Cup 기준 레시피입니다. 각 항목을 탭해 수정할 수 있습니다.'}</div>

      <div class="re-section">
        <div class="re-section-title">추출 변수 ${badgeHtml}</div>
        <div class="re-fields">
          <div class="re-field" id="re-f-temp">
            <div class="re-field-label">추출 온도</div>
            <div class="re-field-value" id="re-v-temp">${temp}°C</div>
          </div>
          <div class="re-field" id="re-f-ratio">
            <div class="re-field-label">원두:물 비율</div>
            <div class="re-field-value" id="re-v-ratio">${ratio}</div>
          </div>
          <div class="re-field" id="re-f-bean">
            <div class="re-field-label">원두량</div>
            <div class="re-field-value" id="re-v-bean">${this.beanG}g</div>
            <div class="re-field-sub" id="re-v-water">→ ${this.totalWater}ml</div>
          </div>
          <div class="re-field" id="re-f-grind">
            <div class="re-field-label">분쇄도</div>
            <div class="re-field-value" id="re-v-grind" style="font-size:13px;padding-top:3px">${grindDesc}</div>
          </div>
        </div>
      </div>

      <div class="re-section">
        <div class="re-section-title">추출 스텝</div>
        <div class="re-steps" id="re-steps">${this._buildStepsHtml()}</div>
      </div>

      <div id="re-timer-zone"></div>

      <button class="re-btn re-btn-primary" id="re-btn-brew">이 레시피로 내리기 시작</button>
      <button class="re-btn re-btn-secondary" id="re-btn-save">레시피 저장</button>
    `;

    this._attachEditListeners();
    this._attachActionListeners();
  }

  _buildStepsHtml() {
    return this.steps.map((s, i) => `
      <div class="re-step-row" id="re-step-${i}">
        <div class="re-step-num">${i + 1}</div>
        <div class="re-step-action">${s.action}</div>
        <div class="re-step-detail">${s.waterMl != null ? s.waterMl + 'ml' : ''} ${fmt(s.durationSec)}</div>
      </div>`).join('');
  }

  // ── 인라인 편집 리스너 ──────────────────────────────
  _attachEditListeners() {
    const makeEditable = (fieldId, valueId, key, suffix, parse) => {
      const field = this.container.querySelector(`#${fieldId}`);
      const valEl = this.container.querySelector(`#${valueId}`);
      if (!field || !valEl) return;
      field.addEventListener('click', () => {
        const cur = key === 'beanG' ? this.beanG : this.recipe[key];
        const numStr = String(cur).replace(/[^\d.:]/g, '');
        const input = document.createElement('input');
        input.value = numStr;
        input.style.cssText = 'width:100%;border:none;border-bottom:1.5px solid #8C7355;font-size:16px;font-weight:700;font-family:inherit;background:transparent;outline:none;color:#121212;padding:0';
        valEl.replaceWith(input);
        input.focus();
        const commit = () => {
          const v = parse(input.value);
          if (key === 'beanG') { this.beanG = v; }
          else { this.recipe[key] = suffix ? `${v}${suffix}` : String(v); }
          this._calcSteps();
          this._renderEditor(); // 전체 재렌더
        };
        input.addEventListener('blur',   commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
      });
    };

    makeEditable('re-f-temp',  're-v-temp',  'temp',  '°C', v => Math.round(parseFloat(v) || 93));
    makeEditable('re-f-ratio', 're-v-ratio', 'ratio', '',   v => v.includes(':') ? v.trim() : `1:${v.trim()}`);
    makeEditable('re-f-bean',  're-v-bean',  'beanG', 'g',  v => Math.max(1, parseFloat(v) || 15));
  }

  // ── 액션 버튼 ───────────────────────────────────────
  _attachActionListeners() {
    this.container.querySelector('#re-btn-save')?.addEventListener('click', () => {
      const saved = { ...this.recipe, beanG: this.beanG, totalWater: this.totalWater, method: this.method, steps: this.steps };
      this.onSave?.(saved);
    });

    this.container.querySelector('#re-btn-brew')?.addEventListener('click', () => {
      this._startTimer();
    });
  }

  // ── 타이머 ──────────────────────────────────────────
  _startTimer() {
    this._timerPhase = 'brewing';
    this._stepIdx    = 0;
    this._stepRemSec = this.steps[0]?.durationSec ?? 0;
    this._startMs    = Date.now();

    this.container.querySelector('#re-btn-brew').style.display  = 'none';
    this.container.querySelector('#re-btn-save').style.display  = 'none';
    this._renderTimerZone();

    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  _tick() {
    this._totalElapsedMs = Date.now() - this._startMs;
    this._stepRemSec--;

    if (this._stepRemSec <= 0) {
      this._stepIdx++;
      if (this._stepIdx >= this.steps.length) {
        clearInterval(this._intervalId);
        this._timerPhase = 'done';
        this._onFinish();
        return;
      }
      this._stepRemSec = this.steps[this._stepIdx].durationSec;
      this._highlightStep(this._stepIdx);
    }

    this._updateTimerDisplay();
  }

  _renderTimerZone() {
    const zone = this.container.querySelector('#re-timer-zone');
    const step = this.steps[this._stepIdx];
    zone.innerHTML = `
      <div class="re-timer-wrap">
        <div class="re-timer-display" id="re-clock">${fmt(this._stepRemSec)}</div>
        <div class="re-timer-step" id="re-timer-step">${step?.action || ''}</div>
        <div class="re-timer-water" id="re-timer-water">${step?.waterMl != null ? step.waterMl + 'ml 붓기' : ''}</div>
      </div>
      <button class="re-btn re-btn-secondary" id="re-btn-stop" style="margin-top:0">추출 중단</button>
    `;
    this._highlightStep(0);
    this.container.querySelector('#re-btn-stop').addEventListener('click', () => {
      clearInterval(this._intervalId);
      this._timerPhase = 'idle';
      this._renderEditor();
    });
  }

  _updateTimerDisplay() {
    const clock = this.container.querySelector('#re-clock');
    const stepEl = this.container.querySelector('#re-timer-step');
    const waterEl = this.container.querySelector('#re-timer-water');
    const step = this.steps[this._stepIdx];
    if (clock)   clock.textContent   = fmt(this._stepRemSec);
    if (stepEl)  stepEl.textContent  = step?.action || '';
    if (waterEl) waterEl.textContent = step?.waterMl != null ? step.waterMl + 'ml 붓기' : '';
  }

  _highlightStep(idx) {
    this.steps.forEach((_, i) => {
      const el = this.container.querySelector(`#re-step-${i}`);
      if (!el) return;
      el.classList.toggle('active-step', i === idx);
      el.classList.toggle('done-step',   i < idx);
    });
  }

  getCurrentRecipe() {
    return {
      ...this.recipe,
      beanG:      this.beanG,
      totalWater: this.totalWater,
      method:     this.method,
      steps:      this.steps,
    };
  }

  _onFinish() {
    const zone = this.container.querySelector('#re-timer-zone');
    if (zone) zone.innerHTML = `
      <div class="re-timer-wrap">
        <div class="re-timer-display">완료</div>
        <div class="re-timer-step">총 ${fmt(Math.round(this._totalElapsedMs / 1000))}</div>
      </div>`;

    const result = {
      method:          this.method,
      beanG:           this.beanG,
      totalWater:      this.totalWater,
      ratio:           this.recipe.ratio,
      temp:            this.recipe.temp,
      steps:           this.steps,
      totalElapsedMs:  this._totalElapsedMs,
    };
    this.onBrewFinish?.(result);

    // "테이스팅 노트 작성" CTA
    const saveBtn = this.container.querySelector('#re-btn-save');
    if (saveBtn) {
      saveBtn.textContent = '테이스팅 노트 작성하기 →';
      saveBtn.style.display = '';
    }
  }
}
