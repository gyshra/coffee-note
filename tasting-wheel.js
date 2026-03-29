/**
 * Coffee Note — SCA Flavor Wheel v4 (Semicircle Bottom)
 * 목업 기준: 화면 하단 반원형 회전 휠
 * - 중심점이 뷰포트 바닥에 위치 → 상반원만 노출
 * - 좌우 스와이프로 카테고리 회전, 스냅 애니메이션
 * - 상단 정보 영역에 카테고리명 + 중분류 탭 + 아이템 칩 표시
 */
(function (global) {
  "use strict";

  var CAT_COLORS = {
    "Fruity":             "#E83D51",
    "Floral":             "#E75480",
    "Sweet":              "#F19A38",
    "Nutty/Cocoa":        "#8B6A3E",
    "Spices":             "#A0522D",
    "Roasted":            "#7B5B3A",
    "Green/Vegetative":   "#5A9E6F",
    "Sour/Fermented":     "#E8A836",
    "Other":              "#7BAFB0",
  };

  var NS = "http://www.w3.org/2000/svg";
  var SCA = [];
  var W = 440, H = 200, CX = 220, CY = 200, R_IN = 82, R_OUT = 188;
  var N = 9, SEG = (Math.PI * 2) / 9;

  var state = {
    rotation: 0,
    dragging: false,
    startX: 0, startRot: 0,
    lastX: 0, lastT: 0,
    velocity: 0,
    activeCat: 0, activeSub: 0,
    selectedFlavors: [],
    onSelectionChange: null,
    rafId: 0,
    _svg: null, _vp: null,
    _tapX: 0, _tapT: 0,
  };

  /* ════════════════════ INIT ════════════════════ */
  function init(opts) {
    SCA = (global.CoffeeNote && global.CoffeeNote.SCA_WHEEL) || [];
    N = SCA.length || 9;
    SEG = (Math.PI * 2) / N;

    state.selectedFlavors = [];
    state.activeCat = 0;
    state.activeSub = 0;
    state.rotation  = 0;
    state.onSelectionChange = opts.onSelectionChange || null;

    var svg = document.getElementById(opts.svgId);
    var vp  = document.getElementById(opts.viewportId);
    if (!svg || !vp) return;
    state._svg = svg;
    state._vp  = vp;

    setupViewport(vp, svg);
    injectInfoArea(vp, svg);
    buildSvg(vp, svg);
    bindEvents(svg);
    snapTo(0, false);
  }

  /* ════════════════════ VIEWPORT ════════════════════ */
  function setupViewport(vp, svg) {
    vp.style.cssText = [
      "position:relative",
      "overflow:hidden",
      "touch-action:none",
      "user-select:none",
      "-webkit-user-select:none",
      "background:#fff",
    ].join(";");
    svg.style.cssText = [
      "position:absolute",
      "bottom:0",
      "left:0",
      "display:block",
      "touch-action:none",
    ].join(";");
  }

  /* ════════════════════ INFO AREA ════════════════════ */
  var INFO_H = 172;

  function injectInfoArea(vp, svg) {
    var old = document.getElementById("wInfoArea");
    if (old) old.remove();
    var ia = document.createElement("div");
    ia.id = "wInfoArea";
    ia.style.cssText = [
      "position:absolute",
      "top:0","left:0","right:0",
      "height:" + INFO_H + "px",
      "padding:14px 20px 8px",
      "z-index:3",
      "pointer-events:none",
      "background:#fff",
      "display:flex",
      "flex-direction:column",
    ].join(";");
    ia.innerHTML =
      '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">' +
        '<span id="wCatEn" style="font-size:9px;font-weight:700;letter-spacing:2px;transition:color .2s;color:#888"></span>' +
        '<span id="wCatKo" style="font-size:20px;font-weight:800;letter-spacing:-.5px;transition:color .2s;color:#121212">카테고리 선택 →</span>' +
      '</div>' +
      '<div id="wSubTabs" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px;pointer-events:auto;flex-shrink:0"></div>' +
      '<div id="wItems"   style="display:flex;flex-wrap:wrap;gap:5px;pointer-events:auto;overflow-y:auto;flex:1"></div>';
    vp.insertBefore(ia, svg);
  }

  /* ════════════════════ SVG BUILD ════════════════════ */
  function buildSvg(vp, svg) {
    W  = Math.max(vp.offsetWidth || 400, 300);
    H  = Math.round(W * 0.44);
    CX = W / 2;
    CY = H;
    R_IN  = Math.round(W * 0.18);
    R_OUT = Math.round(W * 0.41);

    vp.style.height = (INFO_H + H) + "px";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width",   W + "");
    svg.setAttribute("height",  H + "");
    drawWheel();
  }

  /* ════════════════════ DRAW ════════════════════ */
  function angleOf(i) {
    return -Math.PI / 2 + i * SEG + state.rotation;
  }

  function drawWheel() {
    var svg = state._svg;
    if (!svg) return;
    svg.innerHTML = "";

    app(svg, mkEl("rect", { x:0,y:0,width:W,height:H,fill:"#fff" }));

    for (var i = 0; i < N; i++) {
      var cat  = SCA[i];
      if (!cat) continue;
      var col  = CAT_COLORS[cat.category] || "#888";
      var midA = angleOf(i);

      /* 하반원 세그먼트 건너뜀 */
      var midY = CY + (R_IN + R_OUT) / 2 * Math.sin(midA);
      if (midY > H + 20) continue;

      var isAct = (i === state.activeCat);
      var dist  = normA(midA - (-Math.PI / 2));
      var opa   = isAct ? 1 : Math.max(0.38, 1 - dist / (Math.PI * 0.88));
      var rO    = isAct ? R_OUT + 13 : R_OUT;

      var sa = midA - SEG / 2 + 0.018;
      var ea = midA + SEG / 2 - 0.018;

      var path = mkEl("path", {
        d: arcD(CX, CY, R_IN, rO, sa, ea),
        fill: col,
        opacity: opa.toFixed(2),
        stroke: "rgba(255,255,255,.65)",
        "stroke-width": "1.5",
        "data-ci": i,
        style: "cursor:pointer",
      });
      app(svg, path);

      /* 텍스트 */
      if (midY < H - 4) {
        var tr  = (R_IN + rO) / 2 + (isAct ? 4 : 0);
        var tx  = CX + tr * Math.cos(midA);
        var ty  = CY + tr * Math.sin(midA);
        var deg = midA * 180 / Math.PI + 90;
        if (deg > 90 && deg < 270) deg += 180;
        var tEl = mkEl("text", {
          x: tx, y: ty,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size":   isAct ? "13" : "10",
          "font-weight": isAct ? "800" : "600",
          fill: "#fff",
          "font-family": "'Pretendard Variable',sans-serif",
          "pointer-events": "none",
          transform: "rotate(" + deg + "," + tx + "," + ty + ")",
        });
        tEl.textContent = cat.categoryKo || cat.category;
        app(svg, tEl);
      }
    }

    /* 중앙 흰 원 */
    app(svg, mkEl("circle", { cx:CX,cy:CY,r:R_IN-1,fill:"#fff","pointer-events":"none" }));

    /* 포인터 삼각형 */
    var px = CX;
    app(svg, mkEl("polygon", {
      points: (px-5)+",10 "+px+",2 "+(px+5)+",10",
      fill: "#121212",
      "pointer-events": "none",
    }));

    /* 스와이프 힌트 */
    app(svg, swipeHint(true));
    app(svg, swipeHint(false));
  }

  function swipeHint(isLeft) {
    var x = isLeft ? CX - R_OUT - 16 : CX + R_OUT + 16;
    var y = Math.round(H * 0.55);
    var d = isLeft
      ? "M"+(x+7)+","+(y-5)+" L"+x+","+y+" L"+(x+7)+","+(y+5)
      : "M"+(x-7)+","+(y-5)+" L"+x+","+y+" L"+(x-7)+","+(y+5);
    return mkEl("path", {
      d: d, fill:"none", stroke:"rgba(18,18,18,.15)",
      "stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",
      "pointer-events":"none",
    });
  }

  function arcD(cx, cy, ri, ro, sa, ea) {
    if (ea - sa > Math.PI * 2 - 0.01) ea = sa + Math.PI * 2 - 0.02;
    var lg = ea - sa > Math.PI ? 1 : 0;
    var c1=Math.cos(sa),s1=Math.sin(sa),c2=Math.cos(ea),s2=Math.sin(ea);
    return ["M",cx+ro*c1,cy+ro*s1,"A",ro,ro,0,lg,1,cx+ro*c2,cy+ro*s2,
            "L",cx+ri*c2,cy+ri*s2,"A",ri,ri,0,lg,0,cx+ri*c1,cy+ri*s1,"Z"].join(" ");
  }

  function normA(a) {
    while (a >  Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a);
  }

  /* ════════════════════ INFO UPDATE ════════════════════ */
  function updateInfo() {
    var cat = SCA[state.activeCat];
    if (!cat) return;
    var col = CAT_COLORS[cat.category] || "#888";

    var enEl = document.getElementById("wCatEn");
    var koEl = document.getElementById("wCatKo");
    if (enEl) { enEl.textContent = cat.category.toUpperCase(); enEl.style.color = col; }
    if (koEl) { koEl.textContent = cat.categoryKo || cat.category; koEl.style.color = col; }

    var stEl = document.getElementById("wSubTabs");
    if (stEl) {
      stEl.innerHTML = (cat.subs || []).map(function (sub, si) {
        var act = si === state.activeSub;
        return '<button style="padding:5px 11px;font-size:10px;font-weight:700;letter-spacing:.3px;' +
          'background:' + (act ? col : 'transparent') + ';color:' + (act ? '#fff' : col) + ';' +
          'border:1px solid ' + col + ';cursor:pointer;font-family:inherit;" data-si="' + si + '">' +
          esc(sub.nameKo || sub.name) + '</button>';
      }).join("");
      stEl.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.activeSub = parseInt(btn.getAttribute("data-si"));
          updateInfo();
        });
      });
    }
    renderItems(cat, col);
  }

  function renderItems(cat, col) {
    var el  = document.getElementById("wItems");
    if (!el) return;
    var sub = (cat.subs || [])[state.activeSub] || (cat.subs || [])[0];
    if (!sub) { el.innerHTML = ""; return; }
    el.innerHTML = (sub.items || []).map(function (item) {
      var sel = state.selectedFlavors.some(function (f) { return f.en === item.en; });
      return '<button style="padding:5px 12px;font-size:12px;font-weight:' + (sel?700:500) + ';' +
        'background:' + (sel ? item.color : '#fff') + ';' +
        'color:' + (sel ? '#fff' : '#121212') + ';' +
        'border:1px solid ' + (sel ? item.color : '#E0E0E0') + ';' +
        'cursor:pointer;font-family:inherit;transition:all .15s;" data-en="' + esc(item.en) + '">' +
        esc(item.ko) + '</button>';
    }).join("");
    el.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var en = btn.getAttribute("data-en");
        var item = (sub.items || []).find(function (x) { return x.en === en; });
        if (item) toggleFlavor(item, cat, sub);
      });
    });
  }

  function toggleFlavor(item, cat, sub) {
    var idx = state.selectedFlavors.findIndex(function (f) { return f.en === item.en; });
    if (idx >= 0) state.selectedFlavors.splice(idx, 1);
    else state.selectedFlavors.push({ en:item.en, ko:item.ko, category:cat.category, sub:sub.name, color:item.color });
    renderItems(cat, CAT_COLORS[cat.category] || "#888");
    if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors.slice());
  }

  /* ════════════════════ DRAG / SNAP ════════════════════ */
  function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

  function bindEvents(svg) {
    var down = function (e) {
      state.dragging  = true;
      state.startX    = getX(e);
      state.startRot  = state.rotation;
      state.lastX     = state.startX;
      state.lastT     = e.timeStamp || Date.now();
      state._tapX     = state.startX;
      state._tapT     = Date.now();
      cancelAnimationFrame(state.rafId);
      e.preventDefault();
    };
    svg.addEventListener("mousedown",  down);
    svg.addEventListener("touchstart", down, { passive: false });

    var move = function (e) {
      if (!state.dragging) return;
      var cx  = getX(e);
      var dx  = cx - state.startX;
      state.rotation  = state.startRot - (dx / (W * 0.62)) * (Math.PI * 2);
      var raw = Math.round(-state.rotation / SEG);
      state.activeCat = ((raw % N) + N) % N;
      drawWheel();
      state.velocity  = (cx - state.lastX) / (((e.timeStamp || Date.now()) - state.lastT) || 16);
      state.lastX = cx;
      state.lastT = e.timeStamp || Date.now();
      if (e.preventDefault) e.preventDefault();
    };
    window.addEventListener("mousemove",  move);
    window.addEventListener("touchmove",  move, { passive: false });

    var up = function (e) {
      if (!state.dragging) return;
      state.dragging = false;
      var upX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      var upY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      if (Math.abs(upX - state._tapX) < 7 && Date.now() - state._tapT < 240) {
        handleTap(upX, upY);
        return;
      }
      var raw = Math.round(-state.rotation / SEG);
      snapTo(raw, true);
    };
    window.addEventListener("mouseup",  up);
    window.addEventListener("touchend", up);
  }

  function handleTap(cx, cy) {
    var rect = state._svg.getBoundingClientRect();
    var sx = (cx - rect.left) * (W / rect.width);
    var sy = (cy - rect.top)  * (H / rect.height);
    var dx = sx - CX, dy = sy - CY;
    if (Math.sqrt(dx*dx+dy*dy) < R_IN) return;
    var a = Math.atan2(dy, dx);
    for (var i = 0; i < N; i++) {
      if (normA(a - angleOf(i)) < SEG / 2) { snapTo(i, true); return; }
    }
  }

  function snapTo(idx, anim) {
    state.activeCat = ((idx % N) + N) % N;
    state.activeSub = 0;
    var target = -state.activeCat * SEG;
    anim ? animTo(target) : (state.rotation = target, drawWheel());
    updateInfo();
  }

  function animTo(target) {
    var from = state.rotation;
    var diff = target - from;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var t0 = performance.now(), dur = 300;
    function step(now) {
      var t = Math.min((now-t0)/dur, 1);
      state.rotation = from + diff * (1 - Math.pow(1-t, 3));
      drawWheel();
      if (t < 1) state.rafId = requestAnimationFrame(step);
    }
    cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(step);
  }

  /* ════════════════════ HELPERS ════════════════════ */
  function mkEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function app(p, c) { p.appendChild(c); return c; }
  function esc(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  /* ════════════════════ PUBLIC API ════════════════════ */
  global.CoffeeWheel = {
    init: init,
    getSelectedFlavors: function () { return state.selectedFlavors.slice(); },
    setSelectedFlavors: function (list) {
      state.selectedFlavors = (list||[]).map(function(f){return Object.assign({},f);});
      updateInfo();
      if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors.slice());
    },
  };

})(window);
