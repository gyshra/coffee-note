/**
 * src/pages/brew.js
 * brew.html — 5단계 추출 흐름 통합 페이지
 *
 * Step 1: 원두 선택
 * Step 2: 예상 맛 입력 (FlavorInput, mode='expected')
 * Step 3: 레시피 설정 + 타이머 (RecipeEditor)
 * Step 4: 실제 맛 입력 (FlavorInput, mode='actual')
 * Step 5: 예상 vs 실제 비교 (ComparisonView)
 */

import { FlavorInput }    from '../modules/flavor-input.js';
import { RecipeEditor }   from '../modules/recipe-editor.js';
import { ComparisonView } from '../modules/comparison-view.js';
import { esc }            from '../modules/utils.js';

const CN      = window.CoffeeNote;
const content = document.getElementById('brewContent');
const btnArea = document.getElementById('brewBtnArea');
const stepper = document.getElementById('brewStepper');

const STEP_LABELS = ['원두 선택', '예상 맛', '레시피', '실제 맛', '비교'];

// ── 세션 상태 ─────────────────────────────────────────────
const state = {
  step:           1,
  coffeeIndex:    null,
  coffee:         null,
  brewCount:      0,
  prevAvgScores:  null,
  prevFlavors:    [],
  expectedData:   null,
  recipe:         null,
  actualData:     null,
  brewDone:       false,
};

// ── URL 파라미터 처리 ──────────────────────────────────────
(function initFromParams() {
  const params = new URLSearchParams(location.search);
  const coffeeId = params.get('coffeeId');
  if (coffeeId != null) {
    const idx = parseInt(coffeeId, 10);
    const coffees = CN.getCoffees();
    if (!isNaN(idx) && coffees[idx]) {
      _selectCoffee(idx, coffees[idx]);
      goToStep(3); // 다시내리기: 바로 레시피 단계로
      return;
    }
  }
  goToStep(1);
})();

// ── 스텝 공통 진입 ─────────────────────────────────────────
function goToStep(n) {
  state.step = n;
  _renderStepper(n);
  content.innerHTML = '';
  btnArea.innerHTML = '';
  btnArea.style.display = 'none';

  if (n === 1) renderStep1();
  else if (n === 2) renderStep2();
  else if (n === 3) renderStep3();
  else if (n === 4) renderStep4();
  else if (n === 5) renderStep5();

  window.scrollTo(0, 0);
}

// ── 스텝 인디케이터 ───────────────────────────────────────
function _renderStepper(active) {
  stepper.innerHTML = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const cls = n < active ? 'done' : n === active ? 'active' : '';
    return `<div class="brew-step-item ${cls}">
      <div class="brew-step-dot">${n < active ? '✓' : n}</div>
      <div class="brew-step-label">${label}</div>
    </div>`;
  }).join('');
}

// ── Step 1: 원두 선택 ─────────────────────────────────────
function renderStep1() {
  const coffees = CN.getCoffees();
  const records = CN.getTastingRecords();

  content.innerHTML = `
    <div class="brew-step-title">원두 선택</div>
    <div class="brew-step-sub">어떤 원두로 내릴까요?</div>
    <div id="beanList"></div>
  `;

  const list = document.getElementById('beanList');

  if (!coffees.length) {
    list.innerHTML = `<div class="empty-bean">등록된 원두가 없습니다.<br>아래에서 새 원두를 등록해보세요.</div>`;
  } else {
    coffees.forEach((coffee, idx) => {
      const brews = records.filter(r => r.coffeeIndex === idx).length;
      const el = document.createElement('div');
      el.className = 'bean-item';
      el.dataset.idx = idx;
      el.innerHTML = `
        <div>
          <div class="bean-name">${esc(coffee.name)}</div>
          <div class="bean-meta">${[coffee.roaster, coffee.country, coffee.processCategory].filter(Boolean).join(' · ')}</div>
        </div>
        ${brews ? `<div class="bean-brew-count">${brews}회 추출</div>` : ''}
      `;
      el.addEventListener('click', () => {
        _selectCoffee(idx, coffee);
        _updateStep1Selection(idx);
        _showStep1Btn();
      });
      list.appendChild(el);
    });
  }

  // "새 원두 등록" 버튼
  btnArea.innerHTML = `
    <button class="btn-secondary" onclick="location.href='bean-register.html'">+ 새 원두 등록</button>
  `;
  btnArea.style.display = '';
}

function _updateStep1Selection(idx) {
  document.querySelectorAll('.bean-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
  });
}

function _showStep1Btn() {
  btnArea.innerHTML = `
    <button class="btn-primary" id="step1Next">이 원두로 내리기 →</button>
    <button class="btn-secondary" onclick="location.href='bean-register.html'">+ 새 원두 등록</button>
  `;
  document.getElementById('step1Next').addEventListener('click', () => goToStep(2));
}

function _selectCoffee(idx, coffee) {
  state.coffeeIndex = idx;
  state.coffee = coffee;

  const records = CN.getTastingRecords().filter(r => r.coffeeIndex === idx);
  state.brewCount = records.length;

  // 이전 평균 스코어
  if (records.length >= 2) {
    const axes = ['acidity', 'bitterness', 'sweetness', 'body', 'finish'];
    const avg = {};
    axes.forEach(k => {
      const vals = records.map(r => r.baseScores?.[k]).filter(v => v != null);
      avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 5;
    });
    state.prevAvgScores = avg;
  } else {
    state.prevAvgScores = null;
  }

  // 이전 향미 (빈도 상위 3개)
  if (records.length >= 3) {
    const freq = {};
    records.forEach(r => {
      (r.flavorSelections || r.tasteTags || []).forEach(f => {
        const key = typeof f === 'string' ? f : f.ko;
        freq[key] = (freq[key] || 0) + 1;
      });
    });
    state.prevFlavors = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  } else {
    state.prevFlavors = [];
  }
}

// ── Step 2: 예상 맛 ───────────────────────────────────────
function renderStep2() {
  content.innerHTML = `
    <div class="brew-step-title">예상 맛</div>
    <div class="brew-step-sub">${esc(state.coffee?.name || '')}<br>어떤 맛일 것 같나요?</div>
    <div id="fiContainer"></div>
  `;

  const fi = new FlavorInput({
    container:     document.getElementById('fiContainer'),
    brewCount:     state.brewCount,
    prevAvgScores: state.prevAvgScores,
    prevFlavors:   state.prevFlavors,
    mode:          'expected',
    onSave(data) {
      state.expectedData = data;
      goToStep(3);
    },
  });
  fi.init();

  // 단, "건너뛰기" 링크 제공
  btnArea.innerHTML = `
    <button class="btn-secondary" id="step2Skip">예상 맛 건너뛰기 →</button>
  `;
  btnArea.style.display = '';
  document.getElementById('step2Skip').addEventListener('click', () => {
    state.expectedData = null;
    goToStep(3);
  });
}

// ── Step 3: 레시피 + 타이머 ───────────────────────────────
function renderStep3() {
  content.innerHTML = `
    <div class="brew-step-title">레시피 & 타이머</div>
    <div class="brew-step-sub">${esc(state.coffee?.name || '')}</div>
    <div id="recipeContainer"></div>
  `;

  state.brewDone = false;

  const editor = new RecipeEditor({
    container:    document.getElementById('recipeContainer'),
    coffee:       state.coffee || {},
    prevRecipe:   state.recipe || null,
    method:       state.recipe?.method || 'V60',
    beanG:        state.recipe?.beanG  || 15,
    onSave(recipe) {
      state.recipe = recipe;
      if (state.brewDone) {
        // 타이머 종료 후 "테이스팅 노트 작성하기" 클릭 시
        goToStep(4);
      }
    },
    onBrewFinish(result) {
      state.brewDone = true;
      state.recipe = { ...(state.recipe || {}), ...result };
    },
  });
  editor.init();

  // 타이머 없이 바로 테이스팅으로 넘어갈 수 있는 보조 버튼
  btnArea.innerHTML = `
    <button class="btn-secondary" id="step3Skip">타이머 없이 테이스팅 →</button>
  `;
  btnArea.style.display = '';
  document.getElementById('step3Skip').addEventListener('click', () => {
    state.recipe = editor.getCurrentRecipe();
    goToStep(4);
  });
}

// ── Step 4: 실제 맛 ───────────────────────────────────────
function renderStep4() {
  content.innerHTML = `
    <div class="brew-step-title">실제 맛</div>
    <div class="brew-step-sub">추출된 커피는 어떤 맛인가요?</div>
    <div id="fiActualContainer"></div>
  `;

  const fi = new FlavorInput({
    container:     document.getElementById('fiActualContainer'),
    brewCount:     state.brewCount,
    prevAvgScores: state.prevAvgScores,
    prevFlavors:   state.prevFlavors,
    mode:          'actual',
    onSave(data) {
      state.actualData = data;
      _saveTastingRecord();
      goToStep(5);
    },
  });
  fi.init();

  btnArea.innerHTML = '';
  btnArea.style.display = 'none';
}

// ── Step 5: 비교 ──────────────────────────────────────────
function renderStep5() {
  content.innerHTML = `
    <div class="brew-step-title">비교 결과</div>
    <div class="brew-step-sub">예상 vs 실제</div>
    <div id="compContainer"></div>
  `;

  const expected = state.expectedData?.baseScores || null;
  const actual   = state.actualData?.baseScores   || null;

  const cv = new ComparisonView({
    container:   document.getElementById('compContainer'),
    expected,
    actual,
    recipe:      state.recipe,
    coffee:      state.coffee,
    coffeeIndex: state.coffeeIndex,
    onRebrew() {
      goToStep(3);
    },
    onSaveNotes() {
      location.href = 'notes.html?highlight=latest';
    },
  });
  cv.init();

  btnArea.innerHTML = '';
  btnArea.style.display = 'none';
}

// ── 테이스팅 기록 저장 ────────────────────────────────────
function _saveTastingRecord() {
  if (!state.actualData) return;
  const data = state.actualData;
  const record = {
    coffeeIndex:      state.coffeeIndex,
    coffeeName:       state.coffee?.name || '',
    brewMethod:       state.recipe?.method || 'V60',
    baseScores:       data.baseScores || {},
    starRating:       data.starRating || 0,
    overall:          data.overall || 0,
    flavorSelections: data.flavors ? [...data.flavors] : [],
    defects:          data.defects ? [...data.defects] : [],
    memo:             data.memo || '',
    recipe:           state.recipe || null,
    expectedData:     state.expectedData || null,
    createdAt:        new Date().toISOString(),
  };
  CN.addTastingRecord(record);
  window.SupaDB?.saveTasting(record); // 로그인 상태면 Supabase에도 동기화
}

// ── 뒤로가기 ─────────────────────────────────────────────
document.getElementById('brewBack').addEventListener('click', () => {
  if (state.step <= 1) {
    history.length > 1 ? history.back() : (location.href = 'home.html');
  } else {
    goToStep(state.step - 1);
  }
});

