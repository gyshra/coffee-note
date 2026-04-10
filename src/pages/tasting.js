/**
 * src/pages/tasting.js
 * tasting.html 인라인 스크립트 → ES Module
 *
 * 의존성:
 *   window.CoffeeNote   — common.js (동기 로드)
 *   window.CoffeeWheel  — tasting-wheel.js (동기 로드, DO NOT TOUCH)
 *   window.CoffeeRadar  — src/ui/radar.js (이 모듈보다 먼저 로드)
 *   window.CardGenerator — src/ui/card-generator.js
 */

import { esc } from '../modules/utils.js';

(function () {
  var CN = window.CoffeeNote;

  CN.renderBottomNav('notes');

  CoffeeNote._onCoffeeSelected = function (result) {
    initWithCoffee(result.coffee, result.index || -1);
  };

  var params = new URLSearchParams(location.search);
  var coffeeId = params.get("coffeeId");
  var idx = (coffeeId !== null && coffeeId !== "") ? Number(coffeeId) : NaN;
  var coffee = CN.getCoffeeByIndex(idx);

  var BREW = ["매장 음료","생략","V60","칼리타","케멕스","에어로프레스","프렌치프레스","에스프레소","콜드브루","모카포트","클레버"];
  var SHOP_BREW = ["모르겠음","핸드드립","에스프레소","콜드브루","사이폰","더치","기타"];
  var selectedShopBrew = "";
  var flavorIntensities = {}, flavorMemos = {}, baseMemos = {}, photos = [], starVal = 0, pentaChart = null;

  var editIdx = params.get("editIdx") != null ? Number(params.get("editIdx")) : NaN;
  var editRecord = Number.isInteger(editIdx) ? CN.getTastingRecords()[editIdx] : null;
  var isEditMode = !!editRecord;
  var currentFlavors = [];

  // 브루 타이머 완료 후 전달되는 추출 결과
  var brewResult = (function () {
    try {
      var raw = sessionStorage.getItem('brew_result');
      if (raw) {
        sessionStorage.removeItem('brew_result');
        return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  })();

  // 레시피 페이지에서 "이 레시피로 기록하기" 클릭 시 전달되는 Active Session 레시피
  // brew_result가 있으면 그것을 activeRecipe로 변환해 배너에 표시
  var activeRecipe = (function () {
    if (brewResult) {
      return {
        recipe_id: brewResult.recipeId || null,
        name:      brewResult.method,
        ratio:     brewResult.ratio,
        water:     String(brewResult.totalWater) + 'ml',
        dose:      String(brewResult.beanG) + 'g',
        steps:     brewResult.steps || [],
        _fromBrew: true,
      };
    }
    try {
      var raw = sessionStorage.getItem('tasting_recipe');
      if (raw) {
        var r = JSON.parse(raw);
        console.log('[Session:Debug] activeRecipe loaded:', r.name || r.id);
        return r;
      }
    } catch (e) { console.error('[Session:Debug] tasting_recipe parse error:', e); }
    return null;
  })();

  function initWithCoffee(c, i) {
    coffee = c; idx = i;
    document.getElementById("missingCoffee").style.display = "none";
    document.getElementById("tastingMain").style.display = "block";

    // Active Session 배너 표시
    if (activeRecipe) {
      var banner = document.getElementById("activeSessionBanner");
      var detail = document.getElementById("activeSessionDetail");
      if (banner && detail) {
        var parts = [];
        if (activeRecipe.name) parts.push(activeRecipe.name);
        if (activeRecipe.water_temp || activeRecipe.temp) parts.push('온도 ' + (activeRecipe.water_temp || activeRecipe.temp));
        if (activeRecipe.ratio) parts.push('비율 ' + activeRecipe.ratio);
        if (activeRecipe.grind_size || activeRecipe.grind) parts.push('분쇄도 ' + (activeRecipe.grind_size || activeRecipe.grind));
        detail.textContent = parts.join(' · ');
        banner.style.display = 'block';
      }
      var clearBtn = document.getElementById("btnClearSession");
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          activeRecipe = null;
          sessionStorage.removeItem('tasting_recipe');
          document.getElementById("activeSessionBanner").style.display = "none";
          console.log('[Session:Debug] activeRecipe cleared by user');
        });
      }
    }

    // 브루 리포트에서 넘어온 경우 — 추출 방식 자동 선택 + 편차 요약 메모 입력
    if (brewResult && !isEditMode) {
      // 추출 방식 칩 자동 선택
      if (brewResult.method) {
        var chips = document.querySelectorAll('#brewChips .chip');
        chips.forEach(function (chip) {
          if (chip.textContent.trim() === brewResult.method) {
            chips.forEach(function (c) { c.classList.remove('selected'); });
            chip.classList.add('selected');
          }
        });
      }
      // 편차 요약 메모 자동 입력
      var memoEl = document.getElementById('memo');
      if (memoEl && !memoEl.value) {
        memoEl.value = _buildDeviationSummary(brewResult);
      }
    }

    var summaryHtml =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div><p class="card-title">' + esc(c.name) + '</p><p class="caption" style="margin-top:8px">' + esc(c.roaster || "") + '</p></div>' +
        '<button type="button" class="btn-secondary" style="width:auto;padding:8px 14px;font-size:12px;flex-shrink:0" ' +
        'onclick="CoffeeNote.openGlobalSearch()">변경</button>' +
      '</div>';

    document.getElementById("coffeeSummary").innerHTML = summaryHtml;
    initTastingUI();
    if (isEditMode) prefillFromRecord(editRecord);
  }

  function initTastingUI() {
    CoffeeWheel.init({
      svgId: "wheelSvg", viewportId: "wheelViewport",
      onSelectionChange: function (flavors) {
        currentFlavors = flavors.slice();
        if (flavors.length > 0) { revealSection("step2"); revealSection("step3"); revealSection("step4"); }
        renderFlavorSliders(flavors);
      }
    });

    pentaChart = CoffeeRadar.createInteractive({
      svgId: "pentaSvg",
      aiScores: (function () { try { var ap = sessionStorage.getItem("ai_prediction"); if (ap) return JSON.parse(ap).scores; } catch (e) {} return null; })(),
      onChange: function (v) { renderBaseMemos(v); }
    });

    renderBaseMemos(pentaChart.getValues());
    renderStars();
    renderBrewChips();
  }

  function renderFlavorSliders(flavors) {
    var w = document.getElementById("flavorSliders");
    w.innerHTML = flavors.map(function (f) {
      var v = flavorIntensities[f.en] || 5;
      return '<div class="flavor-slider-group"><div class="flavor-slider-row">' +
        '<span class="fs-color" style="background:' + esc(f.color) + '"></span><span class="fs-name">' + esc(f.ko) + '</span>' +
        '<div class="fs-track"><input type="range" class="fs-input" min="1" max="10" value="' + v + '" data-en="' + esc(f.en) + '"></div>' +
        '<span class="fs-val" id="fv-' + esc(f.en) + '">' + v + '</span></div></div>';
    }).join("");

    w.querySelectorAll(".fs-input").forEach(inp => {
      inp.addEventListener("input", function () {
        var en = this.getAttribute("data-en");
        flavorIntensities[en] = Number(this.value);
        document.getElementById("fv-" + en).textContent = this.value;
      });
    });
  }

  function renderBaseMemos(values) {
    // 기본 감각 메모 영역 렌더링 (pentaChart 값 기반)
    var w = document.getElementById("baseSenseMemos");
    if (!w) return;
    var axes = ["아로마","산미","단맛","바디감","여운"];
    w.innerHTML = axes.map(function (ax) {
      var v = values[ax] || 5;
      return '<div class="base-sense-item"><span class="base-sense-label">' + ax + '</span>' +
        '<div class="base-sense-bar"><div class="base-sense-fill" style="width:' + (v * 10) + '%"></div></div>' +
        '<span class="base-sense-val">' + v + '</span></div>';
    }).join("");
  }

  function prefillFromRecord(record) {
    // 편집 모드: 기존 기록으로 UI 채우기
    if (!record) return;
    starVal = record.starRating || 0;
    renderStars();
    flavorIntensities = Object.assign({}, record.flavorIntensities || {});
    if (record.memo) {
      var memoEl = document.getElementById("memo");
      if (memoEl) memoEl.value = record.memo;
    }
    if (record.location) {
      var locEl = document.getElementById("locationInput");
      if (locEl) locEl.value = record.location;
    }
    if (record.baseScores && pentaChart) {
      pentaChart.setValues(record.baseScores);
    }
    // RC-3B: 저장된 향미 선택 복원 → currentFlavors 채우기 + 슬라이더 렌더링
    if (record.flavorSelections && record.flavorSelections.length > 0) {
      currentFlavors = record.flavorSelections.slice();
      console.log('[Session:Debug] prefill flavorSelections:', currentFlavors.length, 'items');
      renderFlavorSliders(currentFlavors);
      // selectedFlavors UI: 빈 메시지 숨기고 태그 표시
      var emptyMsg = document.getElementById("emptyFlavorsMsg");
      if (emptyMsg) emptyMsg.style.display = "none";
      var sfEl = document.getElementById("selectedFlavors");
      if (sfEl) {
        var tagsHtml = currentFlavors.map(function (f) {
          return '<span class="flavor-tag selected" style="background:' + esc(f.color) + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;margin:2px">' + esc(f.ko) + '</span>';
        }).join('');
        // emptyMsg 뒤에 태그 삽입 (emptyMsg는 이미 숨겨짐)
        sfEl.insertAdjacentHTML('beforeend', '<div id="prefillFlavors" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' + tagsHtml + '</div>');
      }
      revealSection("step2");
      revealSection("step3");
      revealSection("step4");
    }
  }

  function renderStars() {
    var w = document.getElementById("starRating");
    var h = "";
    for (var i = 1; i <= 5; i++) {
      h += '<span onclick="setStar(' + i + ')" style="cursor:pointer;font-size:24px;color:' + (starVal >= i ? '#8C7355' : '#E0E0E0') + '">★</span>';
    }
    w.innerHTML = h;
    document.getElementById("starLabel").textContent = starVal > 0 ? starVal + "점 선택됨" : "탭하여 별점을 선택하세요";
  }
  window.setStar = function (v) { starVal = v; renderStars(); };

  function renderBrewChips() {
    var bw = document.getElementById("brewChips");
    bw.innerHTML = BREW.map(m => '<button type="button" class="chip" onclick="selectBrew(this, \'' + m + '\')">' + m + '</button>').join("");
  }
  window.selectBrew = function (el, val) {
    document.querySelectorAll('#brewChips .chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  };

  function revealSection(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("revealed");
  }

  // 초기 실행 흐름
  if (isEditMode) {
    var editCoffee = CN.getCoffeeByIndex(editRecord.coffeeIndex);
    initWithCoffee(editCoffee || { name: editRecord.coffeeName }, editRecord.coffeeIndex);
  } else if (coffee) {
    initWithCoffee(coffee, idx);
  } else {
    setTimeout(() => CoffeeNote.openGlobalSearch(), 300);
  }

  document.getElementById("btnBack").addEventListener("click", function () { history.back(); });

  // 저장 버튼
  document.getElementById("btnSaveFinal").addEventListener("click", function () {
    if (!coffee) { CN.showToast("원두를 먼저 선택해주세요"); return; }

    var selectedBrew = (function () {
      var chip = document.querySelector('#brewChips .chip.selected');
      return chip ? chip.textContent.trim() : "";
    })();

    var baseScores = pentaChart ? pentaChart.getValues() : {};

    var flavors = currentFlavors.slice();

    var recipe = (function () {
      // activeRecipe(레시피 페이지에서 선택)가 있으면 우선 사용
      if (activeRecipe) {
        console.log('[Session:Debug] saving with activeRecipe id:', activeRecipe.recipe_id || activeRecipe.id);
        return {
          recipe_id: activeRecipe.recipe_id || activeRecipe.id || null,
          name: activeRecipe.name || activeRecipe.by || '',
          temp: activeRecipe.water_temp || activeRecipe.temp || '',
          water: activeRecipe.water || '',
          dose: activeRecipe.dose || '',
          grind: activeRecipe.grind_size || activeRecipe.grind || '',
          steps: activeRecipe.steps || []
        };
      }
      // 수동 입력 레시피 폼
      var area = document.getElementById("recipeArea");
      if (!area || area.style.display === "none") return null;
      var temp = (document.getElementById("recipeTemp") || {}).value || "";
      var water = (document.getElementById("recipeWater") || {}).value || "";
      var dose = (document.getElementById("recipeDose") || {}).value || "";
      var grind = (document.getElementById("recipeGrind") || {}).value || "";
      if (!temp && !water && !dose) return null;
      return { recipe_id: null, temp, water, dose, grind };
    })();

    // brew 플로우에서 온 경우 추출 정밀도 데이터 구조화 저장
    var brewMetrics = (function () {
      if (!brewResult || isEditMode) return undefined;
      var planned = brewResult.plannedTotalMs || 0;
      var actual  = brewResult.totalElapsedMs || 0;
      var timeVariancePct = planned > 0
        ? Math.round(Math.abs(actual - planned) / planned * 100) : null;
      var stepVariances = (brewResult.auditLog || [])
        .filter(function (r) { return r.expectedWaterMl && r.actualWaterMl != null; })
        .map(function (r) {
          return {
            action:      r.action,
            expected:    r.expectedWaterMl,
            actual:      r.actualWaterMl,
            variancePct: Math.round(Math.abs(r.actualWaterMl - r.expectedWaterMl) / r.expectedWaterMl * 100),
          };
        });
      return { totalElapsedMs: actual, plannedTotalMs: planned, timeVariancePct: timeVariancePct, stepVariances: stepVariances };
    })();

    var record = {
      coffeeIndex: idx,
      coffeeName: coffee.name || "",
      brewMethod: selectedBrew,
      baseScores: baseScores,
      flavorSelections: flavors,
      flavorIntensities: flavorIntensities,
      starRating: starVal,
      memo: (document.getElementById("memo") || {}).value || "",
      location: (document.getElementById("locationInput") || {}).value || "",
      recipe: recipe || undefined,
      brewMetrics: brewMetrics || undefined,
    };

    if (isEditMode) {
      // 기존 기록 id 유지, updatedAt 갱신
      record.id = editRecord.id;
      record.createdAt = editRecord.createdAt;
      record.updatedAt = new Date().toISOString();
      var list = CN.getTastingRecords();
      list.splice(editIdx, 1, record);
      localStorage.setItem('coffee_note_tasting_records', JSON.stringify(list));
    } else {
      CN.addTastingRecord(record);
    }

    // Active Session 정리 후 비교 화면으로 이동
    sessionStorage.removeItem('tasting_recipe');
    console.log('[Session:Debug] record saved, recipe_id:', record.recipe && record.recipe.recipe_id);
    sessionStorage.setItem('last_tasting', JSON.stringify(record));
    sessionStorage.setItem('tasting_coffee', JSON.stringify(coffee));
    location.href = 'compare.html?coffeeId=' + (idx >= 0 ? idx : '');
  });
})();

// ─── 브루 리포트 편차 요약 생성기 ─────────────────────────────
function _buildDeviationSummary(br) {
  var lines = [];
  var fmtMs = function (ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // 시간 편차
  if (br.plannedTotalMs > 0) {
    var timeDiff = Math.round((br.totalElapsedMs - br.plannedTotalMs) / 1000);
    var timeVar = Math.round(Math.abs(br.totalElapsedMs - br.plannedTotalMs) / br.plannedTotalMs * 100);
    if (timeVar > 5) {
      lines.push('[추출 시간] 계획 ' + fmtMs(br.plannedTotalMs) + ' → 실제 ' + fmtMs(br.totalElapsedMs)
        + ' (' + (timeDiff > 0 ? '+' : '') + timeDiff + '초, ' + timeVar + '%)');
    }
  }

  // 스텝별 물량 편차
  var steps = br.steps || [];
  var auditLog = br.auditLog || [];
  steps.forEach(function (step, i) {
    if (step.waterMl === null || step.waterMl === undefined) return;
    var rec = auditLog[i];
    if (!rec || rec.actualWaterMl === null || rec.actualWaterMl === undefined) return;
    var diff = Math.round(rec.actualWaterMl - step.waterMl);
    var pct = Math.round(Math.abs(diff) / step.waterMl * 100);
    if (pct > 10) {
      lines.push('[' + step.action + '] 계획 ' + step.waterMl + 'ml → 실제 ' + rec.actualWaterMl + 'ml ('
        + (diff > 0 ? '+' : '') + diff + 'ml, ' + pct + '%)');
    }
  });

  if (lines.length === 0) return '';
  return '=== 추출 편차 자동 기록 ===\n' + lines.join('\n');
}
