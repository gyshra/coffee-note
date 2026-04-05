/**
 * src/pages/recipe.js
 * recipe.html 인라인 스크립트 → ES Module
 */

import { toast } from '../modules/utils.js';

// ── SCA Golden Cup 매트릭스 (48조합) ──
const SCA_MATRIX = {
  washed: {
    light: {
      V60:      { temp:'94-96°C', ratio:'1:15', grind:'중간-가늘게', time:'2:30' },
      칼리타:   { temp:'93-95°C', ratio:'1:15', grind:'중간', time:'3:00' },
      케멕스:   { temp:'93°C',    ratio:'1:16', grind:'굵게-중간', time:'3:30' },
      에어로프레스: { temp:'85-90°C', ratio:'1:13', grind:'가늘게', time:'1:30' },
      프렌치프레스: { temp:'92°C',  ratio:'1:14', grind:'굵게', time:'4:00' },
      에스프레소: { temp:'93-94°C', ratio:'1:2',  grind:'매우 가늘게', time:'0:28' },
      콜드브루: { temp:'상온',    ratio:'1:8',  grind:'굵게', time:'12h' },
      모카포트: { temp:'—',       ratio:'1:7',  grind:'중간-가늘게', time:'4:00' },
    },
    medium: {
      V60:      { temp:'92-94°C', ratio:'1:16', grind:'중간', time:'2:45' },
      칼리타:   { temp:'91-93°C', ratio:'1:16', grind:'중간', time:'3:15' },
      케멕스:   { temp:'92°C',    ratio:'1:17', grind:'굵게-중간', time:'4:00' },
      에어로프레스: { temp:'80-85°C', ratio:'1:14', grind:'중간', time:'2:00' },
      프렌치프레스: { temp:'90°C',  ratio:'1:15', grind:'굵게', time:'4:00' },
      에스프레소: { temp:'91-93°C', ratio:'1:2',  grind:'가늘게', time:'0:28' },
      콜드브루: { temp:'상온',    ratio:'1:8',  grind:'굵게', time:'12h' },
      모카포트: { temp:'—',       ratio:'1:7',  grind:'중간-가늘게', time:'4:00' },
    },
    dark: {
      V60:      { temp:'89-91°C', ratio:'1:17', grind:'중간-굵게', time:'3:00' },
      칼리타:   { temp:'88-90°C', ratio:'1:17', grind:'중간', time:'3:30' },
      케멕스:   { temp:'89°C',    ratio:'1:17', grind:'굵게', time:'4:00' },
      에어로프레스: { temp:'78-82°C', ratio:'1:14', grind:'중간', time:'2:30' },
      프렌치프레스: { temp:'88°C',  ratio:'1:15', grind:'굵게', time:'4:00' },
      에스프레소: { temp:'89-91°C', ratio:'1:2.5', grind:'가늘게', time:'0:30' },
      콜드브루: { temp:'상온',    ratio:'1:9',  grind:'굵게', time:'14h' },
      모카포트: { temp:'—',       ratio:'1:8',  grind:'중간-가늘게', time:'4:00' },
    }
  },
  natural: {
    light:  { V60: { temp:'93°C', ratio:'1:15', grind:'중간', time:'2:30' }, 칼리타: { temp:'92°C', ratio:'1:15', grind:'중간', time:'3:00' }, 케멕스: { temp:'92°C', ratio:'1:16', grind:'중간-굵게', time:'3:30' }, 에어로프레스: { temp:'83°C', ratio:'1:13', grind:'중간-가늘게', time:'1:30' }, 프렌치프레스: { temp:'91°C', ratio:'1:14', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'92°C', ratio:'1:2', grind:'가늘게', time:'0:28' }, 콜드브루: { temp:'상온', ratio:'1:8', grind:'굵게', time:'14h' }, 모카포트: { temp:'—', ratio:'1:7', grind:'중간', time:'4:00' } },
    medium: { V60: { temp:'91°C', ratio:'1:15', grind:'중간', time:'2:45' }, 칼리타: { temp:'90°C', ratio:'1:15', grind:'중간', time:'3:15' }, 케멕스: { temp:'91°C', ratio:'1:16', grind:'중간-굵게', time:'4:00' }, 에어로프레스: { temp:'81°C', ratio:'1:13', grind:'중간', time:'2:00' }, 프렌치프레스: { temp:'89°C', ratio:'1:14', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'91°C', ratio:'1:2.5', grind:'가늘게', time:'0:30' }, 콜드브루: { temp:'상온', ratio:'1:8', grind:'굵게', time:'14h' }, 모카포트: { temp:'—', ratio:'1:7', grind:'중간', time:'4:00' } },
    dark:   { V60: { temp:'89°C', ratio:'1:16', grind:'중간-굵게', time:'3:00' }, 칼리타: { temp:'88°C', ratio:'1:16', grind:'중간', time:'3:30' }, 케멕스: { temp:'89°C', ratio:'1:17', grind:'굵게', time:'4:00' }, 에어로프레스: { temp:'79°C', ratio:'1:14', grind:'중간', time:'2:30' }, 프렌치프레스: { temp:'87°C', ratio:'1:15', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'89°C', ratio:'1:2.5', grind:'가늘게', time:'0:30' }, 콜드브루: { temp:'상온', ratio:'1:9', grind:'굵게', time:'16h' }, 모카포트: { temp:'—', ratio:'1:8', grind:'중간', time:'4:00' } }
  },
  honey: {
    light:  { V60: { temp:'93°C', ratio:'1:15', grind:'중간', time:'2:40' }, 칼리타: { temp:'92°C', ratio:'1:15', grind:'중간', time:'3:00' }, 케멕스: { temp:'92°C', ratio:'1:16', grind:'중간-굵게', time:'3:30' }, 에어로프레스: { temp:'84°C', ratio:'1:13', grind:'중간-가늘게', time:'1:30' }, 프렌치프레스: { temp:'91°C', ratio:'1:14', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'92°C', ratio:'1:2', grind:'가늘게', time:'0:28' }, 콜드브루: { temp:'상온', ratio:'1:8', grind:'굵게', time:'12h' }, 모카포트: { temp:'—', ratio:'1:7', grind:'중간', time:'4:00' } },
    medium: { V60: { temp:'91°C', ratio:'1:16', grind:'중간', time:'2:45' }, 칼리타: { temp:'90°C', ratio:'1:16', grind:'중간', time:'3:15' }, 케멕스: { temp:'91°C', ratio:'1:16', grind:'중간-굵게', time:'4:00' }, 에어로프레스: { temp:'82°C', ratio:'1:14', grind:'중간', time:'2:00' }, 프렌치프레스: { temp:'89°C', ratio:'1:15', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'91°C', ratio:'1:2', grind:'가늘게', time:'0:28' }, 콜드브루: { temp:'상온', ratio:'1:8', grind:'굵게', time:'12h' }, 모카포트: { temp:'—', ratio:'1:7', grind:'중간', time:'4:00' } },
    dark:   { V60: { temp:'89°C', ratio:'1:17', grind:'중간-굵게', time:'3:00' }, 칼리타: { temp:'88°C', ratio:'1:17', grind:'중간', time:'3:30' }, 케멕스: { temp:'89°C', ratio:'1:17', grind:'굵게', time:'4:00' }, 에어로프레스: { temp:'80°C', ratio:'1:14', grind:'중간', time:'2:30' }, 프렌치프레스: { temp:'87°C', ratio:'1:15', grind:'굵게', time:'4:00' }, 에스프레소: { temp:'89°C', ratio:'1:2.5', grind:'가늘게', time:'0:30' }, 콜드브루: { temp:'상온', ratio:'1:9', grind:'굵게', time:'14h' }, 모카포트: { temp:'—', ratio:'1:8', grind:'중간', time:'4:00' } }
  }
};

const METHOD_STEPS = {
  V60: [
    { action:'뜸들이기', detail:'30ml 물을 붓고 30초 기다립니다', time:'0:30' },
    { action:'1차 붓기', detail:'총량의 40%까지 원을 그리며 붓기', time:'1:00' },
    { action:'2차 붓기', detail:'총량의 70%까지 천천히 붓기', time:'1:30' },
    { action:'마무리 붓기', detail:'나머지 물을 붓고 드리퍼 흔들기', time:'2:30' },
    { action:'완료', detail:'드리퍼 제거 후 잔에 따르기', time:'2:30' },
  ],
  에어로프레스: [
    { action:'분쇄/예열', detail:'그라인더 세팅 후 기구 예열', time:'0:00' },
    { action:'원두 투입', detail:'필터 적신 후 원두 넣기', time:'0:10' },
    { action:'1차 붓기', detail:'전량 붓고 30초 기다리기', time:'0:40' },
    { action:'교반', detail:'스패튤라로 10회 저어주기', time:'0:50' },
    { action:'프레스', detail:'천천히 30초간 눌러 추출', time:'1:20' },
  ],
  프렌치프레스: [
    { action:'예열', detail:'따뜻한 물로 기구 예열 후 버리기', time:'0:00' },
    { action:'원두 투입', detail:'원두 넣고 타이머 시작', time:'0:10' },
    { action:'물 붓기', detail:'전체 물량 붓고 살짝 저어주기', time:'0:30' },
    { action:'대기', detail:'뚜껑 닫고 4분 기다리기', time:'4:30' },
    { action:'프레스', detail:'천천히 내리고 즉시 따르기', time:'4:30' },
  ],
};

function getDefaultSteps(method) {
  return [
    { action:`${method} 준비`, detail:'기구를 예열하고 원두를 분쇄합니다', time:'0:00' },
    { action:'원두 투입', detail:'분쇄된 원두를 투입합니다', time:'0:10' },
    { action:'추출', detail:'레시피에 따라 추출합니다', time:'—' },
    { action:'완료', detail:'완성된 커피를 즐겨보세요', time:'—' },
  ];
}

// ── 추출법별 물 투입 분배 정의 ──
// bloom: 뜸들이기(2×원두g), remFrac: 나머지 물의 비율, totalFrac: 총량 대비 비율
const BREW_WATER_DIST = {
  V60: [
    { action:'뜸들이기',    bloom:true },
    { action:'1차 붓기',    remFrac:0.40 },
    { action:'2차 붓기',    remFrac:0.35 },
    { action:'마무리 붓기', remFrac:0.25 },
    { action:'완료',        noWater:true },
  ],
  칼리타: [
    { action:'뜸들이기',    bloom:true },
    { action:'1차 붓기',    remFrac:0.45 },
    { action:'2차 붓기',    remFrac:0.35 },
    { action:'마무리 붓기', remFrac:0.20 },
    { action:'완료',        noWater:true },
  ],
  케멕스: [
    { action:'뜸들이기',    bloom:true },
    { action:'1차 붓기',    remFrac:0.40 },
    { action:'2차 붓기',    remFrac:0.35 },
    { action:'마무리 붓기', remFrac:0.25 },
    { action:'완료',        noWater:true },
  ],
  에어로프레스: [
    { action:'분쇄/예열',  noWater:true },
    { action:'원두 투입',  noWater:true },
    { action:'물 붓기',    totalFrac:1.0 },
    { action:'교반',       noWater:true },
    { action:'프레스',     noWater:true },
  ],
  프렌치프레스: [
    { action:'예열',       noWater:true },
    { action:'원두 투입',  noWater:true },
    { action:'물 붓기',    totalFrac:1.0 },
    { action:'대기',       noWater:true },
    { action:'프레스',     noWater:true },
  ],
};

// ── 분쇄도 클릭 수 가이드 (Comandante 기준) ──
const GRIND_GUIDE = {
  V60:         { clicks:'20–26클릭', size:'중간-가늘게 (600–800µm)', tip:'굵을수록 추출 단축, 가늘수록 바디 증가' },
  칼리타:      { clicks:'22–28클릭', size:'중간 (700–900µm)',        tip:'균일한 분쇄가 핵심 — 세팅 후 시험 추출 권장' },
  케멕스:      { clicks:'28–34클릭', size:'굵게-중간 (850–1100µm)',  tip:'두꺼운 필터 감안해 일반보다 1–2단계 굵게' },
  에어로프레스: { clicks:'12–18클릭', size:'중간-가늘게 (500–700µm)', tip:'압력 추출이므로 에스프레소보다 굵게 설정' },
  프렌치프레스: { clicks:'32–40클릭', size:'굵게 (900–1200µm)',       tip:'고운 분쇄는 쓴맛 과추출 원인 — 굵게 유지 필수' },
  에스프레소:  { clicks:'5–10클릭',  size:'매우 가늘게 (200–350µm)', tip:'0.5클릭 조정에도 추출 시간 5초 이상 변화 가능' },
  콜드브루:    { clicks:'34–42클릭', size:'굵게 (1000–1300µm)',       tip:'장시간 접촉이므로 굵은 분쇄로 과추출 방지' },
  모카포트:    { clicks:'10–16클릭', size:'중간-가늘게 (400–600µm)', tip:'에스프레소보다 조금 굵게 — 스팀압으로 추출' },
};

// ── 로스팅 포인트 가이드 ──
const ROAST_GUIDE = {
  light: {
    label: '라이트 로스트',
    point: '원두 내부 195–205°C (1차 크랙 직후)',
    flavor: '산미·과일향·플로럴 강조',
    tip: '섬세한 향미를 위해 낮은 추출 온도(88–92°C) 권장',
  },
  medium: {
    label: '미디엄 로스트',
    point: '원두 내부 210–220°C',
    flavor: '산미·바디·단맛 균형',
    tip: 'SCA Golden Cup 기준에 가장 근접, 폭넓은 추출법에 적합',
  },
  dark: {
    label: '다크 로스트',
    point: '원두 내부 225°C+ (2차 크랙 이후)',
    flavor: '쓴맛·초콜릿·스모키 강조',
    tip: '낮은 추출 온도(85–90°C)로 쓴맛 조절, 짧은 추출 시간 권장',
  },
};

// ── 상태 ──
let currentCoffee = null;
let currentMethod = 'V60';
let selectedRecipeId = null;
let selectedRecipe = null;
let myGear = { dripper: 'V60', grinder: '핸드밀' };

// ── recipeState: Phase 4 타이머에서 그대로 활용 가능한 계산 결과 구조 ──
const recipeState = {
  beanG:      15,       // 원두 그람 (사용자 입력)
  totalWater: 225,      // 계산된 총 물 용량 (ml)
  ratio:      '1:15',   // 현재 비율 문자열
  ratioNum:   15,       // 파싱된 비율 숫자 (배수)
  method:     'V60',    // 추출법
  steps:      [],       // [{ action, detail, waterMl, time }] — 타이머 스텝 배열
};

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
  if (window.CoffeeNote) window.CoffeeNote.renderBottomNav('recipe');
  loadGear();
  loadCoffee();
});

function loadGear() {
  try {
    const saved = JSON.parse(localStorage.getItem('coffee_note_gear') || '{}');
    myGear = { ...myGear, ...saved };
    document.getElementById('gearDripper').textContent = myGear.dripper;
    document.getElementById('gearGrinder').textContent = myGear.grinder;
    selectMethod(myGear.dripper);
  } catch {}
}

function loadCoffee() {
  const params = new URLSearchParams(location.search);
  const coffeeId = params.get('coffeeId');

  const stored = sessionStorage.getItem('recipe_coffee');
  if (stored) {
    currentCoffee = JSON.parse(stored);
  } else if (coffeeId !== null) {
    const coffees = getCoffeesLocal();
    currentCoffee = coffees[parseInt(coffeeId)] || null;
  }

  if (currentCoffee) {
    renderCoffeeBanner(currentCoffee);
    updateScaRecipe();
    loadCommunityStats();
  }

  renderRecipeList();
}

function getCoffeesLocal() {
  try {
    if (typeof getCoffees === 'function') return getCoffees();
    return JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
  } catch { return []; }
}

function renderCoffeeBanner(coffee) {
  document.getElementById('bannerName').textContent = coffee.name || '—';
  document.getElementById('bannerSub').textContent =
    [coffee.country, coffee.process, coffee.roaster].filter(Boolean).join(' · ');
  if (coffee.sca_score) {
    document.getElementById('bannerScore').textContent = parseFloat(coffee.sca_score).toFixed(1);
  }
}

// ── 레시피 계산 엔진 ──

/**
 * 비율 문자열 파싱 → 물 배수 숫자
 * '1:15' → 15 / '1:2.5' → 2.5
 */
function parseRatio(ratioStr) {
  const m = String(ratioStr).match(/1[:\s]([\d.]+)/);
  return m ? parseFloat(m[1]) : 15;
}

/**
 * 원두 g × 비율 배수 → 총 물량 (ml, 소수점 1자리)
 */
function calcTotalWater(beanG, ratioNum) {
  return Math.round(beanG * ratioNum * 10) / 10;
}

/**
 * 추출법별 차수별 물 투입량 계산
 * @returns { totalWater, ratioNum, steps: [{ action, detail, waterMl, time }] }
 * Phase 4 타이머: recipeState.steps 배열을 그대로 활용
 */
function calculateWaterSteps(beanG, method, ratioStr) {
  const ratioNum   = parseRatio(ratioStr);
  const totalWater = calcTotalWater(beanG, ratioNum);
  const dist       = BREW_WATER_DIST[method];
  const baseSteps  = METHOD_STEPS[method] || getDefaultSteps(method);

  if (!dist) {
    // 계산 템플릿 없는 추출법 → 기존 스텝 + 총량 안내
    return {
      totalWater, ratioNum,
      steps: baseSteps.map(s => ({ ...s, waterMl: null })),
    };
  }

  const bloom     = Math.round(beanG * 2 * 10) / 10; // 뜸들이기: 원두 2배
  const remaining = Math.round((totalWater - bloom) * 10) / 10;
  let cumulative  = 0;

  const steps = dist.map((item, i) => {
    const base = baseSteps[i] || { time: '—' };
    let waterMl = null;
    let detail  = '';

    if (item.bloom) {
      waterMl    = bloom;
      cumulative = bloom;
      detail     = `${waterMl}ml 물을 붓고 30초 뜸들입니다 (원두 2배)`;
    } else if (item.remFrac) {
      waterMl     = Math.round(remaining * item.remFrac * 10) / 10;
      cumulative  = Math.round((cumulative + waterMl) * 10) / 10;
      detail      = `${waterMl}ml 붓기 → 누적 ${cumulative}ml / ${totalWater}ml`;
    } else if (item.totalFrac) {
      waterMl    = Math.round(totalWater * item.totalFrac * 10) / 10;
      cumulative = waterMl;
      detail     = `${waterMl}ml 전량 붓기`;
    } else {
      detail = base.detail || '';
    }

    return { action: item.action, detail, time: base.time || '—', waterMl };
  });

  return { totalWater, ratioNum, steps };
}

function updateScaRecipe() {
  const process = currentCoffee ? detectProcess(currentCoffee.process) : 'washed';
  const roast   = currentCoffee
    ? detectRoast(currentCoffee.roast_level || currentCoffee.roast || 'medium')
    : 'medium';
  const matrix  = SCA_MATRIX[process]?.[roast]?.[currentMethod]
               || SCA_MATRIX['washed']['medium'][currentMethod];

  if (!matrix) return;

  document.getElementById('sca-temp').textContent  = matrix.temp;
  document.getElementById('sca-ratio').textContent = matrix.ratio;
  document.getElementById('sca-grind').textContent = matrix.grind;
  document.getElementById('sca-time').textContent  = matrix.time;

  // ── 물 계산 업데이트 ──
  const beanGEl = document.getElementById('beanGInput');
  const beanG   = beanGEl ? (parseFloat(beanGEl.value) || recipeState.beanG) : recipeState.beanG;

  const waterResult       = calculateWaterSteps(beanG, currentMethod, matrix.ratio);
  recipeState.beanG       = beanG;
  recipeState.method      = currentMethod;
  recipeState.ratio       = matrix.ratio;
  recipeState.ratioNum    = waterResult.ratioNum;
  recipeState.totalWater  = waterResult.totalWater;
  recipeState.steps       = waterResult.steps;

  const waterEl = document.getElementById('sca-total-water');
  if (waterEl) waterEl.textContent = waterResult.totalWater;

  // ── 분쇄도 클릭 수 가이드 ──
  const guide = GRIND_GUIDE[currentMethod];
  if (guide) {
    const tipGrind  = document.getElementById('tip-grind');
    const tipClicks = document.getElementById('tip-clicks');
    if (tipGrind)  tipGrind.textContent  = `${matrix.grind} · ${guide.size}`;
    if (tipClicks) tipClicks.textContent = `${guide.clicks} (Comandante 기준) — ${guide.tip}`;
  }

  // ── 로스팅 포인트 (원두 정보 있을 때) ──
  const roastEl = document.getElementById('roastPoint');
  if (roastEl && currentCoffee) {
    const roastInfo = ROAST_GUIDE[roast];
    if (roastInfo) {
      document.getElementById('roastBadge').textContent = roastInfo.label;
      document.getElementById('roastTemp').textContent  = roastInfo.point;
      document.getElementById('roastTip').textContent   = roastInfo.tip;
      roastEl.style.display = 'flex';
    }
  } else if (roastEl) {
    roastEl.style.display = 'none';
  }
}

function detectProcess(raw) {
  if (!raw) return 'washed';
  const r = raw.toLowerCase();
  if (r.includes('natural') || r.includes('내추럴')) return 'natural';
  if (r.includes('honey') || r.includes('허니')) return 'honey';
  return 'washed';
}

function detectRoast(raw) {
  if (!raw) return 'medium';
  const r = raw.toLowerCase();
  if (r.includes('light') || r.includes('라이트')) return 'light';
  if (r.includes('dark') || r.includes('다크')) return 'dark';
  return 'medium';
}

window.selectMethod = function (method, el) {
  currentMethod = method;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (el) {
    el.classList.add('active');
  } else {
    const btn = document.querySelector(`[data-method="${method}"]`);
    if (btn) btn.classList.add('active');
  }
  updateScaRecipe();
  renderRecipeList();
};

async function loadCommunityStats() {
  if (!currentCoffee) return;
  const dummy = [
    { method:'V60', pct:38 },
    { method:'에어로프레스', pct:22 },
    { method:'프렌치프레스', pct:15 },
    { method:'에스프레소', pct:12 },
    { method:'케멕스', pct:8 },
    { method:'기타', pct:5 },
  ];
  renderMethodChart(dummy);
  document.getElementById('methodStats').style.display = 'block';
}

function renderMethodChart(data) {
  const max = Math.max(...data.map(d => d.pct));
  document.getElementById('methodBarChart').innerHTML = data.map(d => `
    <div class="method-stat-row">
      <span class="method-label">${d.method}</span>
      <div class="method-bar-wrap">
        <div class="method-bar-fill" style="width:${(d.pct / max * 100)}%"></div>
      </div>
      <span class="method-pct">${d.pct}%</span>
    </div>
  `).join('');
}

function renderRecipeList() {
  const list = document.getElementById('recipeList');
  const label = document.getElementById('recipeListLabel');
  label.textContent = `${currentMethod} 레시피`;

  const recipes = getRecipesForMethod(currentMethod);
  list.innerHTML = '';

  if (recipes.length === 0) {
    list.innerHTML = `
      <div style="padding:32px 0; text-align:center">
        <div style="font-size:32px;opacity:0.3;margin-bottom:12px">📋</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:6px">아직 레시피가 없어요</div>
        <div style="font-size:12px;color:var(--text-sub)">첫 번째 레시피를 등록해보세요</div>
        <button class="btn-secondary" style="margin-top:16px" onclick="openAddRecipe()">+ 레시피 등록</button>
      </div>
    `;
  } else {
    recipes.forEach(r => { list.appendChild(buildRecipeCard(r)); });
  }

  // ── 나의 레시피 전체 섹션: 현재 탭과 무관하게 저장된 모든 사용자 레시피 표시 ──
  const shownIds = new Set(recipes.map(r => r.id));
  const allMine = getAllUserRecipes().filter(r => !shownIds.has(r.id));
  if (allMine.length > 0) {
    const divider = document.createElement('div');
    divider.innerHTML =
      '<div class="section-label" style="padding:18px 0 8px;">나의 레시피 전체</div>' +
      '<div class="section-divider"></div>';
    list.appendChild(divider);
    allMine.forEach(r => { list.appendChild(buildRecipeCard(r)); });
  }
}

function getAllUserRecipes() {
  try {
    return JSON.parse(localStorage.getItem('coffee_note_recipes') || '[]');
  } catch { return []; }
}

function getRecipesForMethod(method) {
  const saved = JSON.parse(localStorage.getItem('coffee_note_recipes') || '[]')
    .filter(r => r.dripper === method || r.brew_method === method);

  const process   = currentCoffee ? detectProcess(currentCoffee.process) : 'washed';
  const roast     = currentCoffee
    ? detectRoast(currentCoffee.roast_level || currentCoffee.roast || 'medium')
    : 'medium';
  const scaMatrix = SCA_MATRIX[process]?.[roast]?.[method]
                 || SCA_MATRIX['washed']['medium'][method]
                 || SCA_MATRIX['washed']['medium']['V60'];

  // 현재 beanG로 차수별 물 투입량 계산
  const waterResult = calculateWaterSteps(recipeState.beanG, method, scaMatrix.ratio);

  const scaDefault = {
    id: 'sca_default_' + method,
    name: `${method} 기본 레시피`,
    dripper: method,
    water_temp: scaMatrix.temp,
    ratio: scaMatrix.ratio,
    grind_size: scaMatrix.grind,
    total_time: scaMatrix.time,
    steps: waterResult.steps,     // ← 계산된 스텝 (waterMl 포함)
    is_expert: true,
    likes: 0,
    by: 'SCA Golden Cup',
    badge: 'expert',
  };

  return [scaDefault, ...saved];
}

function buildRecipeCard(recipe) {
  const div = document.createElement('div');
  div.className = 'recipe-card';
  div.id = `recipe-${recipe.id}`;
  if (selectedRecipeId === recipe.id) div.classList.add('selected');

  const badgeHtml = recipe.badge === 'expert'
    ? `<span class="recipe-badge expert">전문가</span>`
    : recipe.badge === 'popular'
    ? `<span class="recipe-badge popular">인기</span>`
    : `<span class="recipe-badge mine">나의 레시피</span>`;

  const steps = recipe.steps || [];
  const stepsHtml = steps.map((s, i) => `
    <div class="step-row">
      <div class="step-num">${i + 1}</div>
      <div class="step-content">
        <div class="step-action">${s.action}</div>
        <div class="step-detail">${s.detail}</div>
      </div>
      <div class="step-time">${s.time}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <div class="recipe-card-header" onclick="toggleRecipe('${recipe.id}', ${JSON.stringify(recipe).replace(/"/g, '&quot;')})">
      <div class="recipe-icon">${recipe.is_expert ? '⭐' : '📋'}</div>
      <div class="recipe-meta">
        <div class="recipe-name">${recipe.name}</div>
        <div class="recipe-by">by ${recipe.by || recipe.user_nickname || '커뮤니티'}</div>
      </div>
      <div class="recipe-right">
        ${badgeHtml}
        ${recipe.likes ? `<span class="recipe-likes">♥ ${recipe.likes}</span>` : ''}
      </div>
    </div>
    <div class="recipe-params">
      ${recipe.water_temp ? `<div class="param-cell"><div class="param-key">온도</div><div class="param-val">${recipe.water_temp}</div></div>` : ''}
      ${recipe.ratio ? `<div class="param-cell"><div class="param-key">비율</div><div class="param-val">${recipe.ratio}</div></div>` : ''}
      ${recipe.grind_size ? `<div class="param-cell"><div class="param-key">분쇄도</div><div class="param-val">${recipe.grind_size}</div></div>` : ''}
      ${recipe.total_time ? `<div class="param-cell"><div class="param-key">시간</div><div class="param-val">${recipe.total_time}</div></div>` : ''}
    </div>
    <div class="recipe-steps" id="steps-${recipe.id}">
      ${stepsHtml}
      <div style="padding:12px 16px; display:flex; gap:8px">
        <button class="btn-secondary" style="flex:1;height:40px;font-size:12px" onclick="event.stopPropagation();selectThisRecipe('${recipe.id}')">이 레시피 선택</button>
        ${!recipe.is_expert ? `<button class="btn-secondary" style="height:40px;padding:0 12px;font-size:12px;color:var(--text-sub)" onclick="event.stopPropagation();likeRecipe('${recipe.id}', this)">♡</button>` : ''}
      </div>
    </div>
  `;

  return div;
}

window.toggleRecipe = function (id, recipe) {
  const stepsEl = document.getElementById(`steps-${id}`);
  if (!stepsEl) return;
  const isOpen = stepsEl.classList.contains('open');
  document.querySelectorAll('.recipe-steps.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) {
    stepsEl.classList.add('open');
    selectedRecipeId = id;
    selectedRecipe = recipe;
    document.getElementById(`recipe-${id}`).classList.add('selected');
  } else {
    selectedRecipeId = null; selectedRecipe = null;
    document.querySelectorAll('.recipe-card.selected').forEach(el => el.classList.remove('selected'));
  }
};

window.selectThisRecipe = function (id) {
  selectedRecipeId = id;
  document.querySelectorAll('.recipe-card').forEach(el => el.classList.remove('selected'));
  document.getElementById(`recipe-${id}`)?.classList.add('selected');
  toast('레시피를 선택했습니다');
  sessionStorage.setItem('selected_recipe_id', id);
};

window.likeRecipe = function (id, btn) {
  const recipes = JSON.parse(localStorage.getItem('coffee_note_recipes') || '[]');
  const idx = recipes.findIndex(r => r.id === id);
  if (idx >= 0) {
    recipes[idx].likes = (recipes[idx].likes || 0) + 1;
    localStorage.setItem('coffee_note_recipes', JSON.stringify(recipes));
    btn.textContent = `♥ ${recipes[idx].likes}`;
  }
};

window.changeGear = function (type) {
  const options = type === 'dripper'
    ? ['V60', '칼리타', '케멕스', '에어로프레스', '프렌치프레스', '에스프레소', '클레버', '모카포트']
    : ['핸드밀', '전동밀', '코만단테', '바라짜', '기타'];

  const val = prompt(`${type === 'dripper' ? '드리퍼' : '그라인더'}를 선택하세요:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);
  if (!val) return;
  const idx = parseInt(val) - 1;
  if (idx >= 0 && idx < options.length) {
    myGear[type] = options[idx];
    localStorage.setItem('coffee_note_gear', JSON.stringify(myGear));
    document.getElementById(`gear${type.charAt(0).toUpperCase() + type.slice(1)}`).textContent = options[idx];
    if (type === 'dripper') window.selectMethod(options[idx]);
    toast(`${type === 'dripper' ? '드리퍼' : '그라인더'}를 변경했습니다`);
  }
};

// ── 원두 용량 입력 핸들러 (실시간 계산) ──
window.onBeanGChange = function (val) {
  const beanG = parseFloat(val);
  if (isNaN(beanG) || beanG < 1) return;
  recipeState.beanG = beanG;
  updateScaRecipe();    // 총 물량 + 분쇄 가이드 갱신
  renderRecipeList();   // SCA 기본 레시피 스텝 재렌더
};

window.openAddRecipe = function () {
  const params = new URLSearchParams(location.search);
  location.href = `recipe-register.html?coffeeId=${params.get('coffeeId') || ''}&method=${currentMethod}`;
};

window.goSearch = function () { history.back(); };

window.goTasting = function () {
  const params = new URLSearchParams(location.search);
  const coffeeId = params.get('coffeeId') || '0';
  if (selectedRecipe) {
    sessionStorage.setItem('tasting_recipe', JSON.stringify(selectedRecipe));
  }
  location.href = `tasting.html?coffeeId=${coffeeId}`;
};
