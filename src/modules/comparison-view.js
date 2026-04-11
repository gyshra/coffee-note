/**
 * src/modules/comparison-view.js
 * 예상 vs 실제 맛 비교 컴포넌트
 *
 * 사용법:
 *   import { ComparisonView } from '/src/modules/comparison-view.js';
 *   const cv = new ComparisonView({ container, expected, actual, recipe, coffee });
 *   cv.init();
 */

const AXES = [
  { key: 'acidity',    label: '산미'  },
  { key: 'bitterness', label: '쓴맛'  },
  { key: 'sweetness',  label: '단맛'  },
  { key: 'body',       label: '바디감' },
  { key: 'finish',     label: '여운'  },
];

// ── CSS ──────────────────────────────────────────────────
let _css = false;
function injectCSS() {
  if (_css) return; _css = true;
  const s = document.createElement('style');
  s.textContent = `
.cv-wrap{font-family:'Pretendard Variable',sans-serif}
/* 일치율 */
.cv-match-box{text-align:center;padding:24px 0 20px;border-bottom:0.5px solid #E0E0E0;margin-bottom:20px}
.cv-match-pct{font-size:56px;font-weight:900;font-family:'Playfair Display',serif;color:#121212;line-height:1}
.cv-match-label{font-size:12px;color:#888;letter-spacing:.06em;margin-top:4px}
.cv-match-stars{font-size:20px;margin-top:8px;color:#D4A96A}
/* 비교 행 */
.cv-axis-row{margin-bottom:16px}
.cv-axis-label{font-size:11px;letter-spacing:.06em;color:#888;margin-bottom:5px;display:flex;justify-content:space-between}
.cv-axis-label .cv-diff{font-weight:700}
.cv-diff-up   {color:#2E7D32}
.cv-diff-down {color:#C62828}
.cv-diff-same {color:#888}
.cv-bars{display:flex;flex-direction:column;gap:5px}
.cv-bar-row{display:flex;align-items:center;gap:8px}
.cv-bar-tag{font-size:10px;width:28px;text-align:right;flex-shrink:0}
.cv-bar-tag.expected{color:#D4A96A}
.cv-bar-tag.actual{color:#121212}
.cv-bar-track{flex:1;height:6px;background:#F0EEEB;position:relative}
.cv-bar-fill{height:100%;position:absolute;left:0;top:0;transition:width .4s ease}
.cv-bar-fill.expected{background:#D4A96A;opacity:.8}
.cv-bar-fill.actual  {background:#121212}
.cv-bar-val{font-size:12px;font-weight:700;min-width:16px}
.cv-bar-val.expected{color:#D4A96A}
.cv-bar-val.actual  {color:#121212}
/* AI 인사이트 */
.cv-insight{background:#F7F5F2;border-left:3px solid #8C7355;padding:14px 16px;margin:20px 0}
.cv-insight-label{font-size:10px;letter-spacing:.08em;color:#8C7355;margin-bottom:6px}
.cv-insight-text{font-size:14px;color:#121212;line-height:1.6}
.cv-insight-loading{font-size:13px;color:#AAAAAA}
/* 버튼 */
.cv-btn{width:100%;padding:16px;font-size:15px;font-family:inherit;font-weight:600;border:none;cursor:pointer;letter-spacing:.02em;margin-top:8px}
.cv-btn-primary  {background:#121212;color:#fff}
.cv-btn-secondary{background:#fff;color:#121212;border:1.5px solid #121212}
`;
  document.head.appendChild(s);
}

// ── 일치율 계산 ──────────────────────────────────────────
function calcMatchRate(expected, actual) {
  if (!expected || !actual) return null;
  let total = 0, count = 0;
  for (const { key } of AXES) {
    const e = expected[key], a = actual[key];
    if (e == null || a == null) continue;
    // 최대 9점 차이(1-10 스케일) → 100%에서 차이 비율만큼 감점
    total += Math.max(0, 1 - Math.abs(e - a) / 9);
    count++;
  }
  if (!count) return null;
  return Math.round((total / count) * 100);
}

// ── 컴포넌트 ─────────────────────────────────────────────
export class ComparisonView {
  /**
   * @param {{
   *   container: HTMLElement,
   *   expected: object,    // { acidity, bitterness, sweetness, body, finish }
   *   actual: object,      // 동일 구조
   *   recipe?: object,     // 추출 레시피 (다시내리기 버튼에 사용)
   *   coffee?: object,     // 원두 정보 (AI 인사이트에 사용)
   *   onRebrew?: ()=>void, // "다시내리기" 클릭 콜백
   * }}
   */
  constructor({ container, expected, actual, recipe, coffee, coffeeIndex, onRebrew, onSaveNotes }) {
    this.container    = container;
    this.expected     = expected;
    this.actual       = actual;
    this.recipe       = recipe;
    this.coffee       = coffee;
    this.coffeeIndex  = coffeeIndex != null ? coffeeIndex : null;
    this.onRebrew     = onRebrew;
    this.onSaveNotes  = onSaveNotes;
  }

  init() {
    injectCSS();
    this._render();
    this._loadInsight();
  }

  _render() {
    const matchRate = calcMatchRate(this.expected, this.actual);

    this.container.innerHTML = `
      <div class="cv-wrap">
        ${this._matchBoxHtml(matchRate)}
        <div id="cv-axes">${this._axesHtml()}</div>
        <div class="cv-insight" id="cv-insight">
          <div class="cv-insight-label">AI 분석</div>
          <div class="cv-insight-text cv-insight-loading" id="cv-insight-text">분석 중…</div>
        </div>
        <button class="cv-btn cv-btn-primary"  id="cv-rebrew">이 설정으로 다시내리기 →</button>
        <button class="cv-btn cv-btn-secondary" id="cv-notes" style="margin-top:12px">노트에 저장하기</button>
        ${this.coffeeIndex != null ? `<button class="cv-btn cv-btn-secondary" id="cv-compare" style="margin-top:8px">이전 추출과 비교 →</button>` : ''}
      </div>
    `;

    document.getElementById('cv-rebrew')?.addEventListener('click', () => this.onRebrew?.());
    document.getElementById('cv-notes')?.addEventListener('click', () => {
      if (this.onSaveNotes) this.onSaveNotes();
      else location.href = 'notes.html';
    });
    document.getElementById('cv-compare')?.addEventListener('click', () => {
      location.href = `compare.html?coffeeId=${this.coffeeIndex}`;
    });
  }

  _matchBoxHtml(rate) {
    if (rate == null) return '';
    const stars = rate >= 90 ? '★★★★★'
                : rate >= 75 ? '★★★★☆'
                : rate >= 60 ? '★★★☆☆'
                : rate >= 45 ? '★★☆☆☆'
                : '★☆☆☆☆';
    return `
      <div class="cv-match-box">
        <div class="cv-match-pct">${rate}<span style="font-size:24px;font-weight:400">%</span></div>
        <div class="cv-match-label">예상과의 일치율</div>
        <div class="cv-match-stars">${stars}</div>
      </div>`;
  }

  _axesHtml() {
    const { expected: e, actual: a } = this;
    if (!e || !a) return '';

    return AXES.map(({ key, label }) => {
      const ev = e[key] ?? 5, av = a[key] ?? 5;
      const diff = av - ev;
      const diffClass = diff > 0 ? 'cv-diff-up' : diff < 0 ? 'cv-diff-down' : 'cv-diff-same';
      const diffText  = diff > 0 ? `+${diff}↑` : diff < 0 ? `${diff}↓` : '일치';

      return `
        <div class="cv-axis-row">
          <div class="cv-axis-label">
            <span>${label}</span>
            <span class="cv-diff ${diffClass}">${diffText}</span>
          </div>
          <div class="cv-bars">
            <div class="cv-bar-row">
              <span class="cv-bar-tag expected">예상</span>
              <div class="cv-bar-track">
                <div class="cv-bar-fill expected" style="width:${ev * 10}%"></div>
              </div>
              <span class="cv-bar-val expected">${ev}</span>
            </div>
            <div class="cv-bar-row">
              <span class="cv-bar-tag actual">실제</span>
              <div class="cv-bar-track">
                <div class="cv-bar-fill actual" style="width:${av * 10}%"></div>
              </div>
              <span class="cv-bar-val actual">${av}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async _loadInsight() {
    const textEl = document.getElementById('cv-insight-text');
    if (!textEl) return;

    try {
      const r    = await fetch('/api/insight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected: this.expected,
          actual:   this.actual,
          recipe:   this.recipe,
          coffee:   this.coffee,
        }),
      });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      if (data.insight) {
        textEl.classList.remove('cv-insight-loading');
        textEl.textContent = data.insight;
        return;
      }
    } catch { /* 네트워크 실패 — 로컬 폴백 */ }

    // 로컬 폴백: 가장 큰 차이 축 기반
    textEl.classList.remove('cv-insight-loading');
    textEl.textContent = this._buildLocalInsight();
  }

  _buildLocalInsight() {
    const { expected: e, actual: a } = this;
    if (!e || !a) return '예상 맛을 입력하지 않아 비교 데이터가 없습니다.';

    let maxDiff = 0, maxAxis = null;
    for (const { key, label } of AXES) {
      const d = Math.abs((a[key] ?? 5) - (e[key] ?? 5));
      if (d > maxDiff) { maxDiff = d; maxAxis = { key, label }; }
    }

    if (!maxAxis || maxDiff < 1) return '예상과 실제가 잘 일치했어요! 이 레시피가 이 원두에 잘 맞습니다.';

    const direction = (a[maxAxis.key] ?? 5) > (e[maxAxis.key] ?? 5) ? '더 높게' : '더 낮게';
    const tips = {
      acidity:    direction === '더 높게' ? '온도를 낮추거나 분쇄도를 굵게 해보세요.' : '온도를 올리거나 분쇄도를 가늘게 해보세요.',
      bitterness: direction === '더 높게' ? '추출 시간을 줄이거나 온도를 내려보세요.' : '추출 시간을 늘리거나 분쇄도를 굵게 해보세요.',
      sweetness:  direction === '더 높게' ? '뜸들이기를 길게, 중간 온도로 추출해보세요.' : '원두 양을 늘리거나 비율을 조정해보세요.',
      body:       direction === '더 높게' ? '분쇄도를 가늘게 하거나 추출 시간을 늘려보세요.' : '분쇄도를 굵게 하거나 추출 시간을 줄여보세요.',
      finish:     direction === '더 높게' ? '추출 마지막 물줄기를 천천히 부어보세요.' : '분쇄도를 굵게 조정해보세요.',
    };
    return `${maxAxis.label}이 예상보다 ${direction} 느껴졌어요. 다음 추출엔: ${tips[maxAxis.key]}`;
  }
}

export { calcMatchRate };
