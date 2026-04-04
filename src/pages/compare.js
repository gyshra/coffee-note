/**
 * src/pages/compare.js
 * compare.html 인라인 스크립트 → ES Module
 */

import { showToast } from '../modules/utils.js';

// ── 상태 ──────────────────────────────────────
let tastingData = null;
let coffeeData = null;
let communityData = null;
let cqiData = null;
let layers = { mine: true, community: true, cqi: true };

const AXES = ['아로마','산미','단맛','바디감','여운'];
const AXIS_KEYS = ['aroma','acidity','sweetness','body','aftertaste'];

// 색상
const COLOR_MINE      = '#121212';
const COLOR_COMMUNITY = '#8C7355';
const COLOR_CQI       = '#3B6EA5';

// ── 초기화 ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

function loadData() {
  // URL params
  const params = new URLSearchParams(location.search);
  const tastingId = params.get('tastingId');
  const coffeeId = params.get('coffeeId');

  // sessionStorage에서 테이스팅 기록 로드
  const stored = sessionStorage.getItem('last_tasting');
  if (stored) {
    tastingData = JSON.parse(stored);
  } else {
    // localStorage에서 최신 기록 가져오기
    const records = JSON.parse(localStorage.getItem('coffee_note_tastings') || '[]');
    if (tastingId) {
      tastingData = records.find(r => r.id === tastingId) || records[records.length - 1];
    } else {
      tastingData = records[records.length - 1];
    }
  }

  // 원두 데이터
  const coffeeStored = sessionStorage.getItem('tasting_coffee');
  if (coffeeStored) {
    coffeeData = JSON.parse(coffeeStored);
  } else if (coffeeId !== null) {
    const coffees = JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
    coffeeData = coffees[parseInt(coffeeId)] || null;
  } else if (tastingData?.coffeeIndex !== undefined) {
    const coffees = JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
    coffeeData = coffees[tastingData.coffeeIndex] || null;
  }

  renderBanner();
  renderRadar();
  renderBarChart();
  loadInsight();
  loadCommunityData();
}

// ── 배너 렌더 ─────────────────────────────────
function renderBanner() {
  if (coffeeData) {
    document.getElementById('bannerName').textContent = coffeeData.name || '—';
    document.getElementById('bannerSub').textContent =
      [coffeeData.country, coffeeData.process, coffeeData.brew_method || tastingData?.brew_method].filter(Boolean).join(' · ');
  }
  if (tastingData?.rating) {
    document.getElementById('bannerRating').textContent = parseFloat(tastingData.rating).toFixed(1);
  }
}

// ── 레이더 차트 렌더 ──────────────────────────
function renderRadar() {
  const canvas = document.getElementById('radarCanvas');
  const size = Math.min(window.innerWidth - 32, 320);
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.38;
  const n = AXES.length;

  ctx.clearRect(0, 0, size, size);

  // 가이드 다각형 (5단계)
  for (let lvl = 1; lvl <= 5; lvl++) {
    const r = maxR * lvl / 5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = lvl === 5 ? '#C0C0C0' : '#E8E8E8';
    ctx.lineWidth = lvl === 5 ? 1.2 : 0.8;
    ctx.stroke();
  }

  // 축 선
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
    ctx.strokeStyle = '#D0D0D0'; ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 레이어 그리기
  if (layers.cqi && cqiData) {
    drawLayer(ctx, cx, cy, maxR, n, getCqiValues(), COLOR_CQI, true, 0.15);
  }
  if (layers.community && communityData) {
    drawLayer(ctx, cx, cy, maxR, n, getCommunityValues(), COLOR_COMMUNITY, true, 0.15);
  }
  if (layers.mine && tastingData) {
    drawLayer(ctx, cx, cy, maxR, n, getMineValues(), COLOR_MINE, false, 0.12);
  }

  // 축 라벨
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const labelR = maxR + 18;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);
    ctx.fillStyle = '#333';
    ctx.font = `700 11px 'Pretendard Variable', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(AXES[i], x, y);
  }

  // 내 기록 포인트 원
  if (layers.mine && tastingData) {
    const vals = getMineValues();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const r = maxR * (vals[i] / 10);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_MINE;
      ctx.fill();
    }
  }
}

function drawLayer(ctx, cx, cy, maxR, n, vals, color, dashed, fillAlpha) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const r = maxR * (vals[i] / 10);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();

  // 채움
  ctx.fillStyle = hexToRgba(color, fillAlpha);
  ctx.fill();

  // 선
  if (dashed) ctx.setLineDash([4, 4]);
  else ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 1.5 : 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getMineValues() {
  if (!tastingData) return [5,5,5,5,5];
  const scores = tastingData.baseScores || {};
  // baseScores는 한국어 키, AXES 순서대로 추출
  return AXES.map(k => parseFloat(scores[k] || tastingData[AXIS_KEYS[AXES.indexOf(k)]] || 5));
}

function getCommunityValues() {
  if (!communityData) return [6,6,6,6,6];
  return AXIS_KEYS.map(k => parseFloat(communityData.avg?.[k] || 6));
}

function getCqiValues() {
  if (!cqiData) return [7,7,7,7,7];
  return [
    parseFloat(cqiData.aroma || 7),
    parseFloat(cqiData.acidity || 7),
    parseFloat(cqiData.flavor || 7),
    parseFloat(cqiData.body || 6),
    parseFloat(cqiData.aftertaste || 7)
  ];
}

// ── 레이어 토글 ───────────────────────────────
function toggleLayer(name, el) {
  layers[name] = !layers[name];
  el.classList.toggle('inactive', !layers[name]);
  renderRadar();
  renderBarChart();
}

// ── 바 차트 렌더 ──────────────────────────────
function renderBarChart() {
  const mine = getMineValues();
  const comm = layers.community && communityData ? getCommunityValues() : null;
  const cqi = layers.cqi && cqiData ? getCqiValues() : null;

  const chart = document.getElementById('barChart');
  chart.innerHTML = AXES.map((axis, i) => {
    const mVal = mine[i];
    const cVal = comm ? comm[i] : null;
    const qVal = cqi ? cqi[i] : null;

    return `
      <div class="bar-row">
        <div class="bar-label">${axis}</div>
        <div class="bar-group">
          ${layers.mine ? `
          <div class="bar-item">
            <div class="bar-fill-wrap">
              <div class="bar-fill" style="width:${mVal*10}%;background:${COLOR_MINE}"></div>
            </div>
            <div class="bar-val" style="color:${COLOR_MINE}">${mVal}</div>
          </div>` : ''}
          ${cVal !== null ? `
          <div class="bar-item">
            <div class="bar-fill-wrap">
              <div class="bar-fill" style="width:${cVal*10}%;background:${COLOR_COMMUNITY}"></div>
            </div>
            <div class="bar-val" style="color:${COLOR_COMMUNITY}">${cVal.toFixed(1)}</div>
          </div>` : ''}
          ${qVal !== null ? `
          <div class="bar-item">
            <div class="bar-fill-wrap">
              <div class="bar-fill" style="width:${qVal*10}%;background:${COLOR_CQI}"></div>
            </div>
            <div class="bar-val" style="color:${COLOR_CQI}">${qVal.toFixed(1)}</div>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── AI 인사이트 로드 ──────────────────────────
async function loadInsight() {
  const mine = getMineValues();
  const comm = getCommunityValues();

  // 차이 계산
  const diffs = AXES.map((a, i) => ({
    axis: a, mine: mine[i], comm: comm[i],
    diff: mine[i] - comm[i]
  }));
  const biggest = diffs.reduce((a, b) => Math.abs(a.diff) > Math.abs(b.diff) ? a : b);
  const recipe = tastingData?.brew_method || '—';

  // API 호출 시도
  try {
    const res = await fetch('/api/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coffee: coffeeData?.name || '',
        mine: Object.fromEntries(AXIS_KEYS.map((k, i) => [k, mine[i]])),
        community: Object.fromEntries(AXIS_KEYS.map((k, i) => [k, comm[i]])),
        brew_method: recipe,
        process: coffeeData?.process || ''
      })
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('insightText').textContent = data.insight || buildLocalInsight(biggest, recipe);
      if (data.tip) {
        document.getElementById('insightTipText').textContent = data.tip;
        document.getElementById('insightTip').style.display = 'block';
      }
      return;
    }
  } catch {}

  // API 실패 시 로컬 인사이트
  document.getElementById('insightText').textContent = buildLocalInsight(biggest, recipe);
  document.getElementById('insightTipText').textContent = buildLocalTip(biggest);
  document.getElementById('insightTip').style.display = 'block';
}

function buildLocalInsight(biggest, method) {
  const dir = biggest.diff > 0 ? '높게' : '낮게';
  const reasons = {
    '아로마': `추출 온도나 원두 신선도가 아로마 강도에 영향을 줄 수 있습니다. ${method} 추출 시 물 온도를 2-3°C 조정해보세요.`,
    '산미': `분쇄도와 추출 시간이 산미에 직접적인 영향을 줍니다. 분쇄도를 조금 더 ${biggest.diff > 0 ? '굵게' : '가늘게'} 해보세요.`,
    '단맛': `단맛은 추출 온도와 비율에 민감합니다. 물 온도를 ${biggest.diff < 0 ? '올려서' : '낮춰서'} 추출하면 단맛이 변할 수 있어요.`,
    '바디감': `바디감은 추출 방법과 비율에 따라 크게 달라집니다. 원두 비율을 조정해보세요.`,
    '여운': `여운은 원두의 가공방식과 로스팅 정도에 영향을 받습니다. 같은 원두를 여러 번 시도하면 더 정확한 프로파일이 만들어져요.`
  };
  const base = reasons[biggest.axis] || `${biggest.axis}에서 커뮤니티 평균보다 ${dir} 감지했습니다.`;
  return `${biggest.axis}을(를) 커뮤니티 평균보다 ${Math.abs(biggest.diff).toFixed(1)}점 ${dir} 느끼셨네요. ${base}`;
}

function buildLocalTip(biggest) {
  const tips = {
    '아로마': '추출 직후 바로 마셔보세요 — 아로마는 온도가 식을수록 변합니다.',
    '산미': biggest.diff > 0 ? '물 온도를 2°C 낮추거나 분쇄도를 약간 굵게 해보세요.' : '물 온도를 2°C 올리거나 추출 시간을 10초 줄여보세요.',
    '단맛': biggest.diff < 0 ? '뜸들이기 시간을 5초 늘려보세요.' : '원두 투입량을 1g 줄여보세요.',
    '바디감': biggest.diff < 0 ? '원두:물 비율을 1:15로 높여보세요.' : '비율을 1:17로 낮춰보세요.',
    '여운': '같은 원두를 3번 이상 마시면 여운의 패턴을 더 잘 인식할 수 있어요.'
  };
  return tips[biggest.axis] || '같은 원두를 다른 추출 방법으로 시도해보세요.';
}

// ── 커뮤니티 데이터 로드 ──────────────────────
async function loadCommunityData() {
  if (!coffeeData) {
    renderCommunityReviews([]);
    return;
  }

  try {
    const res = await fetch(`/api/compare?coffee=${encodeURIComponent(coffeeData.name || '')}`);
    if (res.ok) {
      const data = await res.json();
      communityData = data;
      cqiData = data.cqi;
      renderRadar();
      renderBarChart();
      renderCommunityReviews(data.recent || []);
      return;
    }
  } catch {}

  // 더미 커뮤니티 데이터
  communityData = {
    avg: { aroma: 6.8, acidity: 7.2, sweetness: 6.5, body: 5.8, aftertaste: 7.0 },
    count: 0
  };
  renderRadar(); renderBarChart();
  renderCommunityReviews([]);
}

function renderCommunityReviews(reviews) {
  const container = document.getElementById('communityReviews');
  if (reviews.length === 0) {
    container.innerHTML = `
      <div style="padding:24px 0;text-align:center">
        <div style="font-size:11px;color:var(--text-sub)">아직 커뮤니티 기록이 없습니다</div>
        <div style="font-size:11px;color:var(--text-sub);margin-top:4px">첫 번째 기록자가 되어보세요 ☕</div>
      </div>
    `;
    return;
  }

  const SCA_COLORS = {
    'Fruity':'#E24B4A','Floral':'#D4537E','Sweet':'#EF9F27',
    'Nutty/Cocoa':'#854F0B','Roasted':'#5F5E5A'
  };

  container.innerHTML = reviews.slice(0, 5).map(r => {
    const tags = (r.flavor_tags || []).slice(0, 4);
    const tagsHtml = tags.map(t => `
      <span class="review-tag">
        <span class="review-tag-dot" style="background:${SCA_COLORS[t] || '#888'}"></span>
        ${t}
      </span>
    `).join('');
    const stars = '★'.repeat(Math.round(r.rating || 0)) + '☆'.repeat(5 - Math.round(r.rating || 0));
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${(r.nickname||'?')[0].toUpperCase()}</div>
          <span class="review-nick">${r.nickname || '익명'}</span>
          ${r.brew_method ? `<span class="review-method">${r.brew_method}</span>` : ''}
          <span class="review-stars">${stars}</span>
        </div>
        ${r.memo ? `<div class="review-text">${r.memo}</div>` : ''}
        ${tagsHtml ? `<div class="review-tags">${tagsHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── 카드 공유 ─────────────────────────────────
async function shareCard() {
  // card-generator.js 사용 (있으면)
  if (typeof CardGenerator !== 'undefined' && tastingData && coffeeData) {
    try {
      const record = {
        ...tastingData,
        coffeeName: coffeeData.name || tastingData.coffeeName,
      };
      const dataUrl = CardGenerator.generate(record);
      CardGenerator.share(dataUrl);
      return;
    } catch (e) {
      console.warn('CardGenerator 실패:', e);
    }
  }

  // Web Share API 폴백
  const text = `☕ ${coffeeData?.name || '커피'}\n${AXES.map((a,i) => `${a}: ${getMineValues()[i]}`).join(' · ')}\n\n#CoffeeNote #스페셜티커피`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Coffee Note 센서리 카드', text });
      return;
    } catch {}
  }

  // 클립보드 복사
  try {
    await navigator.clipboard.writeText(text);
    showToast('텍스트를 클립보드에 복사했습니다');
  } catch {
    showToast('공유를 준비 중입니다');
  }
}

// ── 네비게이션 ────────────────────────────────
function goTasting() {
  const params = new URLSearchParams(location.search);
  const coffeeId = params.get('coffeeId') || tastingData?.coffeeIndex || '0';
  location.href = `tasting.html?coffeeId=${coffeeId}`;
}

// 화면 리사이즈 시 레이더 재렌더
window.addEventListener('resize', () => renderRadar());

// onclick 속성에서 호출되는 함수 노출
window.toggleLayer = toggleLayer;
window.shareCard = shareCard;
window.goTasting = goTasting;
