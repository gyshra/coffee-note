/**
 * Coffee Note — SCA Flavor Wheel v3
 * Accurate SCA colors + smooth spring animations
 * Stage 1: 대분류(inner) + 중분류(outer) full wheel, rotatable
 * Stage 2: tap subcategory → detail items redraw with smooth crossfade
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var SCA = (global.CoffeeNote && global.CoffeeNote.SCA_WHEEL) || [];

  /* ── SCA 원본 기준 카테고리 색상 ── */
  var CAT_COLORS = {
    Fruity:             "#E83D51",
    Floral:             "#E75480",
    Sweet:              "#F19A38",
    "Nutty/Cocoa":      "#8B6A3E",
    Spices:             "#A0522D",
    Roasted:            "#7B5B3A",
    "Green/Vegetative": "#5A9E6F",
    "Sour/Fermented":   "#E8A836",
    Other:              "#7BAFB0",
  };

  /* ── SCA 원본 기준 중분류 색상 (더 정확한 그라데이션) ── */
  var SUB_COLORS = {
    Berry:      "#C44070", "Dried Fruit": "#BD4558", "Stone fruit": "#E86B5A",
    "Other fruit": "#D95F5F", Citrus: "#F18D4F",
    Floral:     "#E75480", Herbal: "#DA8CAB",
    Sweet:      "#F19A38", 
    Nutty:      "#A67C52", Cocoa: "#6B4226",
    Spices:     "#A0522D",
    Roasted:    "#7B5B3A",
    Green:      "#5A9E6F", Vegetative: "#6B8E5A",
    Sour:       "#E8C836", Fermented: "#D4A020",
    Other:      "#7BAFB0",
  };

  var CX = 200, CY = 200;
  var R_CENTER = 38;
  var R1_IN = 40, R1_OUT = 95;     // 대분류 (inner ring)
  var R2_IN = 98, R2_OUT = 194;    // 중분류 (outer ring)
  var EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // iOS spring-like
  var FADE_MS = 280;

  var state = {
    rotation: 0, velocity: 0, dragging: false,
    startAngle: 0, lastAngle: 0, lastTime: 0,
    zoomed: false,
    selectedFlavors: [],
    onSelectionChange: null,
    rafId: 0, tapStart: null, moved: false,
  };

  var svgEl, stage1Group, stage2Group, backBtn, viewport;
  var wheelLayout = null;

  /* ── SVG Helpers ── */
  function arc(cx, cy, rIn, rOut, sa, ea) {
    var gap = 0.005; sa += gap; ea -= gap;
    if (ea <= sa) ea = sa + 0.002;
    var c1 = Math.cos(sa), s1 = Math.sin(sa), c2 = Math.cos(ea), s2 = Math.sin(ea);
    var lg = ea - sa > Math.PI ? 1 : 0;
    return "M"+(cx+rOut*c1)+","+(cy+rOut*s1)+" A"+rOut+","+rOut+" 0 "+lg+" 1 "+(cx+rOut*c2)+","+(cy+rOut*s2)+
      " L"+(cx+rIn*c2)+","+(cy+rIn*s2)+" A"+rIn+","+rIn+" 0 "+lg+" 0 "+(cx+rIn*c1)+","+(cy+rIn*s1)+" Z";
  }

  function mid(sa, ea) { return (sa + ea) / 2; }
  function pol(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

  function mkEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function mkPath(d, fill, extra) {
    var a = { d: d, fill: fill, stroke: "rgba(255,255,255,0.25)", "stroke-width": "0.5" };
    if (extra) for (var k in extra) a[k] = extra[k];
    return mkEl("path", a);
  }

  function mkText(x, y, txt, size, weight, fill, angleDeg) {
    var t = mkEl("text", {
      x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central",
      "font-size": size, "font-weight": weight, fill: fill,
      "font-family": "'Pretendard Variable',sans-serif", "pointer-events": "none",
    });
    var rot = angleDeg || 0;
    if (rot > 90 && rot < 270) rot += 180;
    if (angleDeg !== undefined) t.setAttribute("transform", "rotate("+rot+","+x+","+y+")");
    t.textContent = txt;
    return t;
  }

  /* ── Layout: SCA 원본처럼 카테고리별 비중 반영 ── */
  function computeLayout() {
    // 각 카테고리의 서브 수에 비례한 각도 배분
    var totalSubs = 0;
    SCA.forEach(function (c) { totalSubs += c.subs.length; });
    var perSub = (Math.PI * 2) / totalSubs;
    var layout = [], cursor = -Math.PI / 2;

    SCA.forEach(function (cat, ci) {
      var catStart = cursor;
      var catColor = CAT_COLORS[cat.category] || "#999";
      var subs = [];
      cat.subs.forEach(function (sub, si) {
        var subStart = cursor;
        var subEnd = cursor + perSub;
        var subColor = SUB_COLORS[sub.name] || catColor;
        subs.push({
          name: sub.nameKo, nameEn: sub.name,
          startAngle: subStart, endAngle: subEnd,
          items: sub.items, catIdx: ci, subIdx: si,
          color: subColor,
        });
        cursor = subEnd;
      });
      layout.push({
        category: cat.category, categoryKo: cat.categoryKo,
        color: catColor, startAngle: catStart, endAngle: cursor,
        subs: subs, catIdx: ci,
      });
    });
    return layout;
  }

  /* ══════════════════════════════════════
     Stage 1: Full wheel (대분류 + 중분류)
     ══════════════════════════════════════ */
  function renderStage1() {
    if (!wheelLayout) wheelLayout = computeLayout();
    stage1Group.innerHTML = "";

    // 중앙 원
    stage1Group.appendChild(mkEl("circle", {
      cx: CX, cy: CY, r: R_CENTER,
      fill: "#FFFFFF", stroke: "#E0E0E0", "stroke-width": "0.5"
    }));
    stage1Group.appendChild(mkText(CX, CY - 4, "FLAVOR", 7, 600, "#999"));
    stage1Group.appendChild(mkText(CX, CY + 6, "WHEEL", 7, 600, "#999"));

    wheelLayout.forEach(function (cat) {
      // 대분류 arc
      var catPath = mkPath(arc(CX, CY, R1_IN, R1_OUT, cat.startAngle, cat.endAngle), cat.color);
      stage1Group.appendChild(catPath);

      // 대분류 텍스트
      var cMid = mid(cat.startAngle, cat.endAngle);
      var cR = (R1_IN + R1_OUT) / 2;
      var cp = pol(CX, CY, cR, cMid);
      var cDeg = cMid * 180 / Math.PI;
      stage1Group.appendChild(mkText(cp[0], cp[1], cat.categoryKo, 10, 600, "#fff", cDeg));

      // 중분류 arcs
      cat.subs.forEach(function (sub) {
        var subPath = mkPath(
          arc(CX, CY, R2_IN, R2_OUT, sub.startAngle, sub.endAngle),
          sub.color,
          { cursor: "pointer", opacity: "0.85" }
        );
        // hover 효과
        subPath.addEventListener("mouseenter", function() { subPath.setAttribute("opacity", "1"); });
        subPath.addEventListener("mouseleave", function() { subPath.setAttribute("opacity", "0.85"); });
        subPath.addEventListener("click", function () { openDetail(sub.catIdx, sub.subIdx); });
        stage1Group.appendChild(subPath);

        // 중분류 텍스트
        var sMid = mid(sub.startAngle, sub.endAngle);
        var sR = (R2_IN + R2_OUT) / 2;
        var sp = pol(CX, CY, sR, sMid);
        var sDeg = sMid * 180 / Math.PI;
        var st = mkText(sp[0], sp[1], sub.name, 9, 500, "rgba(255,255,255,0.9)", sDeg);
        stage1Group.appendChild(st);
      });
    });
  }

  /* ══════════════════════════════════════
     Stage 2: Detail items (소분류)
     ══════════════════════════════════════ */
  function openDetail(catIdx, subIdx) {
    if (state.zoomed || state.moved) return;

    var cat = wheelLayout[catIdx];
    var sub = cat.subs[subIdx];
    state.zoomed = true;

    // Stage 1 fade out
    stage1Group.style.transition = "opacity "+FADE_MS+"ms "+EASE;
    stage1Group.style.opacity = "0";
    stage1Group.style.pointerEvents = "none";

    setTimeout(function () {
      renderDetail(cat, sub);
      backBtn.style.opacity = "1";
      backBtn.style.pointerEvents = "auto";
    }, FADE_MS * 0.4);
  }

  function renderDetail(cat, sub) {
    if (stage2Group) stage2Group.remove();
    stage2Group = mkEl("g", { class: "wheel-detail" });
    stage2Group.style.opacity = "0";
    stage2Group.style.transition = "opacity "+FADE_MS+"ms "+EASE;
    svgEl.appendChild(stage2Group);

    var items = sub.items;
    var n = items.length;
    var perItem = (Math.PI * 2) / Math.max(n, 1);
    var R_IN = 52, R_OUT = 192;

    // 중앙 라벨 원
    stage2Group.appendChild(mkEl("circle", {
      cx: CX, cy: CY, r: 48,
      fill: "#FFFFFF", stroke: sub.color, "stroke-width": "2", cursor: "pointer"
    }));
    stage2Group.querySelector("circle").addEventListener("click", closeDetail);
    stage2Group.appendChild(mkText(CX, CY - 6, cat.categoryKo, 11, 600, sub.color));
    stage2Group.appendChild(mkText(CX, CY + 8, sub.name, 9, 400, "#999"));

    // 소분류 아이템들
    items.forEach(function (item, i) {
      var sa = -Math.PI / 2 + perItem * i;
      var ea = -Math.PI / 2 + perItem * (i + 1);
      var isSel = isSelected(item.en);
      var itemColor = item.color || sub.color;

      var ip = mkPath(arc(CX, CY, R_IN, R_OUT, sa, ea), itemColor, {
        cursor: "pointer", opacity: isSel ? "1" : "0.75",
        "stroke-width": isSel ? "2" : "0.5",
        stroke: isSel ? "#fff" : "rgba(255,255,255,0.3)",
      });
      ip.addEventListener("mouseenter", function() { ip.setAttribute("opacity", "1"); });
      ip.addEventListener("mouseleave", function() { ip.setAttribute("opacity", isSel ? "1" : "0.75"); });
      ip.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleFlavor(item, cat, sub);
        // 부드러운 리프레시
        refreshDetailItem(stage2Group, items, cat, sub);
      });
      stage2Group.appendChild(ip);

      // 텍스트
      var iMid = mid(sa, ea);
      var iR = (R_IN + R_OUT) / 2;
      var tp = pol(CX, CY, iR, iMid);
      var tDeg = iMid * 180 / Math.PI;
      stage2Group.appendChild(mkText(tp[0], tp[1], item.ko, 12, 600, "#fff", tDeg));

      // 선택 체크
      if (isSel) {
        var chkP = pol(CX, CY, R_OUT - 14, iMid);
        var chk = mkText(chkP[0], chkP[1], "✓", 10, 700, "#fff");
        chk.removeAttribute("transform");
        stage2Group.appendChild(chk);
      }
    });

    // fade in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        stage2Group.style.opacity = "1";
      });
    });
  }

  function refreshDetailItem(group, items, cat, sub) {
    // 소분류를 다시 그리되, 부드럽게
    var paths = group.querySelectorAll("path");
    paths.forEach(function (p, i) {
      if (i >= items.length) return;
      var isSel = isSelected(items[i].en);
      p.style.transition = "opacity 0.15s ease, stroke-width 0.15s ease";
      p.setAttribute("opacity", isSel ? "1" : "0.75");
      p.setAttribute("stroke-width", isSel ? "2" : "0.5");
      p.setAttribute("stroke", isSel ? "#fff" : "rgba(255,255,255,0.3)");
    });
    // 체크마크 업데이트 — 리드로우
    var oldChecks = group.querySelectorAll("text");
    oldChecks.forEach(function(t) { if (t.textContent === "✓") t.remove(); });
    var n = items.length;
    var perItem = (Math.PI * 2) / Math.max(n, 1);
    items.forEach(function (item, i) {
      if (isSelected(item.en)) {
        var sa = -Math.PI / 2 + perItem * i;
        var ea = -Math.PI / 2 + perItem * (i + 1);
        var iMid = mid(sa, ea);
        var chkP = pol(CX, CY, 192 - 14, iMid);
        var chk = mkText(chkP[0], chkP[1], "✓", 10, 700, "#fff");
        chk.removeAttribute("transform");
        group.appendChild(chk);
      }
    });
    renderTags();
    if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors);
  }

  /* ── Close detail ── */
  function closeDetail() {
    if (!state.zoomed) return;

    if (stage2Group) {
      stage2Group.style.transition = "opacity "+FADE_MS+"ms "+EASE;
      stage2Group.style.opacity = "0";
      setTimeout(function () {
        if (stage2Group) { stage2Group.remove(); stage2Group = null; }
      }, FADE_MS);
    }
    backBtn.style.opacity = "0";
    backBtn.style.pointerEvents = "none";

    setTimeout(function () {
      stage1Group.style.transition = "opacity "+FADE_MS+"ms "+EASE;
      stage1Group.style.opacity = "1";
      stage1Group.style.pointerEvents = "";
    }, FADE_MS * 0.3);

    setTimeout(function () { state.zoomed = false; }, FADE_MS + 50);
  }

  /* ── Flavor selection ── */
  function isSelected(en) {
    return state.selectedFlavors.some(function (f) { return f.en === en; });
  }

  function toggleFlavor(item, cat, sub) {
    var idx = -1;
    state.selectedFlavors.forEach(function (f, i) { if (f.en === item.en) idx = i; });
    if (idx >= 0) {
      state.selectedFlavors.splice(idx, 1);
    } else {
      if (state.selectedFlavors.length >= 8) {
        if (global.CoffeeNote) global.CoffeeNote.showToast("최대 8개까지 선택 가능합니다");
        return;
      }
      state.selectedFlavors.push({
        en: item.en, ko: item.ko,
        category: cat.category, sub: sub.nameEn,
        color: item.color || sub.color || cat.color,
      });
    }
  }

  function removeFlavorByEn(en) {
    state.selectedFlavors = state.selectedFlavors.filter(function (f) { return f.en !== en; });
    renderTags();
    if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors);
  }

  /* ── Tags ── */
  function renderTags() {
    var container = document.getElementById("selectedFlavors");
    if (!container) return;
    if (!state.selectedFlavors.length) {
      container.innerHTML = '<p class="empty-flavors">휠에서 향미를 탭하여 선택하세요</p>';
      return;
    }
    container.innerHTML = state.selectedFlavors.map(function (f) {
      return '<div class="flavor-tag" data-en="'+f.en+'">'+
        '<span class="flavor-color" style="background:'+f.color+'"></span>'+f.ko+
        '<button class="flavor-remove" data-remove="'+f.en+'">&times;</button></div>';
    }).join("");
    container.querySelectorAll(".flavor-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeFlavorByEn(btn.getAttribute("data-remove"));
      });
    });
  }

  /* ── Rotation (Stage 1 only) ── */
  function getAngle(cx, cy) {
    var rect = svgEl.getBoundingClientRect();
    return Math.atan2(cy - rect.top - rect.height / 2, cx - rect.left - rect.width / 2) * (180 / Math.PI);
  }

  function onDown(e) {
    if (state.zoomed) return;
    var pt = e.touches ? e.touches[0] : e;
    state.dragging = true; state.moved = false;
    state.startAngle = getAngle(pt.clientX, pt.clientY) - state.rotation;
    state.lastAngle = getAngle(pt.clientX, pt.clientY);
    state.lastTime = Date.now();
    state.velocity = 0;
    state.tapStart = { x: pt.clientX, y: pt.clientY, time: Date.now() };
    cancelAnimationFrame(state.rafId);
  }

  function onMove(e) {
    if (!state.dragging || state.zoomed) return;
    e.preventDefault();
    var pt = e.touches ? e.touches[0] : e;
    var dx = pt.clientX - state.tapStart.x;
    var dy = pt.clientY - state.tapStart.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.moved = true;

    var angle = getAngle(pt.clientX, pt.clientY);
    var now = Date.now();
    state.velocity = (angle - state.lastAngle) / Math.max(1, now - state.lastTime) * 16;
    state.lastAngle = angle;
    state.lastTime = now;
    state.rotation = angle - state.startAngle;
    stage1Group.setAttribute("transform", "rotate("+state.rotation+","+CX+","+CY+")");
  }

  function onUp(e) {
    if (!state.dragging) return;
    state.dragging = false;
    if (!state.moved) { state.tapStart = null; return; } // tap → let click handle
    state.tapStart = null;
    doInertia();
  }

  function doInertia() {
    if (Math.abs(state.velocity) < 0.08) { state.velocity = 0; return; }
    state.velocity *= 0.94; // smoother decel
    state.rotation += state.velocity;
    stage1Group.setAttribute("transform", "rotate("+state.rotation+","+CX+","+CY+")");
    state.rafId = requestAnimationFrame(doInertia);
  }

  /* ── Init ── */
  function init(options) {
    svgEl = document.getElementById(options.svgId || "wheelSvg");
    viewport = document.getElementById(options.viewportId || "wheelViewport");
    if (!svgEl || !viewport) return;

    svgEl.setAttribute("viewBox", "0 0 400 400");

    stage1Group = mkEl("g", { class: "wheel-stage1" });
    svgEl.appendChild(stage1Group);

    // Back button
    backBtn = document.createElement("button");
    backBtn.className = "wheel-back-btn";
    backBtn.type = "button";
    backBtn.style.cssText = "opacity:0;pointer-events:none;transition:opacity 0.2s ease";
    backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
    backBtn.addEventListener("click", closeDetail);
    viewport.appendChild(backBtn);

    wheelLayout = computeLayout();
    renderStage1();

    // Events
    viewport.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    viewport.addEventListener("touchstart", onDown, { passive: false });
    viewport.addEventListener("touchmove", onMove, { passive: false });
    viewport.addEventListener("touchend", onUp);

    state.onSelectionChange = options.onSelectionChange || null;
    renderTags();
  }

  global.CoffeeWheel = {
    init: init,
    getSelectedFlavors: function () { return state.selectedFlavors.slice(); },
    setSelectedFlavors: function (arr) { state.selectedFlavors = (arr || []).slice(); renderTags(); },
    zoomOut: closeDetail,
  };
})(typeof window !== "undefined" ? window : globalThis);
