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

// ── 상태 ──
let currentCoffee = null;
let currentMethod = 'V60';
let selectedRecipeId = null;
let selectedRecipe = null;
let myGear = { dripper: 'V60', grinder: '핸드밀' };

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
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

function updateScaRecipe() {
  if (!currentCoffee) return;
  const process = detectProcess(currentCoffee.process);
  const roast = detectRoast(currentCoffee.roast_level || currentCoffee.roast || 'medium');
  const matrix = SCA_MATRIX[process]?.[roast]?.[currentMethod]
              || SCA_MATRIX['washed']['medium'][currentMethod];

  if (matrix) {
    document.getElementById('sca-temp').textContent = matrix.temp;
    document.getElementById('sca-ratio').textContent = matrix.ratio;
    document.getElementById('sca-grind').textContent = matrix.grind;
    document.getElementById('sca-time').textContent = matrix.time;
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
    return;
  }

  recipes.forEach(r => { list.appendChild(buildRecipeCard(r)); });
}

function getRecipesForMethod(method) {
  const saved = JSON.parse(localStorage.getItem('coffee_note_recipes') || '[]')
    .filter(r => r.dripper === method || r.brew_method === method);

  const scaMatrix = SCA_MATRIX['washed']['medium'][method] || SCA_MATRIX['washed']['medium']['V60'];
  const scaDefault = {
    id: 'sca_default_' + method,
    name: `${method} 기본 레시피`,
    dripper: method,
    water_temp: scaMatrix.temp,
    ratio: scaMatrix.ratio,
    grind_size: scaMatrix.grind,
    total_time: scaMatrix.time,
    steps: METHOD_STEPS[method] || getDefaultSteps(method),
    is_expert: true,
    likes: 0,
    by: 'SCA Golden Cup',
    badge: 'expert'
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
