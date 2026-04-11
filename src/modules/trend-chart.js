/**
 * src/modules/trend-chart.js
 * 변수-결과 인과관계 트렌드 차트 (3회차 이상 자동 생성)
 *
 * 사용법:
 *   import { TrendChart } from '/src/modules/trend-chart.js';
 *   const tc = new TrendChart({ container, records });
 *   tc.render();
 */

const SCORE_AXES = [
  { key: 'acidity',    label: '산미',   color: '#5B9BD5' },
  { key: 'bitterness', label: '쓴맛',   color: '#E06B6B' },
  { key: 'sweetness',  label: '단맛',   color: '#D4A96A' },
  { key: 'body',       label: '바디감', color: '#7CBF7C' },
  { key: 'finish',     label: '여운',   color: '#9B7FBF' },
];

const NS = 'http://www.w3.org/2000/svg';

function mkEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── CSS ──────────────────────────────────────────────────
let _css = false;
function injectCSS() {
  if (_css) return; _css = true;
  const s = document.createElement('style');
  s.textContent = `
.tc-wrap{margin-top:12px}
.tc-title{font-size:11px;letter-spacing:.08em;color:#888;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.tc-title::after{content:'';flex:1;height:.5px;background:#E0E0E0}
.tc-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-bottom:10px}
.tc-legend-item{display:flex;align-items:center;gap:4px;font-size:11px;color:#666;cursor:pointer}
.tc-legend-dot{width:8px;height:8px;border-radius:50%}
.tc-legend-item.hidden{opacity:.35}
.tc-svg{width:100%;display:block}
.tc-insight{font-size:12px;color:#5C3D1A;background:#FFF8F0;border-left:2px solid #D4A96A;padding:8px 12px;margin-top:10px;line-height:1.6}
`;
  document.head.appendChild(s);
}

export class TrendChart {
  /**
   * @param {{
   *   container: HTMLElement,
   *   records: Array<{ baseScores?, starRating?, recipe?, createdAt? }>,
   * }}
   */
  constructor({ container, records }) {
    this.container = container;
    this.records   = records;
    this._hidden   = new Set();
  }

  render() {
    if (this.records.length < 3) {
      this.container.innerHTML = `<div style="font-size:12px;color:#AAA;text-align:center;padding:12px 0">3회차부터 변수-결과 그래프가 생성됩니다</div>`;
      return;
    }

    injectCSS();

    // baseScores가 있는 기록만 사용
    const valid = this.records.filter(r => r.baseScores);
    if (valid.length < 2) {
      this.container.innerHTML = `<div style="font-size:12px;color:#AAA;text-align:center;padding:12px 0">상세 슬라이더 기록이 2회 이상 필요합니다</div>`;
      return;
    }

    this.container.innerHTML = `
      <div class="tc-wrap">
        <div class="tc-title">변수-결과 그래프</div>
        <div class="tc-legend" id="tc-legend"></div>
        <svg class="tc-svg" id="tc-svg" viewBox="0 0 320 160"></svg>
        <div class="tc-insight" id="tc-insight"></div>
      </div>`;

    this._buildLegend(valid);
    this._drawChart(valid);
    this._buildInsight(valid);
  }

  _buildLegend(records) {
    const legend = this.container.querySelector('#tc-legend');
    // 별점 포함
    const allAxes = [{ key: 'star', label: '별점', color: '#FFB300' }, ...SCORE_AXES];
    allAxes.forEach(({ key, label, color }) => {
      // 데이터 존재 여부 확인
      const hasData = records.some(r =>
        key === 'star' ? r.starRating != null : r.baseScores?.[key] != null);
      if (!hasData) return;

      const item = document.createElement('div');
      item.className = 'tc-legend-item';
      item.dataset.key = key;
      item.innerHTML = `<div class="tc-legend-dot" style="background:${color}"></div>${label}`;
      item.addEventListener('click', () => {
        if (this._hidden.has(key)) this._hidden.delete(key);
        else this._hidden.add(key);
        item.classList.toggle('hidden', this._hidden.has(key));
        this._drawChart(records);
      });
      legend.appendChild(item);
    });
  }

  _drawChart(records) {
    const svg   = this.container.querySelector('#tc-svg');
    svg.innerHTML = '';

    const W = 320, H = 160;
    const PAD = { top: 12, right: 20, bottom: 28, left: 28 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top  - PAD.bottom;
    const n  = records.length;

    // ── 가이드 라인 ──────────────────────────────────
    [2, 4, 6, 8, 10].forEach(v => {
      const y = PAD.top + cH - ((v - 1) / 9) * cH;
      const line = mkEl('line', { x1: PAD.left, y1: y, x2: W - PAD.right, y2: y, stroke: '#F0EEEB', 'stroke-width': '0.5' });
      svg.appendChild(line);
      const txt = mkEl('text', { x: PAD.left - 4, y: y + 1, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': '8', fill: '#CCCCCC', 'font-family': 'sans-serif' });
      txt.textContent = v;
      svg.appendChild(txt);
    });

    // ── X축 라벨 (회차) ──────────────────────────────
    records.forEach((_, i) => {
      const x = PAD.left + (i / Math.max(1, n - 1)) * cW;
      const txt = mkEl('text', { x, y: H - PAD.bottom + 10, 'text-anchor': 'middle', 'font-size': '9', fill: '#888', 'font-family': 'sans-serif' });
      txt.textContent = `${i + 1}회`;
      svg.appendChild(txt);
    });

    // ── 데이터 라인 ──────────────────────────────────
    const allAxes = [{ key: 'star', label: '별점', color: '#FFB300' }, ...SCORE_AXES];

    allAxes.forEach(({ key, color }) => {
      if (this._hidden.has(key)) return;

      const pts = records.map((r, i) => {
        const v = key === 'star' ? (r.starRating || null) : (r.baseScores?.[key] ?? null);
        if (v == null) return null;
        // 별점(0-5)을 10점 스케일로 변환
        const normalized = key === 'star' ? v * 2 : v;
        const x = PAD.left + (i / Math.max(1, n - 1)) * cW;
        const y = PAD.top  + cH - ((normalized - 1) / 9) * cH;
        return { x, y, v: normalized };
      }).filter(Boolean);

      if (pts.length < 2) return;

      // 라인
      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      svg.appendChild(mkEl('path', { d: pathD, fill: 'none', stroke: color, 'stroke-width': '1.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

      // 포인트 원
      pts.forEach(p => {
        svg.appendChild(mkEl('circle', { cx: p.x, cy: p.y, r: '3', fill: color, stroke: '#fff', 'stroke-width': '1' }));
      });
    });
  }

  _buildInsight(records) {
    const insightEl = this.container.querySelector('#tc-insight');
    if (!insightEl) return;

    // 가장 변화량이 큰 축 찾기
    let maxChange = 0, maxAxis = null;
    SCORE_AXES.forEach(({ key, label }) => {
      const vals = records.map(r => r.baseScores?.[key]).filter(v => v != null);
      if (vals.length < 2) return;
      const change = Math.max(...vals) - Math.min(...vals);
      if (change > maxChange) { maxChange = change; maxAxis = { key, label }; }
    });

    // 별점 추세
    const stars = records.map(r => r.starRating).filter(v => v != null);
    const starTrend = stars.length >= 2 ? (stars[stars.length - 1] - stars[0] > 0 ? '상승' : stars[stars.length - 1] - stars[0] < 0 ? '하락' : '유지') : null;

    if (!maxAxis) {
      insightEl.textContent = '더 많은 기록이 쌓이면 변수-결과 상관관계를 분석해드려요.';
      return;
    }

    const lastVal  = records[records.length - 1].baseScores?.[maxAxis.key];
    const firstVal = records[0].baseScores?.[maxAxis.key];
    const direction = lastVal > firstVal ? '높아지는' : '낮아지는';

    insightEl.innerHTML = `<strong>${maxAxis.label}</strong>이 회차가 쌓일수록 ${direction} 경향이 있어요 (${firstVal} → ${lastVal}).${starTrend ? ` 만족도는 ${starTrend} 중.` : ''}`;
  }
}
