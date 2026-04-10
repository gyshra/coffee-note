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
  const methodParam = params.get('method');

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

  // ?method= 파라미터로 추출법 칩 자동 선택 (note-detail 재추출 버튼 연동)
  if (methodParam) {
    selectMethod(methodParam);
  }

  renderRecipeList();

  // recipe-detail "▶ 브루하기" 클릭 시 전달되는 레시피 ID 자동 실행
  const pendingBrewId = sessionStorage.getItem('pending_brew_id');
  if (pendingBrewId) {
    sessionStorage.removeItem('pending_brew_id');
    setTimeout(() => {
      if ((window._brewStepsMap || {})[pendingBrewId]) {
        openBrewPanel(pendingBrewId);
      }
    }, 150);
  }
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

  let data = null;

  // 1순위: Supabase 전체 커뮤니티 통계 (설정된 경우)
  if (window.SupaDB) {
    data = await window.SupaDB.getMethodStats();
  }

  // 2순위: 내 로컬 테이스팅 기록 집계 (항상 실데이터)
  if (!data || !data.length) {
    try {
      const records = JSON.parse(localStorage.getItem('coffee_note_tasting_records') || '[]');
      const counts = {};
      records.forEach(r => { if (r.brewMethod) counts[r.brewMethod] = (counts[r.brewMethod] || 0) + 1; });
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      if (total > 0) {
        data = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([method, count]) => ({ method, pct: Math.round(count / total * 100) }));
      }
    } catch (e) {}
  }

  // 3순위: 더미 (데이터 없을 때만)
  if (!data || !data.length) {
    data = [
      { method:'V60', pct:38 }, { method:'에어로프레스', pct:22 },
      { method:'프렌치프레스', pct:15 }, { method:'에스프레소', pct:12 },
      { method:'케멕스', pct:8 }, { method:'기타', pct:5 },
    ];
  }

  renderMethodChart(data);
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
    .filter(r => r.dripper === method || r.brew_method === method || r.tool === method);

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
  window._brewStepsMap = window._brewStepsMap || {};
  window._brewStepsMap[recipe.id] = steps;
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
        <button class="btn-secondary" style="height:40px;padding:0 14px;font-size:13px;background:var(--text);color:var(--bg);border-color:var(--text)" onclick="event.stopPropagation();openBrewPanel('${recipe.id}')">▶</button>
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

// ═══════════════════════════════════════════════════════════════
// Phase 4 — Brew Timer
// ═══════════════════════════════════════════════════════════════

class BrewTimer {
  constructor(steps) {
    this.steps = steps;
    this._parseStepMs(steps);
    this.status = 'idle'; // idle | running | paused | finished
    this.stepIndex = 0;
    this.totalElapsedMs = 0;
    this.stepElapsedMs = 0;
    this._rafId = null;
    this._startWall = 0;
    this._startTotal = 0;
    this.onTick = null;
    this.onStepChange = null;
    this.onFinish = null;
  }

  _parseStepMs(steps) {
    const toMs = t => {
      if (!t || t === '—') return null;
      const parts = String(t).split(':');
      if (parts.length === 2) return (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
      return null;
    };
    this.cumulativeMs = steps.map(s => toMs(s.time));
    this.stepDurations = this.cumulativeMs.map((ms, i) => {
      if (ms === null) return 0;
      const prev = i > 0 ? (this.cumulativeMs[i - 1] || 0) : 0;
      return Math.max(0, ms - prev);
    });
    const valid = this.cumulativeMs.filter(ms => ms !== null);
    this.plannedTotalMs = valid.length > 0 ? Math.max(...valid) : 0;
  }

  get stepDuration() { return this.stepDurations[this.stepIndex] || 0; }

  get stepRemainingMs() { return Math.max(0, this.stepDuration - this.stepElapsedMs); }

  get state() {
    return {
      status: this.status,
      stepIndex: this.stepIndex,
      totalElapsedMs: this.totalElapsedMs,
      stepElapsedMs: this.stepElapsedMs,
      stepRemainingMs: this.stepRemainingMs,
      stepDuration: this.stepDuration,
      plannedTotalMs: this.plannedTotalMs,
    };
  }

  start() {
    if (this.status !== 'idle') return;
    this.status = 'running';
    this._startWall = performance.now();
    this._startTotal = 0;
    this._tick();
  }

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    cancelAnimationFrame(this._rafId);
    if (this.onTick) this.onTick(this.state);
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this._startWall = performance.now();
    this._startTotal = this.totalElapsedMs;
    this._tick();
  }

  forceNextStep() {
    if (this.status === 'idle') {
      this.status = 'running';
      this._startWall = performance.now();
      this._startTotal = 0;
    }
    cancelAnimationFrame(this._rafId);
    this._advance();
  }

  reset() {
    cancelAnimationFrame(this._rafId);
    this.status = 'idle';
    this.stepIndex = 0;
    this.totalElapsedMs = 0;
    this.stepElapsedMs = 0;
  }

  _tick() {
    this._rafId = requestAnimationFrame(() => {
      if (this.status !== 'running') return;
      const now = performance.now();
      this.totalElapsedMs = this._startTotal + (now - this._startWall);
      const stepStart = this.stepIndex > 0 ? (this.cumulativeMs[this.stepIndex - 1] || 0) : 0;
      this.stepElapsedMs = this.totalElapsedMs - stepStart;

      const dur = this.stepDuration;
      if (dur > 0 && this.stepElapsedMs >= dur) {
        this._advance();
        return;
      }

      if (this.onTick) this.onTick(this.state);
      this._tick();
    });
  }

  _advance() {
    const next = this.stepIndex + 1;
    if (next >= this.steps.length) {
      this.status = 'finished';
      if (this.onTick) this.onTick(this.state);
      if (this.onFinish) this.onFinish(this.totalElapsedMs);
      return;
    }
    this.stepIndex = next;
    if (this.onStepChange) this.onStepChange(this.stepIndex);
    if (this.onTick) this.onTick(this.state);
    if (this.stepDuration === 0) { this._advance(); return; }
    if (this.status === 'running') this._tick();
  }
}

// ─── VoiceSync ───────────────────────────────────────────────

class VoiceSync {
  constructor(options = {}) {
    this.onResult = options.onResult || null;
    this.onFallback = options.onFallback || null;
    this.timerGetter = options.timerGetter || null;
    this._recognition = null;
    this._captureTime = 0;
    this._active = false;
  }

  start() {
    const Recog = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recog) { if (this.onFallback) this.onFallback(); return; }

    this._recognition = new Recog();
    this._recognition.lang = 'ko-KR';
    this._recognition.continuous = false;
    this._recognition.interimResults = false;

    const startWall = performance.now();

    this._recognition.onstart = () => {
      this._captureTime = this.timerGetter ? this.timerGetter() : 0;
      this._active = true;
    };

    this._recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      const waterMl = this._parseNumber(transcript);
      const latency = performance.now() - startWall;
      if (waterMl !== null && waterMl > 0) {
        const actualTime = Math.max(0, this._captureTime - latency);
        if (this.onResult) this.onResult(waterMl, this._captureTime, latency, actualTime);
      } else {
        if (this.onFallback) this.onFallback();
      }
      this._active = false;
    };

    this._recognition.onerror = () => { if (this.onFallback) this.onFallback(); this._active = false; };
    this._recognition.onend = () => { this._active = false; };

    try { this._recognition.start(); } catch { if (this.onFallback) this.onFallback(); }
  }

  stop() {
    if (this._recognition) { try { this._recognition.abort(); } catch {} }
    this._active = false;
  }

  get isActive() { return this._active; }

  _parseNumber(text) {
    const numMatch = text.match(/(\d+(\.\d+)?)/);
    if (numMatch) return parseFloat(numMatch[1]);

    const korMap = { '영':0,'일':1,'이':2,'삼':3,'사':4,'오':5,'육':6,'칠':7,'팔':8,'구':9,'십':10,'백':100 };
    let result = 0; let current = 0;
    for (const ch of text) {
      const n = korMap[ch];
      if (n === undefined) continue;
      if (n === 100) { result += (current || 1) * 100; current = 0; }
      else if (n === 10) { result += (current || 1) * 10; current = 0; }
      else { current = n; }
    }
    result += current;
    return result > 0 ? result : null;
  }
}

// ─── 브루 패널 상태 ──────────────────────────────────────────

let _brewTimer = null;
let _voiceSync = null;
let _auditLog = [];
let _currentBrewSteps = [];
let _lastBrewElapsedMs = 0;
let _currentRecipeId = null;
let _wakeLock = null;

// Page Visibility: 화면이 다시 보이면 타이머 드리프트 보정
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && _brewTimer && _brewTimer.status === 'running') {
    // _startWall을 현재 시각으로 재설정하여 숨겨진 동안의 elapsed를 흡수
    const now = performance.now();
    _brewTimer._startTotal = _brewTimer.totalElapsedMs;
    _brewTimer._startWall = now;
  }
  // Wake Lock이 해제됐으면 재획득 시도
  if (document.visibilityState === 'visible' && _wakeLock === null && _brewTimer && _brewTimer.status === 'running') {
    _acquireWakeLock();
  }
});

async function _acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', function () { _wakeLock = null; });
  } catch (e) { /* 권한 거부 등 무시 */ }
}

function _releaseWakeLock() {
  if (_wakeLock) { _wakeLock.release(); _wakeLock = null; }
}

// ─── 패널 열기/닫기 ─────────────────────────────────────────

window.openBrewPanel = function (recipeId) {
  const steps = (window._brewStepsMap || {})[recipeId];
  if (!steps || steps.length === 0) { toast('스텝 정보가 없습니다'); return; }

  _currentBrewSteps = steps;
  _auditLog = [];
  _currentRecipeId = recipeId;
  _lastBrewElapsedMs = 0;

  const nameEl = document.querySelector(`#recipe-${recipeId} .recipe-name`);
  const label = nameEl ? nameEl.textContent : currentMethod;

  _brewTimer = new BrewTimer(steps);
  _brewTimer.onTick = _onBrewTick;
  _brewTimer.onStepChange = _onBrewStepChange;
  _brewTimer.onFinish = _onBrewFinish;

  _voiceSync = new VoiceSync({
    timerGetter: () => _brewTimer ? _brewTimer.totalElapsedMs : 0,
    onResult: (waterMl, captureTime, latency, actualTime) => {
      _recordAudit(waterMl, captureTime, latency, actualTime, 'voice');
      _closeManualSheet();
      _updateVoiceBtn(false);
    },
    onFallback: () => { openManualInput(); _updateVoiceBtn(false); },
  });

  const panel = document.getElementById('brewPanel');
  const timerView = document.getElementById('timerView');
  const reportView = document.getElementById('reportView');

  reportView.classList.remove('open');
  timerView.style.display = 'flex';
  timerView.style.opacity = '1';
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';
  _acquireWakeLock();

  document.getElementById('brewMethodLabel').textContent = label;
  document.getElementById('brewTotalClock').textContent = '0:00';
  document.getElementById('brewStepClock').textContent = '0:00';
  document.getElementById('brewProgressFill').style.width = '0%';

  _renderBrewStep(0);
  _updatePlayBtn(false);
};

window.closeBrewPanel = function () {
  if (_brewTimer) { _brewTimer.reset(); _brewTimer = null; }
  if (_voiceSync) { _voiceSync.stop(); _voiceSync = null; }
  _releaseWakeLock();
  document.getElementById('brewPanel').classList.remove('open');
  document.getElementById('reportView').classList.remove('open');
  document.body.style.overflow = '';
  _closeManualSheet();
};

// ─── 컨트롤 ────────────────────────────────────────────────

window.toggleBrewPlay = function () {
  if (!_brewTimer) return;
  if (_brewTimer.status === 'idle') {
    _brewTimer.start(); _updatePlayBtn(true);
  } else if (_brewTimer.status === 'running') {
    _brewTimer.pause(); _updatePlayBtn(false);
  } else if (_brewTimer.status === 'paused') {
    _brewTimer.resume(); _updatePlayBtn(true);
  }
};

window.triggerVoice = function () {
  if (!_voiceSync) return;
  if (_voiceSync.isActive) { _voiceSync.stop(); _updateVoiceBtn(false); return; }
  const step = _currentBrewSteps[_brewTimer ? _brewTimer.stepIndex : 0];
  if (!step || step.waterMl === null) { toast('이 스텝은 물 입력이 없습니다'); return; }
  _updateVoiceBtn(true);
  _voiceSync.start();
  setTimeout(() => _updateVoiceBtn(false), 6000);
};

window.skipStep = function () {
  if (!_brewTimer) return;
  const idx = _brewTimer.stepIndex;
  _recordAudit(null, _brewTimer.totalElapsedMs, 0, _brewTimer.totalElapsedMs, 'skipped');
  _brewTimer.forceNextStep();
  _updatePlayBtn(_brewTimer.status === 'running');
};

window.openManualInput = function () {
  const sheet = document.getElementById('brewManualSheet');
  if (!sheet) return;
  sheet.classList.add('open');
  document.getElementById('manualWaterInput').value = '';
  setTimeout(() => document.getElementById('manualWaterInput').focus(), 350);
};

function _closeManualSheet() {
  document.getElementById('brewManualSheet')?.classList.remove('open');
}

window.submitManualWater = function () {
  const val = parseFloat(document.getElementById('manualWaterInput').value);
  if (isNaN(val) || val <= 0) { toast('올바른 값을 입력하세요'); return; }
  const now = _brewTimer ? _brewTimer.totalElapsedMs : 0;
  _recordAudit(val, now, 0, now, 'manual');
  _closeManualSheet();
};

// ─── 감사 로그 ──────────────────────────────────────────────

function _recordAudit(actualWaterMl, captureTimeMs, latencyMs, actualTimeMs, method) {
  const idx = _brewTimer ? _brewTimer.stepIndex : 0;
  const step = _currentBrewSteps[idx];
  _auditLog[idx] = {
    stepIndex: idx,
    action: step ? step.action : '',
    expectedWaterMl: step ? step.waterMl : null,
    actualWaterMl,
    captureTimeMs,
    latencyMs,
    actualTimeMs,
    inputMethod: method,
  };
}

// ─── 타이머 콜백 ────────────────────────────────────────────

function _onBrewTick(state) {
  document.getElementById('brewTotalClock').textContent = _fmtMs(state.totalElapsedMs);
  document.getElementById('brewStepClock').textContent = _fmtMs(state.stepRemainingMs);
  const pct = state.stepDuration > 0
    ? Math.min(100, (state.stepElapsedMs / state.stepDuration) * 100)
    : 0;
  document.getElementById('brewProgressFill').style.width = pct + '%';
}

function _onBrewStepChange(idx) { _renderBrewStep(idx); }

function _onBrewFinish(totalElapsedMs) {
  _lastBrewElapsedMs = totalElapsedMs;
  _updatePlayBtn(false);
  const timerView = document.getElementById('timerView');
  timerView.style.transition = 'opacity 0.3s';
  timerView.style.opacity = '0';
  setTimeout(() => {
    timerView.style.display = 'none';
    timerView.style.opacity = '';
    timerView.style.transition = '';
    const reportView = document.getElementById('reportView');
    reportView.innerHTML = _buildReportHtml(totalElapsedMs);
    reportView.classList.add('open');
  }, 320);
}

function _goToTasting() {
  const coffeeId = new URLSearchParams(location.search).get('coffeeId');
  const plannedMs = _brewTimer ? _brewTimer.plannedTotalMs : 0;
  const brewResult = {
    method:         recipeState.method,
    beanG:          recipeState.beanG,
    totalWater:     recipeState.totalWater,
    ratio:          recipeState.ratio,
    steps:          recipeState.steps,
    totalElapsedMs: _lastBrewElapsedMs,
    plannedTotalMs: plannedMs,
    auditLog:       _auditLog.slice(),
    coffeeId:       coffeeId,
    recipeId:       _currentRecipeId,
  };
  sessionStorage.setItem('brew_result', JSON.stringify(brewResult));
  location.href = coffeeId
    ? `tasting.html?coffeeId=${coffeeId}&from=brew`
    : 'tasting.html?from=brew';
}
window._goToTasting = _goToTasting;

// ─── 스텝 렌더 ──────────────────────────────────────────────

function _renderBrewStep(idx) {
  const steps = _currentBrewSteps;
  const step = steps[idx];
  if (!step) return;

  const els = ['brewStepName', 'brewStepDetail', 'brewStepNum', 'brewWaterBadge']
    .map(id => document.getElementById(id));

  els.forEach(el => {
    if (!el) return;
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
  });

  setTimeout(() => {
    document.getElementById('brewStepNum').textContent = `STEP ${idx + 1} / ${steps.length}`;
    document.getElementById('brewStepName').textContent = step.action;
    document.getElementById('brewStepDetail').textContent = step.detail;

    const waterEl = document.getElementById('brewWaterBadge');
    if (step.waterMl !== null && step.waterMl !== undefined) {
      waterEl.textContent = `${step.waterMl} ml`;
      waterEl.style.display = 'block';
    } else {
      waterEl.style.display = 'none';
    }

    const nextHint = document.getElementById('brewNextHint');
    const next = steps[idx + 1];
    if (next) {
      nextHint.style.display = 'block';
      document.getElementById('brewNextName').textContent = next.action;
    } else {
      nextHint.style.display = 'none';
    }

    if (_brewTimer) {
      document.getElementById('brewStepClock').textContent =
        _fmtMs(_brewTimer.stepDurations[idx] || 0);
    }

    els.forEach(el => {
      if (!el) return;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, 220);

  _renderDots(idx, steps.length);
}

function _renderDots(current, total) {
  const el = document.getElementById('brewStepDots');
  if (!el) return;
  el.innerHTML = Array.from({ length: total }, (_, i) => {
    const cls = i < current ? 'brew-dot done' : i === current ? 'brew-dot active' : 'brew-dot';
    return `<div class="${cls}"></div>`;
  }).join('');
}

function _updatePlayBtn(playing) {
  const icon = document.getElementById('playIcon');
  if (!icon) return;
  icon.innerHTML = playing
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<polygon points="5,3 19,12 5,21"/>';
}

function _updateVoiceBtn(active) {
  const btn = document.getElementById('voiceBtn');
  if (!btn) return;
  btn.style.borderColor = active ? '#c8a06e' : 'rgba(240,237,232,0.15)';
  btn.style.color = active ? '#c8a06e' : 'rgba(240,237,232,0.6)';
}

function _fmtMs(ms) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── 리포트 ─────────────────────────────────────────────────

function _buildReportHtml(totalElapsedMs) {
  const steps = _currentBrewSteps;
  const plannedMs = _brewTimer ? _brewTimer.plannedTotalMs : 0;
  const timeVar = plannedMs > 0
    ? Math.round(Math.abs(totalElapsedMs - plannedMs) / plannedMs * 100)
    : 0;
  const timeOk = timeVar <= 10;
  const methodLabel = document.getElementById('brewMethodLabel')?.textContent || '';

  const stepRows = steps.map((step, i) => {
    const rec = _auditLog[i];
    let varHtml = '<span class="report-step-variance" style="color:rgba(240,237,232,0.3)">—</span>';
    if (rec && rec.inputMethod === 'skipped') {
      varHtml = '<span class="report-step-variance" style="color:rgba(240,237,232,0.3)">건너뜀</span>';
    } else if (rec && step.waterMl !== null && rec.actualWaterMl !== null) {
      const v = Math.round(Math.abs(rec.actualWaterMl - step.waterMl) / step.waterMl * 100);
      const dir = rec.actualWaterMl > step.waterMl ? '+' : '-';
      const cls = v <= 10 ? 'ok' : 'warn';
      varHtml = `<span class="report-step-variance ${cls}">${v > 0 ? dir : ''}${v}%</span>`;
    }
    const planNote = step.waterMl !== null
      ? `<span style="color:rgba(240,237,232,0.4);font-size:11px;font-weight:400"> ${step.waterMl}ml</span>`
      : '';
    return `
      <div class="report-step-row">
        <div class="report-step-num">${i + 1}</div>
        <div class="report-step-action">${step.action}${planNote}</div>
        ${varHtml}
      </div>`;
  }).join('');

  const insights = _generateInsights(steps, _auditLog, totalElapsedMs, plannedMs);
  const insightsHtml = insights.length
    ? `<div class="report-section-label">인사이트</div>
       ${insights.map(ins => `<div class="report-insight ${ins.severity}">${ins.message}</div>`).join('')}`
    : '';

  const svgChart = _buildSvgChart(steps, _auditLog);
  const chartHtml = svgChart
    ? `<div class="report-section-label">물 투입 차트</div><div class="report-chart-wrap">${svgChart}</div>`
    : '';

  return `
    <div class="report-header">
      <div class="report-title">Brew Report</div>
      <div class="report-subtitle">${methodLabel} · ${new Date().toLocaleDateString('ko-KR')}</div>
    </div>
    <div class="report-summary-row">
      <div class="report-summary-cell">
        <div class="report-summary-key">실제 시간</div>
        <div class="report-summary-val ${timeOk ? 'ok' : 'warn'}">${_fmtMs(totalElapsedMs)}</div>
      </div>
      <div class="report-summary-cell">
        <div class="report-summary-key">계획 시간</div>
        <div class="report-summary-val">${_fmtMs(plannedMs)}</div>
      </div>
      <div class="report-summary-cell">
        <div class="report-summary-key">시간 편차</div>
        <div class="report-summary-val ${timeOk ? 'ok' : 'warn'}">${timeVar}%</div>
      </div>
    </div>
    ${insightsHtml}
    <div class="report-section-label">스텝별 분석</div>
    ${stepRows}
    ${chartHtml}
    <div class="report-action-row">
      <button class="report-close-btn secondary" onclick="closeBrewPanel()">닫기</button>
      <button class="report-close-btn primary" onclick="window._goToTasting()">테이스팅 노트 작성 →</button>
    </div>
  `;
}

function _generateInsights(steps, auditLog, totalMs, plannedMs) {
  const out = [];
  const timeDiff = totalMs - plannedMs;
  const timeVar = plannedMs > 0 ? Math.round(Math.abs(timeDiff) / plannedMs * 100) : 0;
  const timeOver = timeVar > 10;
  const isLate = timeDiff > 0;

  steps.forEach((step, i) => {
    if (step.waterMl === null) return;
    const rec = auditLog[i];
    if (!rec || rec.actualWaterMl === null) return;
    const waterDiff = rec.actualWaterMl - step.waterMl;
    const waterVar = Math.round(Math.abs(waterDiff) / step.waterMl * 100);
    const waterOver = waterVar > 10;
    const isMore = waterDiff > 0;

    if (waterOver && timeOver) {
      out.push({
        message: `${step.action}: 물 ${isMore ? '과다' : '부족'} ${waterVar}% + 시간 ${isLate ? '초과' : '단축'} ${timeVar}%. `
          + `다음엔 물을 ${isMore ? '줄이고' : '늘리고'} 페이스를 ${isLate ? '높여보세요' : '조절해보세요'}.`,
        severity: 'warn',
      });
      return;
    }
    if (waterOver) {
      out.push({
        message: `${step.action}: 물 ${isMore ? '과다' : '부족'} ${waterVar}% (계획 ${step.waterMl}ml → 실제 ${rec.actualWaterMl}ml)`,
        severity: 'warn',
      });
    }
  });

  if (timeOver && !out.some(o => o.message.includes('시간'))) {
    out.push({
      message: `총 시간 ${isLate ? '초과' : '단축'} ${timeVar}%. ${isLate ? '다음엔 붓는 속도를 높여보세요.' : '조금 더 천천히 진행해보세요.'}`,
      severity: timeVar > 20 ? 'warn' : 'good',
    });
  }

  if (out.length === 0) {
    out.push({ message: '훌륭한 추출입니다! 모든 스텝이 계획과 근접했습니다.', severity: 'good' });
  }
  return out;
}

function _buildSvgChart(steps, auditLog) {
  const indices = steps.reduce((acc, s, i) => { if (s.waterMl !== null) acc.push(i); return acc; }, []);
  if (indices.length === 0) return '';

  const barW = 28, gap = 18, maxH = 100, labelH = 20, padTop = 6, legendH = 20;
  const svgW = Math.max(280, indices.length * (barW * 2 + gap) + 40);
  const svgH = maxH + labelH + padTop + legendH;

  const maxWater = Math.max(...indices.map(i => {
    const rec = auditLog[i];
    return Math.max(steps[i].waterMl, rec && rec.actualWaterMl ? rec.actualWaterMl : 0);
  }));

  const bars = indices.map((si, xi) => {
    const step = steps[si];
    const rec = auditLog[si];
    const plan = step.waterMl;
    const actual = rec && rec.actualWaterMl !== null ? rec.actualWaterMl : null;
    const x = 20 + xi * (barW * 2 + gap);
    const planH = maxWater > 0 ? Math.round((plan / maxWater) * maxH) : 0;
    const actualH = actual !== null && maxWater > 0 ? Math.round((actual / maxWater) * maxH) : 0;
    const varPct = actual !== null ? Math.round(Math.abs(actual - plan) / plan * 100) : null;
    const aColor = varPct !== null && varPct > 10 ? '#f2994a' : '#6fcf97';

    return `
      <rect x="${x}" y="${padTop + maxH - planH}" width="${barW}" height="${planH}" fill="rgba(240,237,232,0.15)" rx="2"/>
      ${actual !== null ? `<rect x="${x + barW + 2}" y="${padTop + maxH - actualH}" width="${barW}" height="${actualH}" fill="${aColor}" rx="2" opacity="0.8"/>` : ''}
      <text x="${x + barW}" y="${padTop + maxH + 14}" text-anchor="middle" font-size="8" fill="rgba(240,237,232,0.4)">${step.action.slice(0, 4)}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="min-width:${Math.min(svgW, 280)}px;display:block">
      ${bars}
      <rect x="20" y="${svgH - 14}" width="8" height="8" fill="rgba(240,237,232,0.15)" rx="1"/>
      <text x="32" y="${svgH - 7}" font-size="9" fill="rgba(240,237,232,0.4)">계획</text>
      <rect x="64" y="${svgH - 14}" width="8" height="8" fill="#6fcf97" rx="1" opacity="0.8"/>
      <text x="76" y="${svgH - 7}" font-size="9" fill="rgba(240,237,232,0.4)">실제</text>
    </svg>
  `;
}
