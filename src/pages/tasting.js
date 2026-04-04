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

  CN.renderBottomNav('');

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

  function initWithCoffee(c, i) {
    coffee = c; idx = i;
    document.getElementById("missingCoffee").style.display = "none";
    document.getElementById("tastingMain").style.display = "block";

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
      var area = document.getElementById("recipeArea");
      if (!area || area.style.display === "none") return null;
      var temp = (document.getElementById("recipeTemp") || {}).value || "";
      var water = (document.getElementById("recipeWater") || {}).value || "";
      var dose = (document.getElementById("recipeDose") || {}).value || "";
      var grind = (document.getElementById("recipeGrind") || {}).value || "";
      if (!temp && !water && !dose) return null;
      return { temp, water, dose, grind };
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

    // 비교 화면으로 이동
    sessionStorage.setItem('last_tasting', JSON.stringify(record));
    sessionStorage.setItem('tasting_coffee', JSON.stringify(coffee));
    location.href = 'compare.html?coffeeId=' + (idx >= 0 ? idx : '');
  });
})();
